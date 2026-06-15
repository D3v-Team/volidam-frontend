import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiLids } from "../Services/api/Lids";
import { apiLidStatuses } from "../Services/api/LidStatuses";
import { unwrapEntity } from "../utils/api/parsePagination";
import {
    buildLeadsBoardFilterSig,
    LEADS_KANBAN_SCROLL_RESTORE_MAX_PAGES,
    leadsBoardScrollSessionKey,
    readLeadsBoardScrollSession,
} from "../components/leads/leadsBoardScrollSession";
import {
    mergeLidsGrouped,
    normalizeLidFromApi,
    parseLidsBoardResponse,
    parseStatusesResponse,
} from "../utils/lidBoard";

const PAGE_SIZE = 20;

export function useLeadsBoard({
    statusFilter = "",
    search = "",
    assignedId = "",
    role = "",
    roleScope = "default",
} = {}) {
    const sessionKey = leadsBoardScrollSessionKey(roleScope);
    const filterSig = buildLeadsBoardFilterSig({
        statusFilter,
        search,
        assignedId,
        role,
    });

    const [statuses, setStatuses] = useState([]);
    const [lidsByStatus, setLidsByStatus] = useState({});
    const [counts, setCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [moving, setMoving] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sessionHydrated, setSessionHydrated] = useState(false);
    const [restoringPages, setRestoringPages] = useState(false);

    const fetchLock = useRef(0);
    const statusesRef = useRef([]);
    const loadingMoreRef = useRef(false);
    const stateRef = useRef({ loading: true, loadingMore: false, hasMore: false });
    const pageRef = useRef(1);
    const skipPageEffectFetchRef = useRef(false);
    const restoreInProgressRef = useRef(false);
    const restoredSigRef = useRef("");

    useEffect(() => {
        pageRef.current = page;
    }, [page]);

    useEffect(() => {
        statusesRef.current = statuses;
    }, [statuses]);

    useEffect(() => {
        loadingMoreRef.current = loadingMore;
    }, [loadingMore]);

    const loadPage = useCallback(
        async ({ pageNumber, append, silent = false }) => {
            const fetchId = ++fetchLock.current;
            if (append && !silent) setLoadingMore(true);
            else if (!append) setLoading(true);

            try {
                const lidsParams = {
                    page: pageNumber,
                    limit: PAGE_SIZE,
                };
                if (statusFilter) lidsParams.status_id = statusFilter;
                if (assignedId) lidsParams.assigned_id = assignedId;
                if (role) lidsParams.role = role;
                if (search?.trim()) lidsParams.searchTerm = search.trim();

                const [statusRes, lidsRes] =
                    pageNumber === 1
                        ? await Promise.all([
                              apiLidStatuses.getAll(),
                              apiLids.getList(lidsParams),
                          ])
                        : [null, await apiLids.getList(lidsParams)];

                if (fetchId !== fetchLock.current) return;

                let statusList = statusesRef.current;
                if (pageNumber === 1 && statusRes) {
                    statusList = parseStatusesResponse(statusRes);
                    statusesRef.current = statusList;
                    setStatuses(statusList);
                }

                const { grouped, counts: countMap, pagination } = parseLidsBoardResponse(
                    lidsRes,
                    statusList,
                    search,
                    PAGE_SIZE
                );

                let calculatedTotalPages = Math.max(1, Number(pagination?.totalPages) || 1);
                const maxColCount = Math.max(
                    ...Object.values(grouped).map((arr) => arr?.length ?? 0),
                    0
                );
                if (maxColCount >= PAGE_SIZE && calculatedTotalPages <= pageNumber) {
                    calculatedTotalPages = pageNumber + 1;
                }

                if (append) {
                    const incomingCount = Object.values(grouped).reduce(
                        (sum, items) => sum + (items?.length ?? 0),
                        0
                    );
                    if (incomingCount === 0) {
                        setTotalPages(pageNumber);
                    } else {
                        setTotalPages(calculatedTotalPages);
                    }
                } else {
                    setTotalPages(calculatedTotalPages);
                }

                setCounts((prev) => (append ? { ...prev, ...countMap } : countMap));
                setLidsByStatus((prev) =>
                    append ? mergeLidsGrouped(prev, grouped, statusList) : grouped
                );
            } catch (error) {
                console.error(`Failed to load page ${pageNumber}:`, error);
                if (fetchId !== fetchLock.current) return;
                if (!append) {
                    setStatuses([]);
                    setLidsByStatus({});
                    setCounts({});
                    setTotalPages(1);
                }
                throw error;
            } finally {
                if (fetchId === fetchLock.current) {
                    setLoading(false);
                    setLoadingMore(false);
                }
            }
        },
        [search, statusFilter, assignedId, role]
    );

    // Filtr o'zgarganda page 1 dan boshlash
    useEffect(() => {
        const saved = readLeadsBoardScrollSession(sessionKey);
        const willRestorePages =
            saved &&
            String(saved.filterSig ?? "") === filterSig &&
            Math.floor(Number(saved.maxLoadedPage) || 1) > 1;

        setPage(1);
        pageRef.current = 1;
        setSessionHydrated(false);
        setRestoringPages(willRestorePages);
        restoredSigRef.current = "";
        skipPageEffectFetchRef.current = false;
        restoreInProgressRef.current = false;
        loadPage({ pageNumber: 1, append: false });
    }, [search, statusFilter, assignedId, loadPage, role, filterSig, sessionKey]);

    // Sessiondan sahifalarni tiklash (detaildan qaytganda)
    useEffect(() => {
        if (loading) return;
        if (statuses.length === 0) {
            setSessionHydrated(true);
            return;
        }
        if (restoredSigRef.current === filterSig) {
            setSessionHydrated(true);
            return;
        }

        const saved = readLeadsBoardScrollSession(sessionKey);
        if (!saved || String(saved.filterSig ?? "") !== filterSig) {
            restoredSigRef.current = filterSig;
            setSessionHydrated(true);
            return;
        }

        const savedMax = Math.max(
            1,
            Math.min(
                LEADS_KANBAN_SCROLL_RESTORE_MAX_PAGES,
                Math.floor(Number(saved.maxLoadedPage) || 1)
            )
        );

        if (savedMax <= 1) {
            restoredSigRef.current = filterSig;
            setSessionHydrated(true);
            return;
        }

        let cancelled = false;
        restoreInProgressRef.current = true;
        setRestoringPages(true);
        setSessionHydrated(false);

        (async () => {
            try {
                for (let p = 2; p <= savedMax; p++) {
                    if (cancelled) return;
                    await loadPage({ pageNumber: p, append: true, silent: true });
                }
                if (cancelled) return;
                skipPageEffectFetchRef.current = true;
                setPage(savedMax);
                pageRef.current = savedMax;
                restoredSigRef.current = filterSig;
                setSessionHydrated(true);
            } catch (e) {
                console.error("Failed to restore leads board pages:", e);
                restoredSigRef.current = filterSig;
                setSessionHydrated(true);
            } finally {
                restoreInProgressRef.current = false;
                setRestoringPages(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [loading, statuses.length, filterSig, sessionKey, loadPage]);

    // Scroll orqali keyingi sahifa
    useEffect(() => {
        if (page <= 1) return;
        if (skipPageEffectFetchRef.current) {
            skipPageEffectFetchRef.current = false;
            return;
        }
        if (restoreInProgressRef.current) return;
        if (!sessionHydrated) return;
        loadPage({ pageNumber: page, append: true });
    }, [page, loadPage, sessionHydrated]);

    const hasMoreByCounts = useMemo(() => {
        return statuses.some((s) => {
            const loaded = lidsByStatus[s.id]?.length ?? 0;
            const total = counts[s.id] ?? 0;
            return total > 0 && loaded < total;
        });
    }, [statuses, lidsByStatus, counts]);

    const hasMore = page < totalPages || hasMoreByCounts;

    useEffect(() => {
        stateRef.current = { loading, loadingMore, hasMore, page, totalPages };
    }, [loading, loadingMore, hasMore, page, totalPages]);

    const loadMore = useCallback(() => {
        const s = stateRef.current;
        if (s.loadingMore || s.loading || !s.hasMore) return;
        if (restoreInProgressRef.current) return;
        if (!sessionHydrated) return;
        setPage((p) => p + 1);
    }, [sessionHydrated]);

    const moveLid = async (lidId, fromStatusId, toStatusId) => {
        if (fromStatusId === toStatusId) return;

        const sourceItems = [...(lidsByStatus[fromStatusId] || [])];
        const lid = sourceItems.find((l) => l.id === lidId);
        if (!lid) return;

        setMoving(true);
        const prev = lidsByStatus;
        const prevCounts = counts;

        const optimistic = { ...lidsByStatus };
        optimistic[fromStatusId] = sourceItems.filter((l) => l.id !== lidId);
        optimistic[toStatusId] = [
            { ...lid, status_id: toStatusId, status: { ...lid.status, id: toStatusId } },
            ...(optimistic[toStatusId] || []),
        ];

        setLidsByStatus(optimistic);
        setCounts((c) => ({
            ...c,
            [fromStatusId]: Math.max(0, (c[fromStatusId] || 1) - 1),
            [toStatusId]: (c[toStatusId] || 0) + 1,
        }));

        try {
            await apiLids.updateStatus(lidId, toStatusId);
        } catch {
            setLidsByStatus(prev);
            setCounts(prevCounts);
            throw new Error("Status yangilanmadi");
        } finally {
            setMoving(false);
        }
    };

    const refreshBoard = async () => {
        restoredSigRef.current = "";
        setSessionHydrated(false);
        setPage(1);
        pageRef.current = 1;
        await loadPage({ pageNumber: 1, append: false });
    };

    const createLid = async (data) => {
        await apiLids.create(data);
        await refreshBoard();
    };

    const updateLid = async (id, data) => {
        await apiLids.update(id, data);
        await refreshBoard();
    };

    const deleteLid = async (id) => {
        await apiLids.delete(id);
        await refreshBoard();
    };

    const fetchLidById = async (id) => {
        const res = await apiLids.getById(id);
        const entity = unwrapEntity(res.data);
        return normalizeLidFromApi(entity);
    };

    const createStatus = async (data) => {
        await apiLidStatuses.create(data);
        await refreshBoard();
    };

    const updateStatus = async (id, data) => {
        await apiLidStatuses.update(id, data);
        await refreshBoard();
    };

    const deleteStatus = async (id) => {
        await apiLidStatuses.delete(id);
        await refreshBoard();
    };

    const totalLids = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0);

    const visibleStatuses = statusFilter
        ? statuses.filter((s) => s.id === statusFilter)
        : statuses;

    return {
        statuses: visibleStatuses,
        allStatuses: statuses,
        lidsByStatus,
        counts,
        refreshBoard,
        totalLids,
        loading,
        loadingMore,
        hasMore,
        page,
        loadMore,
        moving,
        moveLid,
        createLid,
        updateLid,
        deleteLid,
        fetchLidById,
        createStatus,
        updateStatus,
        deleteStatus,
        sessionHydrated,
        restoringPages,
        restoreInProgressRef,
        filterSig,
    };
};
