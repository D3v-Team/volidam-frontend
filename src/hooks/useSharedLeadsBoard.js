import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiLids } from "../Services/api/Lids";
import { apiLidStatuses } from "../Services/api/LidStatuses";
import { apiLidChildStatuses } from "../Services/api/LidChildStatuses";
import {
    buildBoardColumns,
    filterParentStatusesForRole,
    parseChildStatusesResponse,
} from "../utils/lidChildStatus";
import {
    mergeLidsGrouped,
    parseLidsBoardResponse,
    parseStatusesResponse,
} from "../utils/lidBoard";

/**
 * Toq / Juft kunlar uchun leads board.
 * Parent statuslar + child statuslar ustunlari, type bo'yicha filter.
 */
export function useSharedLeadsBoard({
    dayType,
    statusFilter = "",
    search = "",
    assignedId = "",
    role = "",
} = {}) {
    const [parentStatuses, setParentStatuses] = useState([]);
    const [childStatuses, setChildStatuses] = useState([]);
    const [lidsByStatus, setLidsByStatus] = useState({});
    const [counts, setCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchLock = useRef(0);
    const columnsRef = useRef([]);
    const loadingMoreRef = useRef(false);

    const filteredParents = useMemo(
        () => filterParentStatusesForRole(parentStatuses, role),
        [parentStatuses, role]
    );

    const boardColumns = useMemo(
        () =>
            buildBoardColumns(
                filteredParents,
                childStatuses,
                dayType,
                statusFilter
            ),
        [filteredParents, childStatuses, dayType, statusFilter]
    );

    useEffect(() => {
        columnsRef.current = boardColumns;
    }, [boardColumns]);

    useEffect(() => {
        loadingMoreRef.current = loadingMore;
    }, [loadingMore]);

    const parentIds = useMemo(
        () => filteredParents.map((s) => s.id).filter(Boolean),
        [filteredParents]
    );

    const loadPage = useCallback(
        async ({ pageNumber, append }) => {
            const fetchId = ++fetchLock.current;
            if (append) setLoadingMore(true);
            else setLoading(true);

            try {
                const lidsParams = {
                    page: pageNumber,
                    limit: 10,
                    type: dayType,
                };
                if (statusFilter) lidsParams.status_id = statusFilter;
                if (assignedId) lidsParams.assigned_id = assignedId;
                if (role) lidsParams.role = role;

                const childParams = {
                    type: dayType,
                    limit: 100,
                };
                if (statusFilter) childParams.status_id = statusFilter;

                if (pageNumber === 1) {
                    const [statusRes, childRes, lidsRes] = await Promise.all([
                        apiLidStatuses.getAll(),
                        apiLidChildStatuses.getAll(childParams),
                        apiLids.getList(lidsParams),
                    ]);

                    if (fetchId !== fetchLock.current) return;

                    const statusList = parseStatusesResponse(statusRes);
                    let childList = parseChildStatusesResponse(childRes);

                    const parents = filterParentStatusesForRole(statusList, role);
                    const pIds = parents.map((s) => s.id).filter(Boolean);
                    if (pIds.length > 0) {
                        childList = childList.filter((c) =>
                            pIds.includes(c.status_id)
                        );
                    }

                    setParentStatuses(statusList);
                    setChildStatuses(childList);

                    const cols = buildBoardColumns(
                        parents,
                        childList,
                        dayType,
                        statusFilter
                    );
                    columnsRef.current = cols;

                    const { grouped, counts: countMap, pagination } =
                        parseLidsBoardResponse(lidsRes, cols, search);

                    const calculatedTotalPages = Math.max(
                        1,
                        Number(pagination?.totalPages) || 1
                    );
                    setTotalPages(calculatedTotalPages);
                    setCounts(countMap);
                    setLidsByStatus(grouped);
                } else {
                    const lidsRes = await apiLids.getList(lidsParams);
                    if (fetchId !== fetchLock.current) return;

                    const { grouped, counts: countMap, pagination } =
                        parseLidsBoardResponse(
                            lidsRes,
                            columnsRef.current,
                            search
                        );

                    const calculatedTotalPages = Math.max(
                        1,
                        Number(pagination?.totalPages) || 1
                    );
                    setTotalPages(calculatedTotalPages);
                    setCounts((prev) => (append ? { ...prev, ...countMap } : countMap));
                    setLidsByStatus((prev) =>
                        append
                            ? mergeLidsGrouped(prev, grouped, columnsRef.current)
                            : grouped
                    );
                }
            } catch (error) {
                console.error(`Failed to load shared board page ${pageNumber}:`, error);
                if (fetchId !== fetchLock.current) return;
                if (!append) {
                    setParentStatuses([]);
                    setChildStatuses([]);
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
        [dayType, statusFilter, search, assignedId, role]
    );

    useEffect(() => {
        setPage(1);
        loadPage({ pageNumber: 1, append: false });
    }, [search, assignedId, role, dayType, statusFilter, loadPage]);

    useEffect(() => {
        if (page <= 1) return;
        loadPage({ pageNumber: page, append: true });
    }, [page, loadPage]);

    const hasMore = page < totalPages;

    const loadMore = useCallback(() => {
        if (loadingMoreRef.current || loading || !hasMore || page >= totalPages) return;
        setPage((p) => p + 1);
    }, [hasMore, loading, totalPages, page]);

    const refreshBoard = async () => {
        setPage(1);
        await loadPage({ pageNumber: 1, append: false });
    };

    const createChildStatus = async (data) => {
        await apiLidChildStatuses.create(data);
        await refreshBoard();
    };

    const updateChildStatus = async (id, data) => {
        await apiLidChildStatuses.update(id, data);
        await refreshBoard();
    };

    const deleteChildStatus = async (id) => {
        await apiLidChildStatuses.delete(id);
        await refreshBoard();
    };

    const createStatus = async (data) => {
        await apiLidStatuses.create(data);
        await refreshBoard();
    };

    const totalLids = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0);

    const getParentStatus = useCallback(
        (parentId) => parentStatuses.find((s) => s.id === parentId),
        [parentStatuses]
    );

    const getNextChildOrder = useCallback(
        (parentId) => {
            const siblings = childStatuses.filter(
                (c) => c.status_id === parentId && c.type === dayType
            );
            if (!siblings.length) return 0;
            return Math.max(...siblings.map((c) => c.order ?? 0)) + 1;
        },
        [childStatuses, dayType]
    );

    return {
        statuses: boardColumns,
        parentStatuses: filteredParents,
        allParentStatuses: parentStatuses,
        childStatuses,
        lidsByStatus,
        counts,
        totalLids,
        loading,
        loadingMore,
        hasMore,
        page,
        loadMore,
        refreshBoard,
        createStatus,
        createChildStatus,
        updateChildStatus,
        deleteChildStatus,
        getParentStatus,
        getNextChildOrder,
        parentIds,
    };
}
