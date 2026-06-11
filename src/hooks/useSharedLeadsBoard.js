import { useEffect, useState, useCallback, useRef } from "react";
import { $api } from "../Services/parametres/axios";
import { apiLids } from "../Services/api/Lids";
import { useAuthStore } from "../store/authStore";

const DEFAULT_STATUS_BY_ROLE = {
  admin: "keladi",
  operator: "keldi",
};

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
  const [childStatuses, setChildStatuses] = useState([]);
  const [lidsByStatus, setLidsByStatus] = useState({});
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);

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

  // ── 2. /lids/filter — child statuslar + lidlar ──
  const fetchBoard = useCallback(() => {
    if (!statusFilter || !parentStatuses.length) {
      setChildStatuses([]);
      setLidsByStatus({});
      setCounts({});
      return;
    }

    const token = {};
    abortRef.current = token;
    setLoading(true);

    const params = {
      status_id: statusFilter,
      type: dayType,
      page: 1,
      limit: 20,
    };
    if (search) params.searchTerm = search;
    if (assignedId) params.assigned_id = assignedId;

    apiLids
      .filter(params)
      .then((res) => {
        if (token !== abortRef.current) return;

        const raw = res.data?.data ?? res.data ?? [];
        const groups = Array.isArray(raw) ? raw : [];

        const children = groups.map((g) => ({
          ...g.child_status,
          isChild: true,
          color: g.child_status?.color ?? "#378ADD",
        }));
        setChildStatuses(children);

        const byStatus = {};
        const countMap = {};
        groups.forEach((g) => {
          const cid = g.child_status?.id;
          if (!cid) return;
          byStatus[cid] = g.lids ?? [];
          countMap[cid] = g.total_count ?? g.lids?.length ?? 0;
        });
        setLidsByStatus(byStatus);
        setCounts(countMap);
      })
      .catch(() => {
        if (token !== abortRef.current) return;
        setChildStatuses([]);
        setLidsByStatus({});
        setCounts({});
      })
      .finally(() => {
        if (token === abortRef.current) setLoading(false);
      });
  }, [statusFilter, dayType, search, assignedId, parentStatuses]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // ── Child CRUD ──
  const createChildStatus = useCallback(
    async (data) => {
      await $api.post("/lid-child-statuses", {
        ...data,
        status_id: statusFilter,
        type: dayType,
      });
      fetchBoard();
    },
    [statusFilter, dayType, fetchBoard]
  );

  const updateChildStatus = useCallback(
    async (id, data) => {
      await $api.put(`/lid-child-statuses/${id}`, data);
      fetchBoard();
    },
    [fetchBoard]
  );

  const deleteChildStatus = useCallback(
    async (id) => {
      await $api.delete(`/lid-child-statuses/${id}`);
      fetchBoard();
    },
    [fetchBoard]
  );

  // ── Drag & Drop ──
  const moveLidToChildStatus = useCallback(async (lidId, toChildStatusId) => {
    await apiLids.updateStatus(lidId, toChildStatusId);
  }, []);

  const totalLids = Object.values(counts).reduce(
    (sum, c) => sum + Number(c),
    0
  );

  const getParentStatus = useCallback(
    (id) => parentStatuses.find((s) => String(s.id) === String(id)) ?? null,
    [parentStatuses]
  );

  const getNextChildOrder = useCallback(
    (parentId) => {
      if (!childStatuses.length) return 1;
      return Math.max(...childStatuses.map((c) => c.order ?? 0)) + 1;
    },
    [childStatuses]
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

  const statuses = childStatuses.map((child) => ({
    ...child,
    isChild: true,
    color: child.color ?? "#378ADD",
  }));

  return {
    statuses,
    parentStatuses,
    lidsByStatus,
    counts,
    totalLids,
    loading: loading || parentLoading,
    getParentStatus,
    getNextChildOrder,
    getDefaultStatusId,
    moveLidToChildStatus,
    createChildStatus,
    updateChildStatus,
    deleteChildStatus,
    // eski interfeys bilan moslik
    createStatus: async () => {},
  };
}