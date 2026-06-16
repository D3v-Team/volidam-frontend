import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, Heading, HStack, Text, Center, Button, Badge, Icon, useColorModeValue, useDisclosure, Flex, VStack, Tabs, TabList, Tab, Select, FormControl, FormLabel } from "@chakra-ui/react";
import AppSpinner from "../../components/ui/AppSpinner";

import {
    DragDropContext,
    Droppable,
    Draggable,
} from "@hello-pangea/dnd";
import { useToast } from "../../hooks/useToast";
import {
    Bell,
    Building2,
    Code2,
    Flag,
    LayoutGrid,
    MoreHorizontal,
    Package,
    Plus,
    ListPlus,
} from "lucide-react";
import { apiTasks } from "../../utils/Controllers/apiTasks";
import {
    apiTaskStatuses,
    normalizeTaskStatusesResponse,
} from "../../utils/Controllers/apiTaskStatuses";
import CreateTaskModal from "./_components/CreateTaskModal";
import CreateTaskStatusModal from "./_components/CreateTaskStatusModal";
import EditTaskStatusModal from "./_components/EditTaskStatusModal";
import EditTaskModal from "./_components/EditTaskModal";
import CancelTaskDropModal from "./_components/CancelTaskDropModal";
import ConfirmDelModal from "../../components/common/ConfirmDelModal";
import PaginationBar from "../../components/common/PaginationBar";
import { apiUsers } from "../../utils/Controllers/Users";
import { apiManagers } from "../../utils/Controllers/Managers";
import TaskCard from "./_components/TaskCard";
import KanbanColumn from "./_components/KanbanColumn";
import {
    priorityRank,
    canEditOrDeleteTaskStatus,
} from "./_components/taskHelpers";
import {
    defaultKanbanColumnLayout,
    normalizeListResponse,
    normalizeUsersResponse,
    buildKanbanColumns,
    taskBelongsInColumn,
    UUID_RE,
    getAssigneeFilterRolesForTaskType,
    getFixedAssigneeFilterRole,
    isCancelledKanbanColumn,
    mergeDetailsWithCancelledReason,
    pickDetailsNoteFromTask,
    pickTaskLabelForCancelModal,
    getStatusColumnCount,
    shiftCountByStatus,
} from "./_components/adTaskBoardShared";
import {
    adminTasksBoardScrollSessionKey,
    buildAdminTasksBoardFilterSig,
    KANBAN_SCROLL_RESTORE_MAX_PAGES,
    readAdminTasksBoardScrollSession,
    writeAdminTasksBoardScrollSession,
} from "./_components/adminTasksBoardScrollSession";
import {
    applyRestoredPageVerticalScroll,
    snapshotVerticalScrollToRef,
    verticalSnapshotForSessionWrite,
} from "./_components/tasksBoardVerticalScroll";
import {
    getViewportBrokerTaskAnchorId,
    scheduleBrokerTaskAnchorIfNeeded,
} from "./_components/tasksBoardScrollAnchor";
import { ADMIN_TASKS_BOARD_INVALIDATE_EVENT } from "../../realtime/adminTasksBoardSocket";

/** ADtasks / ADcompanyTasks — `GET /api/tasks` + statuslar */

/** Barcha tur nomlari (masalan, bo‘sh holat matni) — jumladan kompaniya. */
const TASK_TYPE_TAB_DEFS = [
    { key: "company", label: "Kompaniya", icon: Building2 },
    { key: "notification", label: "Bildirishnoma", icon: Bell },
    { key: "price_update", label: "Narx yangilash", icon: Flag },
    { key: "reorder", label: "Mahsulot topish", icon: Package },
    { key: "developer", label: "Dasturiy ta'minot", icon: Code2 },
    { key: "other", label: "Boshqa", icon: MoreHorizontal },
];

/** `/tasks` — kompaniya vazifalari faqat `/tasks/company`da; bu yerda tab yo‘q. */
const TASK_TYPE_TABS_MULTI = TASK_TYPE_TAB_DEFS.filter((t) => t.key !== "company");

/** Sessiondagi `filterSig` dan tab va selectlarni tiklash (eski yozuvlar ham). */
function getInitialAdminBoardFilterState(mode) {
    const isCompanyPage = mode === "company";
    const defaults = () => ({
        type: isCompanyPage ? "company" : "notification",
        filterCompanyRegion: "",
        filterAssigneeType: "",
        filterAssigneeId: "",
    });
    const raw = readAdminTasksBoardScrollSession(
        adminTasksBoardScrollSessionKey(mode)
    );
    if (!raw || typeof raw !== "object") return defaults();
    const savedSig = String(raw.filterSig ?? "").trim();
    if (!savedSig) return defaults();
    const parts = savedSig.split("|");
    const companyFromSig = parts[0] === "1";
    if (companyFromSig !== isCompanyPage) return defaults();
    let type = isCompanyPage ? "company" : "notification";
    if (!isCompanyPage) {
        const tab = (parts[1] ?? "").trim();
        if (TASK_TYPE_TABS_MULTI.some((t) => t.key === tab)) type = tab;
    }
    const filterCompanyRegion = isCompanyPage ? (parts[2] ?? "").trim() : "";
    const filterAssigneeType = (parts[3] ?? "").trim();
    const filterAssigneeId = (parts[4] ?? "").trim();
    const sig = buildAdminTasksBoardFilterSig({
        isCompanyType: isCompanyPage,
        type,
        filterCompanyRegion,
        filterAssigneeType,
        filterAssigneeId,
    });
    if (sig !== savedSig) return defaults();
    return { type, filterCompanyRegion, filterAssigneeType, filterAssigneeId };
}

/** Vazifa yaratish modali faqat ushbu turlar uchun (company / other emas). */
const TASK_CREATABLE_TYPES = ["notification", "price_update", "reorder", "developer", "other"];

const TASKS_LIST_LIMIT = 50;

