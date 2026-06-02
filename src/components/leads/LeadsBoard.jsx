import {
  Box,
  Flex,
  Text,
  Button,
  HStack,
  Spinner,
  Center,
  useDisclosure,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, ListPlus } from "lucide-react";
import { getLeadDetailPath, getLeadsBasePath } from "../../utils/leadsPaths";
import { useLeadsBoard } from "../../hooks/useLeadsBoard";
import { useLeadsBoardScroll } from "../../hooks/useLeadsBoardScroll";
import useDebounce from "../../hooks/useDebounce";
import LeadsKanbanBoard from "./LeadsKanbanBoard";
import LeadFormModal from "./LeadFormModal";
import LidStatusFormModal from "./LidStatusFormModal";
import LeadsFilters from "./LeadsFilters";
import ConfirmDelModal from "../common/ConfirmDelModal";
import { toastService } from "../../utils/toast";
import { getApiErrorMessage } from "../../utils/lidStatus";
import { volidamOutlineButton, volidamPrimaryButton } from "./leadStyles";
import { apiUsers } from "../../Services/api/Users";
import { apiLids } from "../../Services/api/Lids";

export default function LeadsBoard({
  canManageStatuses = false,
  canManageColumns = false,
  canCreateLid = true,
  canDeleteLid = true,
  title = "Lidlar",
  panelLayout = false,
  scrollRoleScope = "default",
  maxVisibleColumns = 4,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const leadsBasePath = getLeadsBasePath(pathname);

  const SESSION_KEY = `leadsFilters_${scrollRoleScope}`;

  const getSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || {};
    } catch {
      return {};
    }
  };




  const [statusFilter, setStatusFilter] = useState(
    () => getSession().statusFilter || "",
  );
  const [search, setSearch] = useState(() => getSession().search || "");
  const [filterRole, setFilterRole] = useState(
    () => getSession().filterRole || "",
  );
  const [filterAssignedId, setFilterAssignedId] = useState(
    () => getSession().filterAssignedId || "",
  );
  const [filterUsers, setFilterUsers] = useState([]);
  const [filterUsersLoading, setFilterUsersLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 350);
  const debouncedAssignedId = useDebounce(filterAssignedId, 350);

  const [assignMode, setAssignMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  useEffect(() => {
    if (!filterRole) return;
    setFilterUsersLoading(true);
    apiUsers
      .getUsers(filterRole)
      .then((res) => setFilterUsers(res.data?.data ?? res.data ?? []))
      .catch(() => setFilterUsers([]))
      .finally(() => setFilterUsersLoading(false));
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          statusFilter,
          search,
          filterRole,
          filterAssignedId,
        }),
      );
    } catch {}
  }, [statusFilter, search, filterRole, filterAssignedId]);

  const {
    statuses,
    allStatuses,
    lidsByStatus,
    counts,
    totalLids,
    loading,
    loadingMore,
    hasMore,
    page,
    loadMore,
    refreshBoard,
    moveLid,
    createLid,
    deleteLid,
    createStatus,
    updateStatus,
    deleteStatus,
  } = useLeadsBoard({
    statusFilter,
    search: debouncedSearch,
    assignedId: debouncedAssignedId,
    role: filterRole,
  });

  const handleFilterRoleChange = async (role) => {
    setFilterRole(role);
    setFilterAssignedId("");
    setFilterUsers([]);
    if (!role) return;
    setFilterUsersLoading(true);
    try {
      const res = await apiUsers.getUsers(role);
      setFilterUsers(res.data?.data ?? res.data ?? []);
    } catch {
      setFilterUsers([]);
    } finally {
      setFilterUsersLoading(false);
    }
  };

  const scroll = useLeadsBoardScroll({
    roleScope: scrollRoleScope,
    statusFilter,
    search: debouncedSearch,
    ready: !loading && allStatuses.length > 0,
  });

  const [dragOverStatusId, setDragOverStatusId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFormMode, setStatusFormMode] = useState("create");
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [deleteLidTarget, setDeleteLidTarget] = useState(null);
  const [deleteStatusTarget, setDeleteStatusTarget] = useState(null);

  const createModal = useDisclosure();
  const statusFormModal = useDisclosure();

  const subtleText = useColorModeValue("gray.600", "gray.400");
  const totalAccent = useColorModeValue("brand.600", "brand.300");

  const nextStatusOrder = useMemo(() => {
    if (!allStatuses.length) return 0;
    return Math.max(...allStatuses.map((s) => s.order ?? 0)) + 1;
  }, [allStatuses]);

  useEffect(() => {
    const sentinel = scroll.sentinelRef.current;
    const rootEl = scroll.mainScrollRef.current;
    if (!sentinel) return;

    let lastIntersectingTime = 0;  // Prevent multiple triggers in quick succession

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        
        // Only respond to sentinel becoming visible
        if (!entry?.isIntersecting) return;
        
        // Guard: Skip if restoration in progress or session not hydrated
        if (
          scroll.restoreInProgressRef.current ||
          !scroll.sessionHydratedRef.current
        ) return;

        // Guard: Skip if already loading
        if (loading || loadingMore) return;

        // Guard: Skip if no more pages
        if (!hasMore) return;

        // Guard: Debounce - only allow one trigger per 500ms
        const now = Date.now();
        if (now - lastIntersectingTime < 500) return;
        lastIntersectingTime = now;

        // Call loadMore - it has additional guards
        loadMore();
      },
      {
        root: rootEl || null,
        rootMargin: "0px 0px",
        threshold: 0.01,
      },
    );
    observer.observe(sentinel);

    const shouldLoadMore = () => {
      if (loading || loadingMore || !hasMore) return false;
      if (scroll.restoreInProgressRef.current || !scroll.sessionHydratedRef.current) return false;
      if (!sentinel) return false;

      const rootRect = rootEl
        ? rootEl.getBoundingClientRect()
        : {
            top: 0,
            bottom: window.innerHeight,
          };
      const sentinelRect = sentinel.getBoundingClientRect();
      const threshold = 50;
      return sentinelRect.top <= rootRect.bottom + threshold;
    };

    const onScroll = () => {
      if (shouldLoadMore()) {
        loadMore();
      }
    };

    const targets = rootEl ? [rootEl, window] : [window];
    targets.forEach((t) => t.addEventListener("scroll", onScroll, { passive: true }));

    return () => {
      observer.disconnect();
      targets.forEach((t) => t.removeEventListener("scroll", onScroll));
    };
  }, [hasMore, loading, loadingMore, loadMore, scroll]);

  const openCreateStatus = () => {
    setStatusFormMode("create");
    setSelectedStatus(null);
    statusFormModal.onOpen();
  };

  const handleDrop = async (lidId, fromStatusId, toStatusId) => {
    setDragOverStatusId(null);
    try {
      await moveLid(lidId, fromStatusId, toStatusId);
    } catch {
      toastService.error("Status o'zgartirilmadi");
    }
  };

  const handleCreateLid = async (data) => {
    setActionLoading(true);
    try {
      await createLid(data);
      createModal.onClose();
    } catch (err) {
      toastService.error(getApiErrorMessage(err) || "Lid yaratilmadi");
    } finally {
      setActionLoading(false);
    }
  };

  const requestDeleteLid = (lid) => setDeleteLidTarget(lid);
  const confirmDeleteLid = async () => {
    if (!deleteLidTarget?.id) return;
    setActionLoading(true);
    try {
      await deleteLid(deleteLidTarget.id);
      setDeleteLidTarget(null);
    } catch (err) {
      toastService.error(getApiErrorMessage(err) || "O'chirilmadi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusSubmit = async (data) => {
    setActionLoading(true);
    try {
      if (statusFormMode === "create") {
        await createStatus(data);
        toastService.success("Status yaratildi");
      } else {
        await updateStatus(selectedStatus.id, data);
      }
      statusFormModal.onClose();
    } catch (err) {
      toastService.error(getApiErrorMessage(err) || "Status saqlanmadi");
    } finally {
      setActionLoading(false);
    }
  };

  const requestDeleteStatus = (status) => setDeleteStatusTarget(status);
  const confirmDeleteStatus = async () => {
    if (!deleteStatusTarget?.id) return;
    setActionLoading(true);
    try {
      await deleteStatus(deleteStatusTarget.id);
      setDeleteStatusTarget(null);
    } catch (err) {
      toastService.error(getApiErrorMessage(err) || "O'chirilmadi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignLeads = async (payload) => {
  await apiLids.assign(payload);

  await refreshBoard();
};

  const toolbar = (
    <Flex
      justify="space-between"
      align={{ base: "stretch", md: "center" }}
      direction={{ base: "column", md: "row" }}
      gap={3}
      mb={4}
      flexWrap="wrap"
    >
      <Box flex="1" minW={0} />
      <Flex
        direction="column"
        align={{ base: "stretch", md: "flex-end" }}
        gap={2}
      >
        <HStack
          spacing={2}
          flexWrap="wrap"
          justify={{ base: "flex-start", md: "flex-end" }}
        >
          {canManageStatuses && (
            <Button
              {...volidamOutlineButton}
              leftIcon={<ListPlus size={16} />}
              onClick={openCreateStatus}
            >
              Statuslar
            </Button>
          )}
          {canCreateLid && (
            <Button
              {...volidamPrimaryButton}
              leftIcon={<Plus size={16} />}
              onClick={createModal.onOpen}
            >
              Yangi lid
            </Button>
          )}
        </HStack>
        <Text
          color={subtleText}
          fontSize="sm"
          fontWeight="600"
          textAlign="right"
        >
          JAMI:{" "}
          <Text as="span" color={totalAccent} fontWeight="800">
            {totalLids}
          </Text>{" "}
          TA LID
        </Text>
      </Flex>
    </Flex>
  );

  const boardContent = (
    <>
      <LeadsFilters
        statuses={allStatuses}
        statusId={statusFilter}
        onStatusIdChange={setStatusFilter}
        role={filterRole}
        onRoleChange={handleFilterRoleChange}
        assignedId={filterAssignedId}
        onAssignedIdChange={setFilterAssignedId}
        users={filterUsers}
        usersLoading={filterUsersLoading}
        search={search}
        onSearchChange={setSearch}
        assignMode={assignMode}
        setAssignMode={setAssignMode}
        selectedLeadIds={selectedLeadIds}
        setSelectedLeadIds={setSelectedLeadIds}
         onAssignLeads={handleAssignLeads}
      />
      {loading && allStatuses.length === 0 ? (
        <Flex justify="center" py={20}>
          <Spinner size="lg" color="brand.500" thickness="3px" />
        </Flex>
      ) : statuses.length === 0 ? (
        <Text color="gray.500" textAlign="center" py={12}>
          Statuslar topilmadi
        </Text>
      ) : (
        <>
          <Box w="100%" maxW="100%" minW={0} minH={0} overflow="hidden">
            <LeadsKanbanBoard
              boardScrollRef={scroll.boardScrollRef}
              sentinelRef={scroll.sentinelRef}
              statuses={statuses}
              lidsByStatus={lidsByStatus}
              counts={counts}
              loading={loading}
              canManageStatuses={canManageStatuses}
              maxVisibleColumns={maxVisibleColumns}
              isDragOverStatusId={dragOverStatusId}
              onDragOverStatusId={setDragOverStatusId}
              onDragLeaveStatus={() => setDragOverStatusId(null)}
              onDropLid={handleDrop}
              onOpenLid={(lid) =>
                navigate(getLeadDetailPath(leadsBasePath, lid.id))
              }
              onDeleteLid={canDeleteLid ? requestDeleteLid : undefined}
              onEditStatus={(s) => {
                setStatusFormMode("edit");
                setSelectedStatus(s);
                statusFormModal.onOpen();
              }}
              onDeleteStatus={requestDeleteStatus}
              onPersistScroll={scroll.schedulePersistScroll}
              assignMode={assignMode}
              selectedLeadIds={selectedLeadIds}
              setSelectedLeadIds={setSelectedLeadIds}
            />
          </Box>
          {loadingMore && (
            <Center py={6}>
              <HStack spacing={2} color={subtleText}>
                <Spinner size="sm" />
                <Text fontSize="sm">Yuklanmoqda...</Text>
              </HStack>
            </Center>
          )}
        </>
      )}
    </>
  );

  const modals = (
    <>
      <LeadFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        onSubmit={handleCreateLid}
        loading={actionLoading}
        mode="create"
      />
      {canDeleteLid && (
        <ConfirmDelModal
          isOpen={Boolean(deleteLidTarget)}
          onClose={() => !actionLoading && setDeleteLidTarget(null)}
          onConfirm={confirmDeleteLid}
          itemName={deleteLidTarget?.fio || deleteLidTarget?.telefon_raqam}
          loading={actionLoading}
          typeItem="lid"
        />
      )}
      <ConfirmDelModal
        isOpen={Boolean(deleteStatusTarget)}
        onClose={() => !actionLoading && setDeleteStatusTarget(null)}
        onConfirm={confirmDeleteStatus}
        itemName={deleteStatusTarget?.name}
        loading={actionLoading}
        typeItem="status"
      />
      {canManageStatuses && (
        <LidStatusFormModal
          isOpen={statusFormModal.isOpen}
          onClose={statusFormModal.onClose}
          mode={statusFormMode}
          initialData={selectedStatus}
          onSubmit={handleStatusSubmit}
          loading={actionLoading}
          nextOrder={nextStatusOrder}
        />
      )}
    </>
  );

  if (panelLayout) {
    return (
      <Box
        ref={scroll.mainScrollRef}
        flex="1"
        minH={0}
        overflowY="auto"
        overflowX="hidden"
        w="100%"
        px={{ base: 4, md: 5 }}
        py={4}
        pb={8}
      >
        {toolbar}
        {boardContent}
        {modals}
      </Box>
    );
  }

  return (
    <Box
      ref={scroll.mainScrollRef}
      minH="100vh"
      overflowY="auto"
      overflowX="hidden"
      w="100%"
      maxW="100%"
      p={5}
      pb={10}
      bg="bg"
      boxSizing="border-box"
    >
      {toolbar}
      {boardContent}
      {modals}
    </Box>
  );
}
