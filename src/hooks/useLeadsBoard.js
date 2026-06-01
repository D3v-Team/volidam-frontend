import { useCallback, useEffect, useRef, useState } from "react";
import { apiLids } from "../Services/api/Lids";
import { apiLidStatuses } from "../Services/api/LidStatuses";
import { unwrapEntity } from "../utils/api/parsePagination";
import {
    mergeLidsGrouped,
    normalizeLidFromApi,
    parseLidsBoardResponse,
    parseStatusesResponse,
} from "../utils/lidBoard";

export function useLeadsBoard({ statusFilter = "", search = "" , assignedId = "",  role = "", } = {}) {
    const [statuses, setStatuses] = useState([]);
    const [lidsByStatus, setLidsByStatus] = useState({});
    const [counts, setCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [moving, setMoving] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const fetchLock = useRef(0);
    const skipPageEffectRef = useRef(false);
    const statusesRef = useRef([]);

    useEffect(() => {
        statusesRef.current = statuses;
    }, [statuses]);

    const loadPage = useCallback(
        async ({ pageNumber, append }) => {
            const fetchId = ++fetchLock.current;
            if (append) setLoadingMore(true);
            else setLoading(true);

            try {
                const lidsParams = { page: pageNumber };
                if (statusFilter) lidsParams.status_id = statusFilter;
                if (assignedId) lidsParams.assigned_id = assignedId; 
                if (role) lidsParams.role = role;
                console.log("LIDS PARAMS =>", lidsParams);

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
                    search
                );

                setTotalPages(Math.max(1, Number(pagination?.totalPages) || 1));
                setCounts((prev) => (append ? { ...prev, ...countMap } : countMap));
                setLidsByStatus((prev) =>
                    append ? mergeLidsGrouped(prev, grouped, statusList) : grouped
                );
            } catch {
                if (fetchId !== fetchLock.current) return;
                if (!append) {
                    setStatuses([]);
                    setLidsByStatus({});
                    setCounts({});
                    setTotalPages(1);
                }
            } finally {
                if (fetchId === fetchLock.current) {
                    setLoading(false);
                    setLoadingMore(false);
                }
            }
        },
     [search, statusFilter, assignedId, role]  
    );

    useEffect(() => {
        skipPageEffectRef.current = true;
        setPage(1);
        loadPage({ pageNumber: 1, append: false });
    },  [search, statusFilter, assignedId, loadPage, role]);

    useEffect(() => {
        if (page <= 1) return;
        if (skipPageEffectRef.current) {
            skipPageEffectRef.current = false;
            return;
        }
        loadPage({ pageNumber: page, append: true });
    }, [page, loadPage]);

    const hasMore = page < totalPages;

    const loadMore = useCallback(() => {
        if (loading || loadingMore || !hasMore) return;
        setPage((p) => p + 1);
    }, [hasMore, loading, loadingMore]);

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
        skipPageEffectRef.current = true;
        setPage(1);
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
    };
}
