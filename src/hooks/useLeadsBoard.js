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

/**
 * useLeadsBoard hook manages pagination, filtering, and data merging for the Kanban board.
 * 
 * Features:
 * - Loads page 1 with all statuses
 * - Appends additional pages on scroll
 * - Resets to page 1 when filters change
 * - Handles concurrent requests with fetchLock
 */
export function useLeadsBoard({ statusFilter = "", search = "", assignedId = "", role = "" } = {}) {
    const [statuses, setStatuses] = useState([]);
    const [lidsByStatus, setLidsByStatus] = useState({});
    const [counts, setCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [moving, setMoving] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    const fetchLock = useRef(0);
    const statusesRef = useRef([]);
    const loadingMoreRef = useRef(false);  // Track loading state to prevent duplicate requests

    useEffect(() => {
        statusesRef.current = statuses;
    }, [statuses]);

    useEffect(() => {
        loadingMoreRef.current = loadingMore;
    }, [loadingMore]);

    /**
     * Fetches a page of lids and either replaces or appends to state
     * @param {number} pageNumber - Page to fetch
     * @param {boolean} append - If true, merges with existing data; if false, replaces
     */
    const loadPage = useCallback(
        async ({ pageNumber, append }) => {
            const fetchId = ++fetchLock.current;
            if (append) setLoadingMore(true);
            else setLoading(true);

            try {
                const lidsParams = { 
                    page: pageNumber,
                    limit: 10
                };
                if (statusFilter) lidsParams.status_id = statusFilter;
                if (assignedId) lidsParams.assigned_id = assignedId;
                if (role) lidsParams.role = role;

                // Page 1: fetch both statuses and lids in parallel
                // Subsequent pages: fetch lids only
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

                // Calculate totalPages for hasMore logic
                const calculatedTotalPages = Math.max(1, Number(pagination?.totalPages) || 1);
                setTotalPages(calculatedTotalPages);
                
                console.log(`[useLeadsBoard] Page ${pageNumber} loaded: totalPages=${calculatedTotalPages}, hasMore=${pageNumber < calculatedTotalPages}`);
                
                // Merge or replace counts
                setCounts((prev) => (append ? { ...prev, ...countMap } : countMap));
                
                // Merge or replace lids by status
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
            } finally {
                if (fetchId === fetchLock.current) {
                    setLoading(false);
                    setLoadingMore(false);
                }
            }
        },
        [search, statusFilter, assignedId, role]
    );

    // Effect 1: Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
        loadPage({ pageNumber: 1, append: false });
    }, [search, statusFilter, assignedId, loadPage, role]);

    // Effect 2: Load next page when page state changes
    useEffect(() => {
        if (page <= 1) return;
        loadPage({ pageNumber: page, append: true });
    }, [page, loadPage]);

    const hasMore = page < totalPages;

    /**
     * Increments page state to trigger next page fetch
     * Strictly guards against multiple concurrent requests
     */
    const loadMore = useCallback(() => {
        // CRITICAL: Check if already loading before doing ANYTHING
        if (loadingMoreRef.current) {
            console.log('[loadMore] Skipped: already loading');
            return;
        }
        if (loading) {
            console.log('[loadMore] Skipped: loading');
            return;
        }
        if (!hasMore) {
            console.log(`[loadMore] Skipped: no more pages (page=${page}, totalPages=${totalPages})`);
            return;
        }
        if (page >= totalPages) {
            console.log(`[loadMore] Skipped: page >= totalPages (${page} >= ${totalPages})`);
            return;
        }
        
        console.log(`[loadMore] Loading next page: ${page} -> ${page + 1}`);
        setPage((p) => p + 1);
    }, [hasMore, loading, totalPages, page]);

    // ========== Other operations (move, create, update, delete) ==========
    
    const moveLid = async (lidId, fromStatusId, toStatusId) => {
        if (fromStatusId === toStatusId) return;

        const sourceItems = [...(lidsByStatus[fromStatusId] || [])];
        const lid = sourceItems.find((l) => l.id === lidId);
        if (!lid) return;

        setMoving(true);
        const prev = lidsByStatus;
        const prevCounts = counts;
        
        // Optimistic update
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
    };
}