/** `/tasks` — barcha vazifalar (kompaniya: `AdminCompanyTasksPage`). */
export function AdminTaskKanbanPage({ pageHeading: pageHeadingProp } = {}) {
    const pageHeading = pageHeadingProp ?? "Barcha vazifalar";

    const toast = useToast();
    const {
        isOpen: isCreateOpen,
        onOpen: onCreateOpen,
        onClose: onCreateClose,
    } = useDisclosure();

    const {
        isOpen: isEditOpen,
        onOpen: onEditOpen,
        onClose: onEditClose,
    } = useDisclosure();
    const {
        isOpen: isDelOpen,
        onOpen: onDelOpen,
        onClose: onDelClose,
    } = useDisclosure();
    const {
        isOpen: isCreateStatusOpen,
        onOpen: onCreateStatusOpen,
        onClose: onCreateStatusClose,
    } = useDisclosure();
    const {
        isOpen: isEditStatusOpen,
        onOpen: onEditStatusOpen,
        onClose: onEditStatusClose,
    } = useDisclosure();
    const {
        isOpen: isDelStatusOpen,
        onOpen: onDelStatusOpen,
        onClose: onDelStatusClose,
    } = useDisclosure();

    const [status] = useState("all");
    const [type, setType] = useState(
        () => getInitialAdminBoardFilterState("multi").type
    );
    const [kanbanColumns, setKanbanColumns] = useState([]);
    const [statusesLoading, setStatusesLoading] = useState(false);
    const [statusListTick, setStatusListTick] = useState(0);
    const [activeStatusColumn, setActiveStatusColumn] = useState(null);
    const [statusDeleteTarget, setStatusDeleteTarget] = useState(null);
    const [statusDeleting, setStatusDeleting] = useState(false);
    const pageRef = useRef(1);
    const [page, setPage] = useState(1);
    useEffect(() => {
        pageRef.current = page;
    }, [page]);
    const [limit] = useState(TASKS_LIST_LIMIT);
    const [rows, setRows] = useState([]);
    const [countByStatus, setCountByStatus] = useState({});
    const rowsRef = useRef([]);
    rowsRef.current = rows;
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [activeTask, setActiveTask] = useState(null);
    const [total, setTotal] = useState(0);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: TASKS_LIST_LIMIT,
    });

    const isLoadingMoreRef = useRef(false);
    const sentinelRef = useRef(null);
    const lastRequestKeyRef = useRef("");
    const tasksFetchInFlightKeyRef = useRef(null);
    const tasksFilterFetchGenRef = useRef(0);
    const tasksAbortRef = useRef(null);
    const skipPageEffectFetchRef = useRef(false);
    const restoredSigRef = useRef("");
    const sessionHydratedRef = useRef(false);
    const restoreInProgressRef = useRef(false);
    const scrollPersistTimerRef = useRef(null);
    /** SPA route almashtirishda live `scrollY` ishonchsiz — oxirgi yaxshi snapshot. */
    const lastGoodVerticalScrollRef = useRef(null);
    /** `/companies` kabi: vertikal scroll shu konteynerda (`scrollTop`). */
    const mainScrollRef = useRef(null);

    const [filterAssigneeType, setFilterAssigneeType] = useState(
        () => getInitialAdminBoardFilterState("multi").filterAssigneeType
    );
    const [filterAssigneeId, setFilterAssigneeId] = useState(
        () => getInitialAdminBoardFilterState("multi").filterAssigneeId
    );
    const [assigneeFilterList, setAssigneeFilterList] = useState([]);
    const [assigneeFilterLoading, setAssigneeFilterLoading] = useState(false);
    const [assigneeListPage, setAssigneeListPage] = useState(1);
    const [assigneeListTotalPages, setAssigneeListTotalPages] = useState(1);

    const assigneeRoleFilterOptions = useMemo(
        () => getAssigneeFilterRolesForTaskType(type),
        [type]
    );
    const fixedAssigneeFilterRole = useMemo(
        () => getFixedAssigneeFilterRole(type),
        [type]
    );
    const effectiveFilterAssigneeType =
        fixedAssigneeFilterRole?.value ?? filterAssigneeType;

    const tasksFetchCtxRef = useRef({});
    tasksFetchCtxRef.current = {
        status,
        type,
        limit,
        toast,
        effectiveFilterAssigneeType,
        filterAssigneeId,
    };

    const scrollSessionKey = useMemo(
        () => adminTasksBoardScrollSessionKey("multi"),
        []
    );
    const filterSig = useMemo(
        () =>
            buildAdminTasksBoardFilterSig({
                isCompanyType: false,
                type,
                filterCompanyRegion: "",
                filterAssigneeType: effectiveFilterAssigneeType,
                filterAssigneeId,
            }),
        [type, effectiveFilterAssigneeType, filterAssigneeId]
    );
    const filterSigRef = useRef(filterSig);
    filterSigRef.current = filterSig;

    const persistBoardFiltersRef = useRef({
        type,
        filterAssigneeType,
        filterAssigneeId,
    });
    persistBoardFiltersRef.current = {
        type,
        filterAssigneeType: effectiveFilterAssigneeType,
        filterAssigneeId,
    };

    const prevTypeForFilterResetRef = useRef(null);
    const prevAssigneeTypeForIdResetRef = useRef(null);
    /** filterSig o‘zgaganda scrollni nolga; birinchi mount / qaytishda restore buzmasin. */
    const prevFilterSigForScrollResetRef = useRef(null);

    useEffect(() => {
        restoredSigRef.current = "";
        sessionHydratedRef.current = false;
        lastGoodVerticalScrollRef.current = null;
        if (
            prevFilterSigForScrollResetRef.current != null &&
            prevFilterSigForScrollResetRef.current !== filterSig
        ) {
            const el = mainScrollRef.current;
            if (el) el.scrollTop = 0;
        }
        prevFilterSigForScrollResetRef.current = filterSig;
    }, [filterSig]);

    useLayoutEffect(() => {
        snapshotVerticalScrollToRef(lastGoodVerticalScrollRef, mainScrollRef);
    }, []);

    const [cancelDrop, setCancelDrop] = useState(null);
    const [cancelReasonSubmitting, setCancelReasonSubmitting] = useState(false);

    const filterDivider = useColorModeValue("gray.200", "whiteAlpha.200");
    const filterLabelColor = useColorModeValue("gray.700", "gray.300");
    const filterFieldBorder = "border";
    const filterFieldHoverBorder = useColorModeValue(
        "neutral.400",
        "neutral.500"
    );
    const filterFieldProps = {
        size: "md",
        borderRadius: "lg",
        variant: "outline",
        bg: "surface",
        color: "text",
        borderColor: filterFieldBorder,
        _hover: { borderColor: filterFieldHoverBorder },
        _focusVisible: {
            borderColor: "blue.400",
            boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
        },
    };

    useEffect(() => {
        if (prevTypeForFilterResetRef.current === null) {
            prevTypeForFilterResetRef.current = type;
            return;
        }
        if (prevTypeForFilterResetRef.current === type) return;
        prevTypeForFilterResetRef.current = type;
        setFilterAssigneeType("");
        setFilterAssigneeId("");
        setAssigneeFilterList([]);
        setAssigneeListPage(1);
    }, [type]);

    useEffect(() => {
        if (prevAssigneeTypeForIdResetRef.current === null) {
            prevAssigneeTypeForIdResetRef.current = filterAssigneeType;
            return;
        }
        if (prevAssigneeTypeForIdResetRef.current === filterAssigneeType) return;
        prevAssigneeTypeForIdResetRef.current = filterAssigneeType;
        setFilterAssigneeId("");
        setAssigneeListPage(1);
    }, [filterAssigneeType]);

    useEffect(() => {
        if (!effectiveFilterAssigneeType) {
            setAssigneeFilterList([]);
            setAssigneeFilterLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            setAssigneeFilterLoading(true);
            try {
                let res;
                if (effectiveFilterAssigneeType === "operator") {
                    res = await apiUsers.getOperator(assigneeListPage);
                } else if (effectiveFilterAssigneeType === "supplier") {
                    res = await apiUsers.getSuppliers(assigneeListPage);
                } else if (effectiveFilterAssigneeType === "developer") {
                    res = await apiUsers.getDevelopers(assigneeListPage);
                } else if (effectiveFilterAssigneeType === "broker") {
                    res = await apiUsers.getBrokers();
                } else if (effectiveFilterAssigneeType === "lot_creator") {
                    res = await apiUsers.getLotCreators(assigneeListPage);
                } else if (effectiveFilterAssigneeType === "admin") {
                    res = await apiManagers.All();
                } else {
                    res = await apiUsers.GetUserRole(effectiveFilterAssigneeType);
                }
                const { items, pagination } = normalizeUsersResponse(res);
                const safe = Array.isArray(items) ? items : [];
                if (!cancelled) {
                    setAssigneeFilterList(safe);
                    const tot =
                        pagination?.totalPages ??
                        pagination?.total_pages ??
                        pagination?.total ??
                        1;
                    setAssigneeListTotalPages(
                        Number(tot) > 0 ? Number(tot) : 1
                    );
                }
            } catch (e) {
                console.error(e);
                if (!cancelled) {
                    setAssigneeFilterList([]);
                    setAssigneeListTotalPages(1);
                }
            } finally {
                if (!cancelled) setAssigneeFilterLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [effectiveFilterAssigneeType, assigneeListPage]);

    const loadTasksPageRef = useRef(null);
    if (!loadTasksPageRef.current) {
        loadTasksPageRef.current = async function loadTasksPage({
            pageNumber,
            append = false,
            silent = false,
            force = false,
        } = {}) {
            const ctx = tasksFetchCtxRef.current;
            const asgType = String(ctx.effectiveFilterAssigneeType ?? "").trim();
            const asgId = String(ctx.filterAssigneeId ?? "").trim();
            const pageNum = Math.max(1, Number(pageNumber) || 1);

            const requestKey = `${ctx.status}|${ctx.type}|${pageNum}|${ctx.limit}|${append ? "a" : "r"}|${asgType}|${asgId}`;
            if (!force) {
                if (lastRequestKeyRef.current === requestKey) return;
                if (tasksFetchInFlightKeyRef.current === requestKey) return;
            }
            lastRequestKeyRef.current = requestKey;
            tasksFetchInFlightKeyRef.current = requestKey;

            tasksAbortRef.current?.abort();
            const ac = new AbortController();
            tasksAbortRef.current = ac;

            if (append) isLoadingMoreRef.current = true;
            else if (!silent) setLoading(true);
            try {
                const req = {
                    status: ctx.status,
                    type: ctx.type,
                    page: pageNum,
                    limit: ctx.limit,
                    signal: ac.signal,
                };
                if (asgType) req.assignee_type = asgType;
                if (asgId) req.assignee_id = asgId;
                const res = await apiTasks.getPage(req);
                const { items, pagination: p, countByStatus: statusCounts } =
                    normalizeListResponse(res);
                setCountByStatus(statusCounts ?? {});
                setRows((prev) => {
                    if (!append) return items;
                    const map = new Map();
                    for (const r of prev) map.set(String(r?.id), r);
                    for (const r of items) map.set(String(r?.id), r);
                    return Array.from(map.values());
                });
                setTotal(
                    Number(
                        res?.data?.total ??
                            res?.data?.data?.total ??
                            p?.total ??
                            0
                    ) || 0
                );
                setPagination({
                    currentPage: p.current_page ?? p.currentPage ?? pageNum,
                    totalPages:
                        p.total_pages ??
                        p.totalPages ??
                        (items.length < ctx.limit ? pageNum : pageNum + 1),
                    totalCount: p.total ?? p.total_count ?? p.totalCount ?? 0,
                    limit: p.limit ?? ctx.limit,
                });
            } catch (e) {
                if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError") {
                    return;
                }
                console.error(e);
                const msg = e?.response?.data?.message;
                ctx.toast({
                    title: "Xatolik",
                    description: Array.isArray(msg)
                        ? msg.join(". ")
                        : msg || "Vazifalarni yuklab bo'lmadi",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                     position:"top"
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
                isLoadingMoreRef.current = false;
            }
        };
    }
    const loadTasksPage = loadTasksPageRef.current;

    const refetchFirstPageImplRef = useRef(null);
    refetchFirstPageImplRef.current = ({ silent } = {}) => {
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
    };
    const refetchFirstPageRef = useRef(null);
    if (!refetchFirstPageRef.current) {
        refetchFirstPageRef.current = (opts) => refetchFirstPageImplRef.current(opts);
    }
    const refetchFirstPage = refetchFirstPageRef.current;

    const closeCancelDropModal = useCallback(() => {
        if (cancelReasonSubmitting) return;
        setCancelDrop(null);
    }, [cancelReasonSubmitting]);

    const confirmCancelDrop = useCallback(
        async (reasonText) => {
            const payload = cancelDrop;
            if (!payload?.task?.id) return;
            const idStr = String(payload.task.id).trim();
            const sid = String(payload.statusApiId ?? "").trim();
            const nextOrder =
                payload.targetIndex != null &&
                Number.isFinite(Number(payload.targetIndex))
                    ? Number(payload.targetIndex) + 1
                    : 1;
            setCancelReasonSubmitting(true);
            try {
                const details = mergeDetailsWithCancelledReason(
                    payload.task,
                    reasonText
                );
                await apiTasks.update(idStr, { details });
                await apiTasks.updateStatus(idStr, {
                    status_id: sid,
                    order: nextOrder,
                });
                toast({
                    title: "Yangilandi",
                    description: "Vazifa bekor qilindi",
                    status: "success",
                    duration: 2500,
                    isClosable: true,
                     position:"top"
                });
                setCancelDrop(null);
                refetchFirstPage({ silent: true });
            } catch (e) {
                console.error(e);
                const msg = e?.response?.data?.message;
                toast({
                    title: "Xatolik",
                    description: Array.isArray(msg)
                        ? msg.join(". ")
                        : msg || "Yangilab bo'lmadi",
                    status: "error",
                    duration: 6000,
                    isClosable: true,
                     position:"top"
                });
            } finally {
                setCancelReasonSubmitting(false);
            }
        },
        [cancelDrop, refetchFirstPage, toast]
    );

    useEffect(() => {
        const onSocketTasksInvalidate = () => {
            refetchFirstPageImplRef.current?.({ silent: true });
        };
        window.addEventListener(
            ADMIN_TASKS_BOARD_INVALIDATE_EVENT,
            onSocketTasksInvalidate
        );
        return () => {
            window.removeEventListener(
                ADMIN_TASKS_BOARD_INVALIDATE_EVENT,
                onSocketTasksInvalidate
            );
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setStatusesLoading(true);
            try {
                const res = await apiTaskStatuses.getByTaskType(type);
                const raw = normalizeTaskStatusesResponse(res);
                const cols = buildKanbanColumns(raw);
                if (!cancelled) setKanbanColumns(cols);
            } catch (e) {
                console.error(e);
                if (!cancelled) {
                    setKanbanColumns([]);
                    toast({
                        title: "Statuslar",
                        description:
                            "Ushbu tur uchun statuslarni yuklab bo‘lmadi",
                        status: "error",
                        duration: 4000,
                        isClosable: true,
                         position:"top"
                    });
                }
            } finally {
                if (!cancelled) setStatusesLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [type, toast, statusListTick]);

    const createModalInitialType = useMemo(
        () =>
            TASK_CREATABLE_TYPES.includes(type) ? type : "notification",
        [type]
    );

    const suggestedStatusOrder = useMemo(() => {
        if (kanbanColumns.length === 0) return 1;
        const maxO = Math.max(
            ...kanbanColumns.map((c) => Number(c.order) || 0)
        );
        return maxO + 1;
    }, [kanbanColumns]);

    const useBoardHorizontalScroll = kanbanColumns.length > 4;
    const boardScrollRef = useRef(null);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const flushPersistScroll = useCallback(() => {
        if (typeof window === "undefined") return;
        if (restoreInProgressRef.current) return;
        const vertical = snapshotVerticalScrollToRef(
            lastGoodVerticalScrollRef,
            mainScrollRef
        );
        const f = persistBoardFiltersRef.current;
        writeAdminTasksBoardScrollSession(scrollSessionKey, {
            filterSig: filterSigRef.current,
            persistedType: f.type,
            persistedFilterCompanyRegion: "",
            persistedFilterAssigneeType: f.filterAssigneeType,
            persistedFilterAssigneeId: f.filterAssigneeId,
            ...(vertical ??
                verticalSnapshotForSessionWrite(
                    lastGoodVerticalScrollRef,
                    mainScrollRef
                )),
            boardScrollLeft: boardScrollRef.current?.scrollLeft ?? 0,
            maxLoadedPage: pageRef.current,
            anchorTaskId: getViewportBrokerTaskAnchorId(),
        });
    }, [scrollSessionKey]);

    const schedulePersistScroll = useCallback(() => {
        if (scrollPersistTimerRef.current != null) return;
        scrollPersistTimerRef.current = window.setTimeout(() => {
            scrollPersistTimerRef.current = null;
            flushPersistScroll();
        }, 200);
    }, [flushPersistScroll]);

    const emptyStateBg = useColorModeValue("gray.50", "whiteAlpha.50");
    const emptyStateBorder = useColorModeValue("gray.200", "whiteAlpha.200");
    const emptyStateIconBg = useColorModeValue("blue.50", "whiteAlpha.100");
    const subtleText = useColorModeValue("gray.600", "gray.400");
    const scrollArrowBg = useColorModeValue("white", "gray.800");
    const scrollArrowBorder = useColorModeValue("gray.200", "whiteAlpha.200");

    const updateBoardScrollState = useCallback(() => {
        const el = boardScrollRef.current;
        if (!el) {
            setCanScrollRight(false);
            return;
        }
        const max = el.scrollWidth - el.clientWidth;
        setCanScrollRight(max > 4 && el.scrollLeft < max - 4);
        schedulePersistScroll();
    }, [schedulePersistScroll]);

    useEffect(() => {
        updateBoardScrollState();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, useBoardHorizontalScroll, kanbanColumns.length]);

    useEffect(() => {
        const el = mainScrollRef.current;
        if (!el) return;
        const onScroll = () => {
            snapshotVerticalScrollToRef(lastGoodVerticalScrollRef, mainScrollRef);
            schedulePersistScroll();
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, [schedulePersistScroll]);

    useEffect(() => {
        const onHidden = () => {
            if (typeof document === "undefined" || document.visibilityState !== "hidden") return;
            if (scrollPersistTimerRef.current != null) {
                clearTimeout(scrollPersistTimerRef.current);
                scrollPersistTimerRef.current = null;
            }
            const settled = restoredSigRef.current === filterSigRef.current;
            if (
                pageRef.current > 1 ||
                (settled && sessionHydratedRef.current)
            ) {
                const f = persistBoardFiltersRef.current;
                writeAdminTasksBoardScrollSession(scrollSessionKey, {
                    filterSig: filterSigRef.current,
                    persistedType: f.type,
                    persistedFilterCompanyRegion: "",
                    persistedFilterAssigneeType: f.filterAssigneeType,
                    persistedFilterAssigneeId: f.filterAssigneeId,
                    ...verticalSnapshotForSessionWrite(lastGoodVerticalScrollRef, mainScrollRef),
                    boardScrollLeft: boardScrollRef.current?.scrollLeft ?? 0,
                    maxLoadedPage: pageRef.current,
                    anchorTaskId: getViewportBrokerTaskAnchorId(),
                });
            }
        };
        document.addEventListener("visibilitychange", onHidden);
        return () => {
            document.removeEventListener("visibilitychange", onHidden);
            if (scrollPersistTimerRef.current != null) {
                clearTimeout(scrollPersistTimerRef.current);
                scrollPersistTimerRef.current = null;
            }
            const settled = restoredSigRef.current === filterSigRef.current;
            if (
                pageRef.current > 1 ||
                (settled && sessionHydratedRef.current)
            ) {
                const f = persistBoardFiltersRef.current;
                writeAdminTasksBoardScrollSession(scrollSessionKey, {
                    filterSig: filterSigRef.current,
                    persistedType: f.type,
                    persistedFilterCompanyRegion: "",
                    persistedFilterAssigneeType: f.filterAssigneeType,
                    persistedFilterAssigneeId: f.filterAssigneeId,
                    ...verticalSnapshotForSessionWrite(lastGoodVerticalScrollRef, mainScrollRef),
                    boardScrollLeft: boardScrollRef.current?.scrollLeft ?? 0,
                    maxLoadedPage: pageRef.current,
                    anchorTaskId: getViewportBrokerTaskAnchorId(),
                });
            }
        };
    }, [scrollSessionKey]);

    /** `page===1` da restore tugamaguncha flush qilmaslik — session `maxLoadedPage` ni 1 bilan ustidan yozmaslik */
    useEffect(() => {
        if (restoreInProgressRef.current) return;
        if (!sessionHydratedRef.current && page <= 1) return;
        flushPersistScroll();
    }, [page, filterSig, flushPersistScroll]);

    const handleCreatedTask = useCallback(() => {
        refetchFirstPage({ silent: true });
    }, [refetchFirstPage]);

    const openEditStatus = useCallback(
        (col) => {
            setActiveStatusColumn(col);
            onEditStatusOpen();
        },
        [onEditStatusOpen]
    );

    const openDeleteStatus = useCallback(
        (col) => {
            setStatusDeleteTarget(col);
            onDelStatusOpen();
        },
        [onDelStatusOpen]
    );

    const handleStatusUpdated = useCallback(() => {
        setStatusListTick((n) => n + 1);
        refetchFirstPage({ silent: true });
    }, [refetchFirstPage]);

    const handleConfirmDeleteStatus = useCallback(async () => {
        const id = statusDeleteTarget?.id;
        if (!id) return;
        setStatusDeleting(true);
        try {
            await apiTaskStatuses.remove(id);
            toast({
                title: "O‘chirildi",
                description: "Status olib tashlandi",
                status: "success",
                duration: 2500,
                isClosable: true,
                 position:"top"
            });
            onDelStatusClose();
            setStatusDeleteTarget(null);
            setStatusListTick((n) => n + 1);
            refetchFirstPage({ silent: true });
        } catch (e) {
            console.error(e);
            const msg = e?.response?.data?.message;
            toast({
                title: "Xatolik",
                description: Array.isArray(msg)
                    ? msg.join(". ")
                    : msg || "Statusni o‘chirib bo‘lmadi",
                status: "error",
                duration: 6000,
                isClosable: true,
                 position:"top"
            });
        } finally {
            setStatusDeleting(false);
        }
    }, [
        statusDeleteTarget?.id,
        onDelStatusClose,
        refetchFirstPage,
        toast,
    ]);

    const openEdit = useCallback(
        (row) => {
            setActiveTask(row);
            onEditOpen();
        },
        [onEditOpen]
    );

    const openDelete = useCallback(
        (row) => {
            setActiveTask(row);
            onDelOpen();
        },
        [onDelOpen]
    );

    const handleSaveEdit = useCallback(
        async (payload) => {
            if (!activeTask?.id) return;
            setSaving(true);
            try {
                const rest = { ...payload };
                delete rest.status;
                delete rest.status_id;
                if (Object.keys(rest).length > 0) {
                    await apiTasks.update(activeTask.id, rest);
                }
                toast({
                    title: "Saqlandi",
                    description: "Vazifa yangilandi",
                    status: "success",
                    duration: 2500,
                    isClosable: true,
                     position:"top"
                });
                onEditClose();
                setActiveTask(null);
                refetchFirstPage({ silent: true });
            } catch (e) {
                console.error(e);
                const msg = e?.response?.data?.message;
                toast({
                    title: "Xatolik",
                    description: Array.isArray(msg)
                        ? msg.join(". ")
                        : msg || "Yangilab bo'lmadi",
                    status: "error",
                    duration: 6000,
                    isClosable: true,
                     position:"top"
                });
            } finally {
                setSaving(false);
            }
        },
        [activeTask?.id, onEditClose, refetchFirstPage, toast]
    );

    const handleConfirmDelete = useCallback(async () => {
        if (!activeTask?.id) return;
        setDeleting(true);
        try {
            await apiTasks.remove(activeTask.id);
            toast({
                title: "O‘chirildi",
                description: "Vazifa o‘chirildi",
                status: "success",
                duration: 2500,
                isClosable: true,
                 position:"top"
            });
            onDelClose();
            setActiveTask(null);
            refetchFirstPage({ silent: true });
        } catch (e) {
            console.error(e);
            const msg = e?.response?.data?.message;
            toast({
                title: "Xatolik",
                description: Array.isArray(msg)
                    ? msg.join(". ")
                    : msg || "O‘chirib bo'lmadi",
                status: "error",
                duration: 6000,
                isClosable: true,
                 position:"top"
            });
        } finally {
            setDeleting(false);
        }
    }, [activeTask?.id, onDelClose, refetchFirstPage, toast]);

    useEffect(() => {
        tasksFilterFetchGenRef.current += 1;
        sessionHydratedRef.current = false;
        restoredSigRef.current = "";
        setRows([]);
        setCountByStatus({});
        lastRequestKeyRef.current = "";
        tasksFetchInFlightKeyRef.current = null;
        skipPageEffectFetchRef.current = true;
        setPage(1);

        loadTasksPage({ pageNumber: 1, append: false, silent: false, force: false });

        return () => {
            tasksFilterFetchGenRef.current += 1;
            tasksAbortRef.current?.abort();
            lastRequestKeyRef.current = "";
            tasksFetchInFlightKeyRef.current = null;
        };
    }, [filterSig, limit]);

    useEffect(() => {
        if (page <= 1) return;
        if (skipPageEffectFetchRef.current) {
            skipPageEffectFetchRef.current = false;
            return;
        }
        if (restoreInProgressRef.current) return;
        if (!sessionHydratedRef.current) return;
        loadTasksPage({ pageNumber: page, append: true });
    }, [page]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (loading || statusesLoading) return;
        if (rowsRef.current.length === 0) return;
        if (restoreInProgressRef.current) return;
        if (restoredSigRef.current === filterSig) return;

        const saved = readAdminTasksBoardScrollSession(scrollSessionKey);
        if (!saved || String(saved.filterSig ?? "") !== filterSig) {
            restoredSigRef.current = filterSig;
            sessionHydratedRef.current = true;
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
                    updateBoardScrollState();
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
                    flushPersistScroll();
                });
            });
            return () => {
                verticalScrollCancel?.();
                anchorCancel?.();
            };
        }

        let cancelled = false;
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
                        if (!cancelled) flushPersistScroll();
                    });
                });
            } catch (e) {
                console.error(e);
                restoreInProgressRef.current = false;
                sessionHydratedRef.current = true;
                if (!cancelled) restoredSigRef.current = filterSig;
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
        scrollSessionKey,
        updateBoardScrollState,
        flushPersistScroll,
    ]);

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
                const first = entries[0];
                if (!first?.isIntersecting) return;
                if (loading) return;
                if (!hasMore) return;
                if (isLoadingMoreRef.current) return;
                if (restoreInProgressRef.current) return;
                if (!sessionHydratedRef.current) return;
                setPage((p) => p + 1);
            },
            { root: null, rootMargin: "300px 0px", threshold: 0.01 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [hasMore, loading]);

    const columnByKey = useMemo(() => {
        const map = new Map();
        for (const col of kanbanColumns) {
            map.set(col.key, col);
        }
        return map;
    }, [kanbanColumns]);

    const insertBorderCol = useColorModeValue("gray.300", "whiteAlpha.300");
    const insertBg = useColorModeValue("white", "whiteAlpha.50");
    const insertTitleCol = useColorModeValue("gray.600", "gray.400");
    const insertSubCol = useColorModeValue("gray.500", "gray.500");

    const grouped = useMemo(() => {
        const acc = {};
        for (const c of kanbanColumns) acc[c.key] = [];

        for (const r of rows) {
            const col =
                kanbanColumns.find((c) => taskBelongsInColumn(r, c)) ??
                kanbanColumns[0];
            const k = col?.key;
            if (k) {
                if (!acc[k]) acc[k] = [];
                acc[k].push(r);
            }
        }

        for (const k of Object.keys(acc)) {
            acc[k] = (acc[k] ?? []).slice().sort((a, b) => {
            // honor explicit order first (per-column)
            const aOrd = a?.order;
            const bOrd = b?.order;
            const an = Number.isFinite(Number(aOrd)) ? Number(aOrd) : null;
            const bn = Number.isFinite(Number(bOrd)) ? Number(bOrd) : null;
            if (an != null && bn != null && an !== bn) return an - bn;
            if (an != null && bn == null) return -1;
            if (an == null && bn != null) return 1;

            const ap = priorityRank(a);
            const bp = priorityRank(b);
            if (ap !== bp) return bp - ap;
            // tie-breaker: due_date yaqinroq bo'lsa yuqoriroq
            const ad = a?.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
            const bd = b?.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
            if (Number.isFinite(ad) && Number.isFinite(bd) && ad !== bd) return ad - bd;
            // oxiri: yangiroq yuqoriroq
            const ac = a?.createdAt ?? a?.created_at ?? "";
            const bc = b?.createdAt ?? b?.created_at ?? "";
            const at = ac ? new Date(ac).getTime() : 0;
            const bt = bc ? new Date(bc).getTime() : 0;
            return bt - at;
            });
        }
        return acc;
    }, [rows, kanbanColumns]);

    const handleDropTask = useCallback(
        async (taskId, statusApiId, statusName, targetIndex = null) => {
            const idStr = String(taskId ?? "").trim();
            if (!idStr) return;
            const sid = String(statusApiId ?? "").trim();
            const task = rows.find((r) => String(r?.id ?? "").trim() === idStr);
            if (!task) return;
            const hasValidStatusId = !!sid && UUID_RE.test(sid);

            const prevSid = String(
                task?.status_id ?? task?.task_status_id ?? ""
            ).trim();
            const movingAcross = hasValidStatusId && Boolean(prevSid && prevSid !== sid);

            const label = String(statusName ?? "").trim() || sid;

            const nextOrder =
                targetIndex != null && Number.isFinite(Number(targetIndex))
                    ? Number(targetIndex) + 1
                    : null;

            const currentOrder = Number.isFinite(Number(task?.order))
                ? Number(task.order)
                : null;
            if (!movingAcross && nextOrder != null && currentOrder != null && nextOrder === currentOrder) {
                return;
            }

            setRows((prev) =>
                prev.map((r) =>
                    String(r?.id ?? "").trim() === idStr
                        ? {
                              ...r,
                              ...(movingAcross ? { status: label, status_id: sid } : null),
                              ...(nextOrder != null ? { order: nextOrder } : null),
                          }
                        : r
                )
            );
            if (movingAcross) {
                setCountByStatus((prev) => shiftCountByStatus(prev, prevSid, sid));
            }

            try {
                if (movingAcross) {
                    // API: PUT /tasks/{id}/status accepts { status_id, order }
                    await apiTasks.updateStatus(idStr, {
                        status_id: sid,
                        order: nextOrder != null ? nextOrder : 1,
                    });
                } else if (nextOrder != null) {
                    // same status -> only order change
                    await apiTasks.updateOrder(idStr, { order: nextOrder });
                }
                toast({
                    title: "Yangilandi",
                    description:
                        nextOrder != null
                            ? `Status: ${label} • Order: ${nextOrder}`
                            : `Status: ${label}`,
                    status: "success",
                    duration: 2000,
                    isClosable: true,
                     position:"top"
                });
            } catch (e) {
                console.error(e);
                const msg = e?.response?.data?.message;
                toast({
                    title: "Xatolik",
                    description: Array.isArray(msg)
                        ? msg.join(". ")
                        : msg || "Yangilab bo'lmadi",
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                     position:"top"
                });
                refetchFirstPage();
            }
        },
        [refetchFirstPage, rows, toast]
    );

    const handleDragEnd = useCallback(
        (result) => {
            const { source, destination } = result;
            if (!destination) return;
            if (
                source.droppableId === destination.droppableId &&
                source.index === destination.index
            ) {
                return;
            }

            const sourceList = grouped[source.droppableId] ?? [];
            const movedTask = sourceList[source.index];
            if (!movedTask) return;

            const targetColumn = columnByKey.get(destination.droppableId);
            if (!targetColumn) return;

            const sourceColumn = columnByKey.get(source.droppableId);
            const idStr = String(movedTask?.id ?? "").trim();
            const sid = String(targetColumn?.id ?? "").trim();
            const prevSid = String(
                movedTask?.status_id ?? movedTask?.task_status_id ?? ""
            ).trim();
            const hasValidStatusId = !!sid && UUID_RE.test(sid);
            const movingAcross =
                hasValidStatusId && Boolean(prevSid && prevSid !== sid);

            if (
                movingAcross &&
                isCancelledKanbanColumn(targetColumn) &&
                sourceColumn &&
                !isCancelledKanbanColumn(sourceColumn)
            ) {
                setCancelDrop({
                    task: movedTask,
                    statusApiId: sid,
                    statusName: targetColumn.dropValue,
                    targetIndex: destination.index,
                });
                return;
            }

            handleDropTask(
                movedTask.id,
                targetColumn.id,
                targetColumn.dropValue,
                destination.index
            );
        },
        [columnByKey, grouped, handleDropTask]
    );

    const typeTabIndex = Math.max(
        0,
        TASK_TYPE_TABS_MULTI.findIndex((t) => t.key === type)
    );

    return (
        <Box
            ref={mainScrollRef}
            h="100vh"
            overflowY="auto"
            pr="20px"
            pb="20px"
            pt="20px"
        >
            <Flex justify="space-between" align="center" mb={4} gap={4} wrap="wrap">
                <HStack spacing={3} flexWrap="wrap">
                    <Heading size="lg">{pageHeading}</Heading>
                </HStack>
                <VStack align="stretch" spacing={2}>
                    <Button
                        colorScheme="blue"
                        leftIcon={<Icon as={Plus} boxSize={5} />}
                        borderRadius="xl"
                        size="md"
                        onClick={onCreateOpen}
                        boxShadow="sm"
                    >
                        Vazifa yaratish
                    </Button>
                    <Button
                        variant="outline"
                        colorScheme="blue"
                        size="sm"
                        leftIcon={<Icon as={ListPlus} boxSize={4} />}
                        borderRadius="lg"
                        onClick={onCreateStatusOpen}
                    >
                        Status yaratish
                    </Button>
                </VStack>
            </Flex>

            <Flex mb="14px" align="center" gap={3} flexWrap="wrap">
                <Tabs
                    variant="solid-rounded"
                    colorScheme="blue"
                    index={typeTabIndex}
                    onChange={(i) => {
                        const next = TASK_TYPE_TABS_MULTI[i]?.key;
                        if (next) setType(next);
                    }}
                >
                    <TabList flexWrap="wrap" rowGap={2}>
                        {TASK_TYPE_TABS_MULTI.map((t) => (
                            <Tab key={t.key}>
                                <HStack spacing={2}>
                                    <Icon as={t.icon} boxSize={4} />
                                    <Text>{t.label}</Text>
                                </HStack>
                            </Tab>
                        ))}
                    </TabList>
                </Tabs>
            </Flex>

            <Flex
                direction="column"
                gap={3}
                mb={5}
                pb={4}
                borderBottomWidth="1px"
                borderBottomColor={filterDivider}
            >
                <Flex
                    wrap="wrap"
                    gap={3}
                    align="flex-end"
                    rowGap={4}
                >
                    {!fixedAssigneeFilterRole ? (
                        <FormControl
                            flex="1"
                            minW={{ base: "100%", sm: "200px" }}
                            maxW={{ md: "240px" }}
                        >
                            <FormLabel
                                fontSize="sm"
                                mb={1.5}
                                fontWeight="semibold"
                                color={filterLabelColor}
                            >
                                Bajaruvchi turi
                            </FormLabel>
                            <Select
                                value={filterAssigneeType}
                                onChange={(e) =>
                                    setFilterAssigneeType(e.target.value)
                                }
                                {...filterFieldProps}
                                iconColor="textSub"
                            >
                                <option value="">Barchasi</option>
                                {assigneeRoleFilterOptions.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>
                    ) : null}
                    <FormControl
                        flex="1"
                        minW={{ base: "100%", sm: "240px" }}
                        maxW={{ md: "320px" }}
                    >
                        <FormLabel
                            fontSize="sm"
                            mb={1.5}
                            fontWeight="semibold"
                            color={filterLabelColor}
                        >
                            Bajaruvchi
                        </FormLabel>
                        <Select
                            value={filterAssigneeId}
                            onChange={(e) =>
                                setFilterAssigneeId(e.target.value)
                            }
                            isDisabled={
                                !effectiveFilterAssigneeType || assigneeFilterLoading
                            }
                            {...filterFieldProps}
                            iconColor="textSub"
                            _disabled={{
                                opacity: 0.65,
                                cursor: "not-allowed",
                            }}
                        >
                            <option value="">Barchasi</option>
                            {assigneeFilterList.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.full_name ||
                                        u.username ||
                                        u.phone ||
                                        u.id}
                                </option>
                            ))}
                        </Select>
                    </FormControl>

                    <Badge
                        colorScheme="blue"
                        px={3}
                        py={1}
                        borderRadius="full"
                        fontSize="sm"
                        fontWeight="semibold"
                        flexShrink={0}
                        alignSelf="flex-end"
                        ml="auto"
                    >
                        {loading ? (
                            <Flex align="center" gap={1}>
                                <AppSpinner size="sm" /> <span>Yuklanmoqda...</span>
                            </Flex>
                        ) : (
                            `Jami: ${total} ta vazifa`
                        )}
                    </Badge>
                </Flex>
                {effectiveFilterAssigneeType && assigneeListTotalPages > 1 ? (
                    <PaginationBar
                        mt={0}
                        page={assigneeListPage}
                        totalPages={assigneeListTotalPages}
                        loading={assigneeFilterLoading}
                        onPageChange={(p) => setAssigneeListPage(p)}
                    />
                ) : null}
            </Flex>

            {loading || statusesLoading ? (
                <Center py={16}>
                    <AppSpinner size="xl" />
                </Center>
            ) : kanbanColumns.length === 0 ? (
                <Box
                    borderRadius="2xl"
                    borderWidth="1px"
                    borderColor={emptyStateBorder}
                    bg={emptyStateBg}
                    px={{ base: 6, md: 10 }}
                    py={{ base: 10, md: 14 }}
                >
                    <VStack spacing={5} textAlign="center" maxW="420px" mx="auto">
                        <Center
                            w="72px"
                            h="72px"
                            borderRadius="2xl"
                            bg={emptyStateIconBg}
                        >
                            <Icon as={LayoutGrid} boxSize={9} color="blue.500" />
                        </Center>
                        <VStack spacing={2}>
                            <Text fontWeight="bold" fontSize="lg">
                                Status ustunlari yo‘q
                            </Text>
                            <Text fontSize="sm" color="gray.500" lineHeight="tall">
                                «{TASK_TYPE_TAB_DEFS.find((t) => t.key === type)?.label ?? type}» turida
                                hali statuslar qo‘shilmagan.
                            </Text>
                        </VStack>

                    </VStack>
                </Box>
            ) : (
                <Box position="relative">
                <Box
                    ref={boardScrollRef}
                    overflowX={useBoardHorizontalScroll ? "auto" : "visible"}
                    overflowY="hidden"
                    pb={2}
                    w="100%"
                    sx={
                        useBoardHorizontalScroll
                            ? {
                                  scrollbarGutter: "stable",
                              }
                            : undefined
                    }
                    onScroll={updateBoardScrollState}
                    onWheel={(e) => {
                        // Keep vertical page scrolling working (pagination/sentinel),
                        // but allow intentional horizontal scrolling with Shift+wheel.
                        if (!useBoardHorizontalScroll) return;
                        if (!e.shiftKey) return;
                        const el = boardScrollRef.current;
                        if (!el) return;
                        e.preventDefault();
                        el.scrollLeft += e.deltaY;
                    }}
                >
                    <Flex
                        gap={4}
                        align="stretch"
                        // For non-company: fill available width when <= 4 columns (no empty gaps).
                        // When > 4 columns, board scrolls horizontally with fixed column widths.
                        justify="flex-start"
                        minW={useBoardHorizontalScroll ? "min-content" : undefined}
                        w={useBoardHorizontalScroll ? undefined : "100%"}
                        pb={1}
                    >
                      <DragDropContext onDragEnd={handleDragEnd}>
    {kanbanColumns.map((col) => {
        const colCount = getStatusColumnCount(
            countByStatus,
            col.id,
            grouped[col.key]?.length ?? 0
        );
        const canStatusActions = canEditOrDeleteTaskStatus(type, col);
        const list = grouped[col.key] ?? [];
        const colLayout = defaultKanbanColumnLayout(useBoardHorizontalScroll);

        return (
            <Droppable droppableId={col.key} key={col.key}>
                {(provided, snapshot) => (
                    <Box
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        flex={colLayout.flex}
                        minW={colLayout.minW}
                        maxW={colLayout.maxW}
                        w={colLayout.w}
                        display="flex"
                        overflow="hidden"
                    >
                        <KanbanColumn
                            statusKey={col.dropValue}
                            statusApiId={col.id}
                            title={col.name || "—"}
                            colorScheme={col.colorScheme}
                            badgeHexBg={
                                /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(col.color)
                                    ? col.color
                                    : undefined
                            }
                            count={colCount}
                            isActiveDrop={snapshot.isDraggingOver}
                            showColumnActions={canStatusActions}
                            onEditColumn={() => openEditStatus(col)}
                            onDeleteColumn={() => openDeleteStatus(col)}
                            uniformTaskSpacing
                        >
                            {list.map((row, i) => {
                                const id = String(row?.id ?? "").trim();
                                return (
                                    <Draggable
                                        draggableId={id}
                                        index={i}
                                        key={id}
                                    >
                                        {(provided, snapshot) => (
                                            <Box
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                data-broker-task-id={id || undefined}
                                                // Карточка всегда занимает 100% ширины колонки
                                                w="100%"
                                                minH={{ base: "156px", md: "156px" }}
                                                style={{
                                                    ...provided.draggableProps.style,
                                                    // При drag — берём ширину из draggable style,
                                                    // но НЕ перезаписываем width: "100%",
                                                    // иначе карточка «улетает» в полную ширину экрана
                                                    width: snapshot.isDragging
                                                        ? provided.draggableProps.style?.width
                                                        : "100%",
                                                    maxWidth: "100%",
                                                    boxSizing: "border-box",
                                                }}
                                                opacity={snapshot.isDragging ? 0.85 : 1}
                                                transition="opacity 0.2s ease"
                                            >
                                                <TaskCard
                                                    row={row}
                                                    onRequestEdit={openEdit}
                                                    onRequestDelete={openDelete}
                                                    hideAssign
                                                    density={colCount > 0 && colCount <= 2 ? "sparse" : "default"}
                                                />
                                            </Box>
                                        )}
                                    </Draggable>
                                );
                            })}
                            {provided.placeholder}
                        </KanbanColumn>
                    </Box>
                )}
            </Droppable>
        );
    })}
</DragDropContext>
                    </Flex>
                </Box>

                {/* (moved) company scroll arrow now lives near filters */}
                </Box>
            )}
            <Box ref={sentinelRef} h="1px" />
            {hasMore ? (
                <Center py={6}>
                    <HStack spacing={2} color={subtleText}>
                        <AppSpinner size="sm" />
                        <Text fontSize="sm">Yuklanmoqda...</Text>
                    </HStack>
                </Center>
            ) : null}

            <CreateTaskModal
                isOpen={isCreateOpen}
                onClose={onCreateClose}
                onCreated={handleCreatedTask}
                initialTaskTypeFromParent={createModalInitialType}
                allowedTaskTypes={TASK_CREATABLE_TYPES}
            />

            <CreateTaskStatusModal
                isOpen={isCreateStatusOpen}
                onClose={onCreateStatusClose}
                defaultTaskType={type}
                suggestedOrder={suggestedStatusOrder}
                onCreated={() => setStatusListTick((n) => n + 1)}
            />

            <EditTaskStatusModal
                isOpen={isEditStatusOpen}
                onClose={() => {
                    onEditStatusClose();
                    setActiveStatusColumn(null);
                }}
                column={activeStatusColumn}
                onUpdated={handleStatusUpdated}
            />

            <EditTaskModal
                isOpen={isEditOpen}
                onClose={() => {
                    onEditClose();
                    setActiveTask(null);
                }}
                task={activeTask}
                onSave={handleSaveEdit}
                isSaving={saving}
            />

            <CancelTaskDropModal
                isOpen={Boolean(cancelDrop)}
                onClose={closeCancelDropModal}
                taskTitle={cancelDrop ? pickTaskLabelForCancelModal(cancelDrop.task) : ""}
                existingNote={
                    cancelDrop ? pickDetailsNoteFromTask(cancelDrop.task) : ""
                }
                onConfirm={confirmCancelDrop}
                isSubmitting={cancelReasonSubmitting}
            />


            <ConfirmDelModal
                isOpen={isDelOpen}
                onClose={() => {
                    onDelClose();
                    setActiveTask(null);
                }}
                onConfirm={handleConfirmDelete}
                itemName={
                    activeTask?.details?.product_name ??
                    activeTask?.product_name ??
                    String(activeTask?.id ?? "")
                }
                loading={deleting}
                typeItem="vazifa"
            />

            <ConfirmDelModal
                isOpen={isDelStatusOpen}
                onClose={() => {
                    onDelStatusClose();
                    setStatusDeleteTarget(null);
                }}
                onConfirm={handleConfirmDeleteStatus}
                itemName={statusDeleteTarget?.name ?? ""}
                loading={statusDeleting}
                typeItem="status"
            />

        </Box>
    );
}

export default function ADtasks() {
    return <AdminTaskKanbanPage />;
}