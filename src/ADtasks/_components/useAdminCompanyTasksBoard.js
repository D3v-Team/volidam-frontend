import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { apiLocations } from "../../../utils/Controllers/Locations";
import { useToast } from "../../../hooks/useToast";
import {
    apiLocationStatuses,
    normalizeLocationStatusesResponse,
} from "../../../utils/Controllers/apiLocationStatuses";
import { apiUsers } from "../../../utils/Controllers/Users";
import { apiManagers } from "../../../utils/Controllers/Managers";
import {
    applyLocationStatusDragToRows,
    buildKanbanColumns,
    COMPANY_KANBAN_PAGE_SIZE,
    getFixedAssigneeFilterRole,
    getLocationStatusId,
    locationToKanbanRow,
    normalizeLocationsByStatusResponse,
    normalizeUsersResponse,
    shiftCountByStatus,
    taskBelongsInColumn,
} from "./adTaskBoardShared";
import {
    adminTasksBoardScrollSessionKey,
    buildAdminTasksBoardFilterSig,
    KANBAN_SCROLL_RESTORE_MAX_PAGES,
    readAdminTasksBoardScrollSession,
    writeAdminTasksBoardScrollSession,
} from "./adminTasksBoardScrollSession";
import {
    applyRestoredPageVerticalScroll,
    snapshotVerticalScrollToRef,
    verticalSnapshotForSessionWrite,
} from "./tasksBoardVerticalScroll";
import {
    getViewportBrokerTaskAnchorId,
    scheduleBrokerTaskAnchorIfNeeded,
} from "./tasksBoardScrollAnchor";
import { ADMIN_TASKS_BOARD_INVALIDATE_EVENT } from "../../../realtime/adminTasksBoardSocket";
import {
    applyLocationStatusWithChatNote,
    LocationStatusNoteRequiredError,
} from "../../../utils/locationStatusWithChatNote";

const TASK_TYPE = "company";
const SCROLL_SESSION_KEY = adminTasksBoardScrollSessionKey("company");

function getInitialCompanyFilters() {
    const defaults = () => ({
        filterCompanyRegion: "",
        filterAssigneeType: "",
        filterAssigneeId: "",
    });
    const raw = readAdminTasksBoardScrollSession(SCROLL_SESSION_KEY);
    if (!raw || typeof raw !== "object") return defaults();
    const savedSig = String(raw.filterSig ?? "").trim();
    if (!savedSig) return defaults();
    const parts = savedSig.split("|");
    if (parts[0] !== "1") return defaults();
    const filterCompanyRegion = (parts[2] ?? "").trim();
    const filterAssigneeType = (parts[3] ?? "").trim();
    const filterAssigneeId = (parts[4] ?? "").trim();
    const sig = buildAdminTasksBoardFilterSig({
        isCompanyType: true,
        type: TASK_TYPE,
        filterCompanyRegion,
        filterAssigneeType,
        filterAssigneeId,
    });
    if (sig !== savedSig) return defaults();
    return { filterCompanyRegion, filterAssigneeType, filterAssigneeId };
}

