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
      // statusFilter majburiy — bo'lmasa 500 xato qaytadi
      if (!statusFilter) return;

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

      const doFetch = (attempt = 1) => {
        apiLids
          .filter(params)
          .then((res) => {
            if (token !== abortRef.current) return;

            // Format 1: { data: [ { child_status, lids, total_count } ] } — toq/juft
            // Format 2: { data: [ { status, items, total } ] }            — oddiy
            const raw = res.data?.data ?? res.data ?? [];
            const columns = Array.isArray(raw) ? raw : [];
            if (!columns.length) { setColumnStates({}); return; }

            const newStates = {};

            // child_status formatimi yoki status formatimi aniqlash
            const isChildFormat = columns[0]?.child_status != null;

            if (isChildFormat) {
              // Toq/juft kun formati: child_status bo'yicha guruhlash
              // Barchasini bitta virtual "statusFilter" key ostiga yig'amiz,
              // lekin child_status id bo'yicha alohida saqlash uchun child_status_id ishlatamiz
              columns.forEach((col) => {
                const childStatus = col.child_status;
                if (!childStatus?.id) return;
                const cid = String(childStatus.id);
                const lids = (col.lids ?? []).map((l) => ({
                  ...l,
                  child_status_id: l.child_status_id ?? cid,
                }));
                const total = col.total_count ?? lids.length;
                newStates[cid] = {
                  lids,
                  total,
                  page: 1,
                  hasMore: col.has_next_page ?? (lids.length < total),
                  loading: false,
                  childStatus,
                  isChildColumn: true,
                };
                isLoadingRef.current[cid] = false;
              });
            } else {
              // Oddiy format: status bo'yicha guruhlash
              columns.forEach((col) => {
                const sid = col.status_id ?? col.status?.id;
                if (!sid) return;
                const lids = col.data ?? col.items ?? [];
                const total = col.total ?? col.total_count ?? lids.length;
                newStates[sid] = {
                  lids,
                  total,
                  page: 1,
                  hasMore: lids.length >= PAGE_SIZE && lids.length < total,
                  loading: false,
                  childStatusesByType: col.child_statuses_by_type ?? {},
                  statusName: col.status_name,
                  statusColor: col.status_color,
                  statusOrder: col.status_order,
                  isDefault: col.is_default,
                };
                isLoadingRef.current[sid] = false;
              });
            }

            setColumnStates(newStates);
          })
          .catch((err) => {
            if (token !== abortRef.current) return;
            // 500 xatolikda bir marta qayta urinish
            const status = err?.response?.status;
            if (attempt === 1 && status >= 500) {
              setTimeout(() => {
                if (token !== abortRef.current) return;
                doFetch(2);
              }, 800);
              return;
            }
            setColumnStates({});
          });
      };

      doFetch(1);
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
          const raw = res.data?.data ?? res.data ?? [];
          const columns = Array.isArray(raw) ? raw : [];

          // child_status formatimi aniqlash
          const isChildFormat = columns[0]?.child_status != null;

          if (isChildFormat) {
            // child_status bo'yicha — kerakli column ni child_status.id orqali topamiz
            const colData = columns.find((c) => String(c.child_status?.id) === String(statusId));
            if (!colData) return;
            const newLids = (colData.lids ?? []).map((l) => ({
              ...l,
              child_status_id: l.child_status_id ?? statusId,
            }));
            const total = colData.total_count ?? 0;

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
                  hasMore: colData.has_next_page ?? (merged.length < total),
                  loading: false,
                },
              };
            });
          } else {
            // Oddiy format
            const colData = columns.find(
              (c) => String(c.status_id ?? c.status?.id) === String(statusId)
            );
            if (!colData) return;
            const newLids = colData.data ?? colData.items ?? [];
            const total = colData.total ?? colData.total_count ?? 0;

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
          }
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
    // Child format (toq/juft) bo'lsa — child_status columnlarini chiqaramiz
    // Oddiy format bo'lsa — parentStatuses bilan match qilamiz
    const isChildFormat = Object.values(columnStates).some((c) => c.isChildColumn);

    const statuses = isChildFormat
      ? Object.entries(columnStates)
          .map(([cid, col]) => ({
            id: cid,
            name: col.childStatus?.name ?? cid,
            color: col.childStatus?.color ?? "#378ADD",
            order: col.childStatus?.order ?? 0,
            type: col.childStatus?.type,
            children: [],
            hasChildren: false,
            isChild: true,
            childData: col.childStatus,
          }))
          .sort((a, b) => a.order - b.order)
      : parentStatuses
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