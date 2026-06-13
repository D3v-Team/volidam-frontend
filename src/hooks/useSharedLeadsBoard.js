  import { useEffect, useState, useCallback, useRef } from "react";
  import { $api } from "../Services/parametres/axios";
  import { apiLids } from "../Services/api/Lids";
  import { useAuthStore } from "../store/authStore";

  const DEFAULT_STATUS_BY_ROLE = {
    admin: "keladi",
    operator: "keldi",
  };

  const PAGE_SIZE = 10;

  export function useSharedLeadsBoard({
    dayType,
    statusFilter,
    search,
    assignedId,
    role,
  }) {
    const user = useAuthStore((s) => s.user);

    const [parentStatuses, setParentStatuses] = useState([]);
    const [parentLoading, setParentLoading] = useState(false);

    // Har bir status_id uchun alohida pagination holati
    // { [status_id]: { lids: [], total: 0, page: 1, hasMore: false, loading: false } }
    const [columnStates, setColumnStates] = useState({});

    const isLoadingRef = useRef({}); // { [status_id]: bool }
    const abortRef = useRef(null);

    // ── 1. Parent statuslar ──
    useEffect(() => {
      setParentLoading(true);
      $api
        .get("/lid-statuses")
        .then((res) => {
          const raw = res.data?.data ?? res.data ?? {};
          const list = Array.isArray(raw)
            ? raw
            : raw?.records ?? raw?.items ?? raw?.statuses ?? [];
          setParentStatuses(list);
        })
        .catch(() => setParentStatuses([]))
        .finally(() => setParentLoading(false));
    }, []);

    // ── Filter o'zgarganda barcha columnlarni reset ──
    useEffect(() => {
      setColumnStates({});
      isLoadingRef.current = {};
    }, [statusFilter, dayType, search, assignedId]);

    // ── 2. Birinchi page — barcha columnlarni birga yuklash ──
    const fetchFirstPage = useCallback(() => {
      const token = {};
      abortRef.current = token;

      const params = {
        type: dayType,
        page: 1,
        limit: PAGE_SIZE,
      };
      if (statusFilter) params.status_id = statusFilter;
      if (search) params.searchTerm = search;
      if (assignedId) params.assigned_id = assignedId;

      apiLids
        .filter(params)
        .then((res) => {
          if (token !== abortRef.current) return;

          const columns = res.data?.columns ?? res.data?.data ?? res.data ?? [];
          if (!Array.isArray(columns)) return;

          const newStates = {};
          columns.forEach((col) => {
            const sid = col.status_id;
            if (!sid) return;
            const lids = col.data ?? [];
            const total = col.total ?? lids.length;
            newStates[sid] = {
              lids,
              total,
              page: 1,
              hasMore: lids.length >= PAGE_SIZE && lids.length < total,
              loading: false,
              // child statuslarni ham saqlaymiz
              childStatusesByType: col.child_statuses_by_type ?? {},
              statusName: col.status_name,
              statusColor: col.status_color,
              statusOrder: col.status_order,
              isDefault: col.is_default,
            };
            isLoadingRef.current[sid] = false;
          });

          setColumnStates(newStates);
        })
        .catch(() => {
          if (token !== abortRef.current) return;
          setColumnStates({});
        });
    }, [statusFilter, dayType, search, assignedId]);

    useEffect(() => {
      fetchFirstPage();
    }, [fetchFirstPage]);

    // ── 3. Bitta column uchun keyingi page yuklash ──
    const fetchNextPageForColumn = useCallback(
      async (statusId) => {
        if (isLoadingRef.current[statusId]) return;

        const col = columnStates[statusId];
        if (!col) return;
        if (!col.hasMore) return;

        const nextPage = col.page + 1;
        isLoadingRef.current[statusId] = true;

        // Loading holatini ko'rsatamiz
        setColumnStates((prev) => ({
          ...prev,
          [statusId]: { ...prev[statusId], loading: true },
        }));

        try {
          const params = {
            status_id: statusId,
            type: dayType,
            page: nextPage,
            limit: PAGE_SIZE,
          };
          if (search) params.searchTerm = search;
          if (assignedId) params.assigned_id = assignedId;

          const res = await apiLids.filter(params);
          const columns = res.data?.columns ?? res.data?.data ?? res.data ?? [];
          const colData = Array.isArray(columns)
            ? columns.find((c) => c.status_id === statusId)
            : null;

          if (!colData) return;

          const newLids = colData.data ?? [];
          const total = colData.total ?? 0;

          setColumnStates((prev) => {
            const existing = prev[statusId];
            if (!existing) return prev;

            const existingIds = new Set(existing.lids.map((l) => l.id));
            const fresh = newLids.filter((l) => !existingIds.has(l.id));
            const merged = [...existing.lids, ...fresh];

            return {
              ...prev,
              [statusId]: {
                ...existing,
                lids: merged,
                page: nextPage,
                hasMore: merged.length < total,
                loading: false,
              },
            };
          });
        } catch {
          setColumnStates((prev) => ({
            ...prev,
            [statusId]: { ...prev[statusId], loading: false },
          }));
        } finally {
          isLoadingRef.current[statusId] = false;
        }
      },
      [columnStates, dayType, search, assignedId]
    );

    // ── Derived state ──
    // parentStatuses dan tartiblab statuses yasaymiz
    const statuses = parentStatuses
      .map((ps) => {
        const col = columnStates[ps.id];
        if (!col) return null;
        const childrenForType = col.childStatusesByType?.[dayType] ?? [];
        return {
          ...ps,
          color: ps.color ?? col.statusColor ?? "#378ADD",
          children: childrenForType,
          hasChildren: childrenForType.length > 0,
        };
      })
      .filter(Boolean);

    const lidsByStatus = {};
    const counts = {};
    Object.entries(columnStates).forEach(([sid, col]) => {
      lidsByStatus[sid] = col.lids;
      counts[sid] = col.total;
    });

    const totalLids = Object.values(counts).reduce(
      (sum, c) => sum + Number(c),
      0
    );

    const loading = parentLoading;

    // ── Child CRUD ──
    const createChildStatus = useCallback(
      async (data) => {
        await $api.post("/lid-child-statuses", {
          ...data,
          status_id: statusFilter,
          type: dayType,
        });
        fetchFirstPage();
      },
      [statusFilter, dayType, fetchFirstPage]
    );

    const updateChildStatus = useCallback(
      async (id, data) => {
        await $api.put(`/lid-child-statuses/${id}`, data);
        fetchFirstPage();
      },
      [fetchFirstPage]
    );

    const deleteChildStatus = useCallback(
      async (id) => {
        await $api.delete(`/lid-child-statuses/${id}`);
        fetchFirstPage();
      },
      [fetchFirstPage]
    );

    // ── Drag & Drop ──
    const moveLidToChildStatus = useCallback(
      async (lidId, toChildStatusId) => {
        await apiLids.updateChildStatus(lidId, toChildStatusId);
        fetchFirstPage();
      },
      [fetchFirstPage]
    );

    const getParentStatus = useCallback(
      (id) => parentStatuses.find((s) => String(s.id) === String(id)) ?? null,
      [parentStatuses]
    );

    const getNextChildOrder = useCallback(
      (parentId) => {
        const col = columnStates[parentId];
        const children =
          col?.childStatusesByType?.[dayType] ?? [];
        if (!children.length) return 1;
        return Math.max(...children.map((c) => c.order ?? 0)) + 1;
      },
      [columnStates, dayType]
    );

    const getDefaultStatusId = useCallback(() => {
      if (!parentStatuses.length) return "";
      const userRole = user?.role;
      const targetName = DEFAULT_STATUS_BY_ROLE[userRole];
      if (!targetName) return "";
      const found = parentStatuses.find(
        (s) => s.name?.toLowerCase() === targetName
      );
      return found?.id ?? "";
    }, [parentStatuses, user?.role]);

    return {
      statuses,
      parentStatuses,
      lidsByStatus,
      counts,
      columnStates,          // ← har bir column ning hasMore, loading holati
      totalLids,
      loading,
      fetchNextPageForColumn, // ← KanbanColumn scroll oxiriga yetganda chaqiradi
      getParentStatus,
      getNextChildOrder,
      getDefaultStatusId,
      moveLidToChildStatus,
      createChildStatus,
      updateChildStatus,
      deleteChildStatus,
      createStatus: async () => {},
    };
  }