export function useAdminCompanyTasksBoard({ notStatusIds, thisDay } = {}) {
    const toast = useToast();
    const fixedAssigneeFilterRole = useMemo(
        () => getFixedAssigneeFilterRole(TASK_TYPE),
        []
    );
    const effectiveFilterAssigneeType =
        fixedAssigneeFilterRole?.value ?? "";

    const [filterCompanyRegion, setFilterCompanyRegion] = useState(
        () => getInitialCompanyFilters().filterCompanyRegion
    );
    const [filterAssigneeType, setFilterAssigneeType] = useState(
        () => getInitialCompanyFilters().filterAssigneeType
    );
    const [filterAssigneeId, setFilterAssigneeId] = useState(
        () => getInitialCompanyFilters().filterAssigneeId
    );

    const [rows, setRows] = useState([]);
    const [countByStatus, setCountByStatus] = useState({});
    const [loading, setLoading] = useState(false);
    const [restoring, setRestoring] = useState(true);
    const [kanbanColumns, setKanbanColumns] = useState([]);
    const [statusesLoading, setStatusesLoading] = useState(false);
    const [statusListTick, setStatusListTick] = useState(0);
    const [total, setTotal] = useState(0);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: COMPANY_KANBAN_PAGE_SIZE,
    });

    const [page, setPage] = useState(1);
    const pageRef = useRef(1);
    useEffect(() => {
        pageRef.current = page;
    }, [page]);

    const boardScrollRef = useRef(null);
    const mainScrollRef = useRef(null);
    const sentinelRef = useRef(null);
    const boardDragCooldownUntilRef = useRef(0);
    const rowsRef = useRef([]);
    rowsRef.current = rows;

    // Page-dan keladigan qo'shimcha filtrlar (not_statuses / this_day).
    // Har renderda yangilanadi — shunda loadTasksPage useCallback'i BARQAROR qoladi
    // (deps o'zgarmaydi, restore/scroll effektlari qayta ishlamaydi), lekin eng
    // so'nggi qiymatni shu ref orqali o'qiy oladi.
    const filterExtrasRef = useRef({});
    filterExtrasRef.current = { notStatusIds, thisDay };

    const lastRequestKeyRef = useRef("");
    const tasksFetchInFlightKeyRef = useRef(null);
    const tasksFilterFetchGenRef = useRef(0);
    const tasksAbortRef = useRef(null);
    const skipPageEffectFetchRef = useRef(false);
    const restoredSigRef = useRef("");
    const sessionHydratedRef = useRef(false);
    const restoreInProgressRef = useRef(false);
    const scrollPersistTimerRef = useRef(null);
    const lastGoodVerticalScrollRef = useRef(null);

    const filterSig = useMemo(
        () =>
            buildAdminTasksBoardFilterSig({
                isCompanyType: true,
                type: TASK_TYPE,
                filterCompanyRegion,
                filterAssigneeType: effectiveFilterAssigneeType || filterAssigneeType,
                filterAssigneeId,
            }),
        [
            filterCompanyRegion,
            effectiveFilterAssigneeType,
            filterAssigneeType,
            filterAssigneeId,
        ]
    );
    const filterSigRef = useRef(filterSig);
    filterSigRef.current = filterSig;

    const persistFiltersRef = useRef({});
    persistFiltersRef.current = {
        filterCompanyRegion,
        filterAssigneeType: effectiveFilterAssigneeType || filterAssigneeType,
        filterAssigneeId,
    };

    const [assignMode, setAssignMode] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState(() => new Set());
    const [cancelDrop, setCancelDrop] = useState(null);
    const [cancelReasonSubmitting, setCancelReasonSubmitting] = useState(false);

    const [assigneeFilterList, setAssigneeFilterList] = useState([]);
    const [assigneeFilterLoading, setAssigneeFilterLoading] = useState(false);
    const [assigneeListPage, setAssigneeListPage] = useState(1);
    const [assigneeListTotalPages, setAssigneeListTotalPages] = useState(1);

    const loadTasksPage = useCallback(
        async ({ pageNumber, append = false, silent = false, force = false } = {}) => {
            const addr = String(filterCompanyRegion ?? "").trim();
            const asgType = String(
                effectiveFilterAssigneeType || filterAssigneeType || ""
            ).trim();
            const asgId = String(filterAssigneeId ?? "").trim();

            // Qo'shimcha filtrlarni stabil ref'dan o'qiymiz (eng so'nggi qiymat).
            const { notStatusIds: nsi, thisDay: td } = filterExtrasRef.current;
            const notStatuses = Array.from(nsi ?? [])
                .map(String)
                .filter(Boolean);
            const thisDayFlag = !!td;

            const pageNum = Math.max(1, Number(pageNumber) || 1);

            const requestKey = `loc|${pageNum}|${COMPANY_KANBAN_PAGE_SIZE}|${append ? "a" : "r"}|${addr}|${asgId || "all"}|${notStatuses.slice().sort().join(",")}|${thisDayFlag ? 1 : 0}`;
            if (!force) {
                if (lastRequestKeyRef.current === requestKey) return;
                if (tasksFetchInFlightKeyRef.current === requestKey) return;
            }
            lastRequestKeyRef.current = requestKey;
            tasksFetchInFlightKeyRef.current = requestKey;

            tasksAbortRef.current?.abort();
            const ac = new AbortController();
            tasksAbortRef.current = ac;

            if (!append && !silent) setLoading(true);
            try {
                const res = await apiLocations.getByStatus({
                    page: pageNum,
                    limit: COMPANY_KANBAN_PAGE_SIZE,
                    address: addr || undefined,
                    assignee_id: asgId || undefined,
                    not_statuses: notStatuses.length ? notStatuses : undefined,
                    this_day: thisDayFlag,
                    signal: ac.signal,
                });
                const { items, pagination: p, countByStatus: statusCounts } =
                    normalizeLocationsByStatusResponse(res);
                const mapped = (items ?? []).map(locationToKanbanRow);
                const counts = statusCounts ?? {};
                setCountByStatus(counts);
                setRows((prev) => {
                    if (!append) return mapped;
                    const map = new Map();
                    for (const r of prev) map.set(String(r?.id), r);
                    for (const r of mapped) map.set(String(r?.id), r);
                    return Array.from(map.values());
                });
                const countTotal = Object.values(counts).reduce(
                    (sum, n) => sum + (Number(n) || 0),
                    0
                );
                setTotal(
                    Number(
                        res?.data?.total ??
                            res?.data?.data?.total ??
                            p?.total ??
                            p?.total_count ??
                            p?.totalCount ??
                            countTotal ??
                            0
                    ) || countTotal
                );
                setPagination({
                    currentPage: p.current_page ?? p.currentPage ?? pageNum,
                    totalPages:
                        p.total_pages ??
                        p.totalPages ??
                        (items.length < COMPANY_KANBAN_PAGE_SIZE
                            ? pageNum
                            : pageNum + 1),
                    totalCount: p.total ?? p.total_count ?? p.totalCount ?? 0,
                    limit: p.limit ?? COMPANY_KANBAN_PAGE_SIZE,
                });
                sessionHydratedRef.current = true;
            } catch (e) {
                if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError") return;
                console.error(e);
                const msg = e?.response?.data?.message;
                toast({
                    title: "Xatolik",
                    description: Array.isArray(msg)
                        ? msg.join(". ")
                        : msg || "Vazifalarni yuklab bo'lmadi",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
                if (!append) {
                    setRows([]);
                    setTotal(0);
                    setCountByStatus({});
                }
            } finally {
                if (tasksFetchInFlightKeyRef.current === requestKey) {
                    tasksFetchInFlightKeyRef.current = null;
                }
                if (!append && !silent) setLoading(false);
            }
        },
        [
            effectiveFilterAssigneeType,
            filterAssigneeId,
            filterAssigneeType,
            filterCompanyRegion,
            toast,
        ]
    );

    const refetchFirstPage = useCallback(
        ({ silent } = {}) => {
            lastRequestKeyRef.current = "";
            tasksFetchInFlightKeyRef.current = null;
            skipPageEffectFetchRef.current = true;
            setPage(1);
            return loadTasksPage({
                pageNumber: 1,
                append: false,
                silent: !!silent,
                force: true,
            });
        },
        [loadTasksPage]
    );

    const flushPersistScroll = useCallback(() => {
        if (typeof window === "undefined") return;
        if (restoreInProgressRef.current) return;
        const vertical = snapshotVerticalScrollToRef(
            lastGoodVerticalScrollRef,
            mainScrollRef
        );
        const f = persistFiltersRef.current;
        const sy = Number((vertical ?? lastGoodVerticalScrollRef.current)?.windowScrollY) || 0;
        const sf = Number((vertical ?? lastGoodVerticalScrollRef.current)?.scrollFraction);
        const hasSf = Number.isFinite(sf) && sf >= 0 && sf <= 1;
        const isNearTop = sy < 64 && (!hasSf || sf < 0.05);
        const maxLoadedPageForRestore = isNearTop ? 1 : pageRef.current;
        // Map field names to match expected format
        const scrollData = {
            filterSig: filterSigRef.current,
            persistedType: TASK_TYPE,
            persistedFilterCompanyRegion: f.filterCompanyRegion,
            persistedFilterAssigneeType: f.filterAssigneeType,
            persistedFilterAssigneeId: f.filterAssigneeId,
            windowScrollY: vertical?.windowScrollY,
            scrollHeight: vertical?.docScrollHeight,
            clientHeight: vertical?.viewportHeight,
            nearBottom: vertical?.nearBottom,
            scrollFraction: vertical?.scrollFraction,
            boardScrollLeft: boardScrollRef.current?.scrollLeft ?? 0,
            maxLoadedPage: maxLoadedPageForRestore,
            anchorTaskId: getViewportBrokerTaskAnchorId(),
        };
        writeAdminTasksBoardScrollSession(SCROLL_SESSION_KEY, scrollData);
    }, []);

    const schedulePersistScroll = useCallback(() => {
        if (boardIsDraggingRef.current) return;
        if (Date.now() < boardDragCooldownUntilRef.current) return;
        if (scrollPersistTimerRef.current != null) return;
        scrollPersistTimerRef.current = window.setTimeout(() => {
            scrollPersistTimerRef.current = null;
            flushPersistScroll();
        }, 200);
    }, [flushPersistScroll]);

    const boardIsDraggingRef = useRef(false);

    const onDragSessionStart = useCallback(() => {
        boardIsDraggingRef.current = true;
    }, []);

    const onDragSessionEnd = useCallback(() => {
        boardIsDraggingRef.current = false;
        boardDragCooldownUntilRef.current = Date.now() + 2000;
    }, []);

    useLayoutEffect(() => {
        snapshotVerticalScrollToRef(lastGoodVerticalScrollRef, mainScrollRef);
    }, []);

    useEffect(() => {
        restoredSigRef.current = "";
        sessionHydratedRef.current = false;
        lastGoodVerticalScrollRef.current = null;
        setRestoring(true);
        const el = mainScrollRef.current;
        if (el) el.scrollTop = 0;
    }, [filterSig]);

    useEffect(() => {
        let cancelled = false;
        setStatusesLoading(true);
        (async () => {
            try {
                const res = await apiLocationStatuses.getAll();
                const raw = normalizeLocationStatusesResponse(res);
                if (!cancelled) setKanbanColumns(buildKanbanColumns(raw));
            } catch (e) {
                console.error(e);
                if (!cancelled) setKanbanColumns([]);
            } finally {
                if (!cancelled) setStatusesLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [statusListTick]);

    useEffect(() => {
        const onSocket = () => {
            if (boardIsDraggingRef.current) return;
            if (Date.now() < boardDragCooldownUntilRef.current) return;
            refetchFirstPage({ silent: true });
        };
        window.addEventListener(ADMIN_TASKS_BOARD_INVALIDATE_EVENT, onSocket);
        return () =>
            window.removeEventListener(ADMIN_TASKS_BOARD_INVALIDATE_EVENT, onSocket);
    }, [refetchFirstPage]);

    useEffect(() => {
        tasksFilterFetchGenRef.current += 1;
        sessionHydratedRef.current = false;
        restoredSigRef.current = "";
        setRows([]);
        setCountByStatus({});
        lastRequestKeyRef.current = "";
        skipPageEffectFetchRef.current = true;
        setPage(1);
        loadTasksPage({ pageNumber: 1, append: false, silent: false, force: false });
        return () => {
            tasksFilterFetchGenRef.current += 1;
            tasksAbortRef.current?.abort();
        };
    }, [filterSig, loadTasksPage]);

    useEffect(() => {
        if (page <= 1) return;
        if (skipPageEffectFetchRef.current) {
            skipPageEffectFetchRef.current = false;
            return;
        }
        if (restoreInProgressRef.current || !sessionHydratedRef.current) return;
        loadTasksPage({ pageNumber: page, append: true, silent: false });
    }, [page, loadTasksPage]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (loading || statusesLoading) return;
        if (rowsRef.current.length === 0) return;
        if (restoreInProgressRef.current) return;
        if (restoredSigRef.current === filterSig) return;

        const saved = readAdminTasksBoardScrollSession(SCROLL_SESSION_KEY);
        if (!saved || String(saved.filterSig ?? "") !== filterSig) {
            restoredSigRef.current = filterSig;
            sessionHydratedRef.current = true;
            setRestoring(false);
            return;
        }

        const savedMax = Math.max(
            1,
            Math.min(
                KANBAN_SCROLL_RESTORE_MAX_PAGES,
                Math.floor(Number(saved.maxLoadedPage) || 1)
            )
        );
        const x = Math.max(0, Number(saved.boardScrollLeft) || 0);

        let verticalScrollCancel = null;
        let anchorCancel = null;
        const applyScroll = () => {
            verticalScrollCancel?.();
            anchorCancel?.();
            verticalScrollCancel = applyRestoredPageVerticalScroll(saved, {
                scrollRootRef: mainScrollRef,
                onApplied: () => {
                    const br = boardScrollRef.current;
                    if (br) br.scrollLeft = x;
                },
                onComplete: () => {
                    anchorCancel?.();
                    anchorCancel = scheduleBrokerTaskAnchorIfNeeded(saved);
                },
            });
        };

        if (savedMax <= 1) {
            restoreInProgressRef.current = true;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    applyScroll();
                    restoreInProgressRef.current = false;
                    restoredSigRef.current = filterSig;
                    sessionHydratedRef.current = true;
                    setRestoring(false);
                    flushPersistScroll();
                });
            });
            return () => {
                verticalScrollCancel?.();
                anchorCancel?.();
            };
        }

        let cancelled = false;
        setRestoring(true);
        restoreInProgressRef.current = true;
        (async () => {
            try {
                for (let p = 2; p <= savedMax; p++) {
                    if (cancelled) return;
                    await loadTasksPage({
                        pageNumber: p,
                        append: true,
                        silent: true,
                        force: true,
                    });
                }
                if (cancelled) return;
                skipPageEffectFetchRef.current = true;
                setPage(savedMax);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (!cancelled) applyScroll();
                        restoreInProgressRef.current = false;
                        if (!cancelled) restoredSigRef.current = filterSig;
                        if (!cancelled) sessionHydratedRef.current = true;
                        if (!cancelled) setRestoring(false);
                        if (!cancelled) flushPersistScroll();
                    });
                });
            } catch (e) {
                console.error(e);
                restoreInProgressRef.current = false;
                sessionHydratedRef.current = true;
                if (!cancelled) restoredSigRef.current = filterSig;
                if (!cancelled) setRestoring(false);
            }
        })();

        return () => {
            cancelled = true;
            verticalScrollCancel?.();
            anchorCancel?.();
        };
    }, [
        loading,
        statusesLoading,
        filterSig,
        loadTasksPage,
        flushPersistScroll,
    ]);

    useEffect(() => {
        const el = mainScrollRef.current;
        if (!el) return;
        const onScroll = () => {
            if (boardIsDraggingRef.current) return;
            snapshotVerticalScrollToRef(lastGoodVerticalScrollRef, mainScrollRef);
            schedulePersistScroll();
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, [schedulePersistScroll]);

    const hasMore = useMemo(() => {
        const cur = Number(pagination.currentPage) || 1;
        const tot = Number(pagination.totalPages) || 1;
        return cur < tot;
    }, [pagination.currentPage, pagination.totalPages]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            (entries) => {
                if (!entries[0]?.isIntersecting) return;
                if (loading || !hasMore) return;
                if (boardIsDraggingRef.current) return;
                if (restoreInProgressRef.current || !sessionHydratedRef.current) return;
                setPage((p) => p + 1);
            },
            { root: null, rootMargin: "300px 0px", threshold: 0.01 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [hasMore, loading]);

    const columnByKey = useMemo(() => {
        const map = new Map();
        for (const col of kanbanColumns) map.set(col.key, col);
        return map;
    }, [kanbanColumns]);

    const columnByStatusId = useMemo(() => {
        const map = new Map();
        for (const col of kanbanColumns) {
            const id = col?.id != null ? String(col.id).trim() : "";
            if (id) map.set(id, col);
        }
        return map;
    }, [kanbanColumns]);

    const grouped = useMemo(() => {
        const acc = {};
        for (const c of kanbanColumns) acc[c.key] = [];
        const fallback = kanbanColumns[0];
        for (const r of rows) {
            const sid = getLocationStatusId(r);
            let col = sid ? columnByStatusId.get(sid) : null;
            if (!col) {
                col =
                    kanbanColumns.find((c) => taskBelongsInColumn(r, c)) ??
                    fallback;
            }
            const k = col?.key;
            if (k) {
                if (!acc[k]) acc[k] = [];
                acc[k].push(r);
            }
        }
        // for (const k of Object.keys(acc)) {
        //     acc[k] = (acc[k] ?? []).slice().sort((a, b) => {
        //         const an = String(a?.details?.location_name ?? a?.name ?? "");
        //         const bn = String(b?.details?.location_name ?? b?.name ?? "");
        //         const byName = an.localeCompare(bn, "uz");
        //         if (byName !== 0) return byName;
        //         const at = a?.createdAt ?? a?.created_at ?? "";
        //         const bt = b?.createdAt ?? b?.created_at ?? "";
        //         return (
        //             (bt ? new Date(bt).getTime() : 0) -
        //             (at ? new Date(at).getTime() : 0)
        //         );
        //     });
        // }
        return acc;
    }, [rows, kanbanColumns, columnByStatusId]);

    const persistTaskDrop = useCallback(
        async (movedRow, targetColumn) => {
            const idStr = String(movedRow?.id ?? "").trim();
            const sid = String(targetColumn?.id ?? "").trim();
            if (!idStr || !sid) return;

            try {
                await apiLocations.updateLocationStatus(idStr, { status_id: sid });
                toast({
                    title: "Yangilandi",
                    status: "success",
                    duration: 2000,
                    isClosable: true,
                });
            } catch (e) {
                console.error(e);
                toast({
                    title: "Xatolik",
                    description: "Yangilab bo'lmadi",
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                });
                refetchFirstPage();
            }
        },
        [refetchFirstPage, toast]
    );

    const confirmCancelDrop = useCallback(
        async (reasonText) => {
            const payload = cancelDrop;
            if (!payload?.task?.id) return;
            const idStr = String(payload.task.id).trim();
            const sid = String(payload.statusApiId ?? "").trim();
            if (!sid) return;
            const noteTrim = String(reasonText ?? "").trim();
            if (!noteTrim) {
                toast({
                    title: "Izoh majburiy",
                    description: "Avval izoh yozing — u chatga tushadi, keyin status yangilanadi",
                    status: "warning",
                    duration: 3500,
                    isClosable: true,
                });
                return;
            }
            setCancelReasonSubmitting(true);
            try {
                const statusLabel = String(payload.statusName ?? "").trim() || "—";
                await applyLocationStatusWithChatNote({
                    locationId: idStr,
                    statusId: sid,
                    note: noteTrim,
                    statusLabel,
                });
                const prevSid = getLocationStatusId(payload.task);
                setRows((prev) =>
                    applyLocationStatusDragToRows({
                        rows: prev,
                        movedId: idStr,
                        targetStatusId: sid,
                        targetStatusName: statusLabel,
                    })
                );
                if (prevSid && prevSid !== sid) {
                    setCountByStatus((prev) => shiftCountByStatus(prev, prevSid, sid));
                }
                toast({
                    title: "Saqlandi",
                    description: "Izoh chatga yozildi va status yangilandi",
                    status: "success",
                    duration: 2500,
                });
                setCancelDrop(null);
                refetchFirstPage({ silent: true });
            } catch (e) {
                if (e instanceof LocationStatusNoteRequiredError) {
                    toast({
                        title: "Izoh majburiy",
                        description: "Avval izoh yozing — u chatga tushadi",
                        status: "warning",
                        duration: 3500,
                        isClosable: true,
                    });
                    return;
                }
                console.error(e);
                toast({ title: "Xatolik", status: "error", duration: 4000 });
            } finally {
                setCancelReasonSubmitting(false);
            }
        },
        [cancelDrop, refetchFirstPage, toast]
    );

    useEffect(() => {
        const asgType = effectiveFilterAssigneeType || filterAssigneeType;
        if (!asgType) {
            setAssigneeFilterList([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setAssigneeFilterLoading(true);
            try {
                let res;
                if (asgType === "operator") res = await apiUsers.getOperator(assigneeListPage);
                else if (asgType === "supplier")
                    res = await apiUsers.getSuppliers(assigneeListPage);
                else if (asgType === "developer")
                    res = await apiUsers.getDevelopers(assigneeListPage);
                else if (asgType === "broker") res = await apiUsers.getBrokers();
                else if (asgType === "lot_creator")
                    res = await apiUsers.getLotCreators(assigneeListPage);
                else if (asgType === "admin") res = await apiManagers.All();
                else res = await apiUsers.GetUserRole(asgType);
                const { items, pagination: p } = normalizeUsersResponse(res);
                if (!cancelled) {
                    setAssigneeFilterList(Array.isArray(items) ? items : []);
                    const tot =
                        p?.totalPages ?? p?.total_pages ?? p?.total ?? 1;
                    setAssigneeListTotalPages(Number(tot) > 0 ? Number(tot) : 1);
                }
            } catch (e) {
                console.error(e);
                if (!cancelled) setAssigneeFilterList([]);
            } finally {
                if (!cancelled) setAssigneeFilterLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [effectiveFilterAssigneeType, filterAssigneeType, assigneeListPage]);

    return {
        TASK_TYPE,
        rows,
        setRows,
        countByStatus,
        setCountByStatus,
        loading,
        restoring,
        statusesLoading,
        total,
        kanbanColumns,
        grouped,
        columnByKey,
        hasMore,
        filterCompanyRegion,
        setFilterCompanyRegion,
        filterAssigneeId,
        setFilterAssigneeId,
        filterAssigneeType,
        setFilterAssigneeType,
        effectiveFilterAssigneeType,
        fixedAssigneeFilterRole,
        assigneeFilterList,
        assigneeFilterLoading,
        assigneeListPage,
        setAssigneeListPage,
        assigneeListTotalPages,
        assignMode,
        setAssignMode,
        selectedTaskIds,
        setSelectedTaskIds,
        cancelDrop,
        setCancelDrop,
        cancelReasonSubmitting,
        confirmCancelDrop,
        persistTaskDrop,
        boardScrollRef,
        mainScrollRef,
        sentinelRef,
        schedulePersistScroll,
        onDragSessionStart,
        onDragSessionEnd,
        refetchFirstPage,
        statusListTick,
        setStatusListTick,
        sessionHydratedRef,
        restoreInProgressRef,
        restoredSigRef,
        filterSig,
        flushPersistScroll,
    };
}