import {
  Box,
  Button,
  Center,
  Flex,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import LeadsFilters from "../../components/leads/LeadsFilters";
import LeadsKanbanBoard from "../../components/leads/LeadsKanbanBoard";
import LidChildStatusFormModal from "../../components/leads/LidChildStatusFormModal";
import ConfirmDelModal from "../../components/common/ConfirmDelModal";
import useDebounce from "../../hooks/useDebounce";
import { useSharedLeadsBoard } from "../../hooks/useSharedLeadsBoard";
import { apiUsers } from "../../Services/api/Users";
import { DAY_TYPES } from "../../utils/lidChildStatus";
import { toastService } from "../../utils/toast";
import { getApiErrorMessage } from "../../utils/lidStatus";
import { volidamPrimaryButton } from "../../components/leads/leadStyles";
import { useAuthStore } from "../../store/authStore";

export default function SharedLeadsPage({ dayType = DAY_TYPES.TOQ }) {
  const isToq = dayType === DAY_TYPES.TOQ;
  const pageTitle = isToq ? "Toq kunlari" : "Juft kunlari";
  const pageSubtitle = isToq
    ? "Toq kunlardagi lidlar"
    : "Juft kunlardagi lidlar";

  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [assignedId, setAssignedId] = useState("");
  const [filterUsers, setFilterUsers] = useState([]);
  const [filterUsersLoading, setFilterUsersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [childFormMode, setChildFormMode] = useState("create");
  const [selectedChild, setSelectedChild] = useState(null);
  const [deleteChildTarget, setDeleteChildTarget] = useState(null);

  const childFormModal = useDisclosure();
  const boardScrollRef = useRef(null);

  // ── Sentinel — page-level scrollda ishlaydi ──
  const sentinelRef = useRef(null);

  const debouncedSearch = useDebounce(search, 350);
  const debouncedAssignedId = useDebounce(assignedId, 350);

  // NEW: De-structure according to instructions, fetch columnStates and fetchNextPageForColumn
  const {
    statuses,
    parentStatuses,
    lidsByStatus,
    counts,
    columnStates,
    totalLids,
    loading,
    fetchNextPageForColumn,
    hasMore,
    fetchNextPage,
    getDefaultStatusId,
    getParentStatus,
    getNextChildOrder,
    moveLidToChildStatus,
    createChildStatus,
    updateChildStatus,
    deleteChildStatus,
  } = useSharedLeadsBoard({
    dayType,
    statusFilter,
    search: debouncedSearch,
    assignedId: debouncedAssignedId,
    role: roleFilter,
  });

  // ── IntersectionObserver — sentinel bu yerda, page scrolliga bog'liq ──
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      {
        // page-level scroll — root: null (viewport)
        root: null,
        rootMargin: "0px 0px 200px 0px",
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage]);

  // Parent statuslar yuklanganda default status
  useEffect(() => {
    if (!parentStatuses.length || statusFilter) return;
    const defaultId = getDefaultStatusId();
    if (defaultId) setStatusFilter(defaultId);
  }, [parentStatuses, getDefaultStatusId]);

  const selectedParentStatus = useMemo(
    () => (statusFilter ? getParentStatus(statusFilter) : null),
    [statusFilter, getParentStatus]
  );

  const subtleText = useColorModeValue("gray.600", "gray.400");
  const totalAccent = useColorModeValue("brand.600", "brand.300");

  const handleRoleChange = async (role) => {
    setRoleFilter(role);
    setAssignedId("");
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

  const handleDropLid = async (lidId, fromStatusId, toStatusId) => {
    if (fromStatusId === toStatusId) return;
    try {
      await moveLidToChildStatus(lidId, toStatusId);
    } catch {
      toastService.error("Status o'zgartirilmadi");
    }
  };

  const handleOpenCreateChild = () => {
    setChildFormMode("create");
    setSelectedChild(null);
    childFormModal.onOpen();
  };

  const handleEditColumn = (column) => {
    if (!isSuperAdmin) return;
    setChildFormMode("edit");
    setSelectedChild(column.childData || column);
    childFormModal.onOpen();
  };

  const handleDeleteColumn = (column) => {
    if (!isSuperAdmin) return;
    setDeleteChildTarget(column.childData || column);
  };

  const handleChildSubmit = async (data) => {
    setActionLoading(true);
    try {
      if (childFormMode === "create") {
        await createChildStatus(data);
        toastService.success("Child status yaratildi");
      } else if (selectedChild?.id) {
        await updateChildStatus(selectedChild.id, data);
        toastService.success("Child status yangilandi");
      }
      childFormModal.onClose();
    } catch (err) {
      toastService.error(getApiErrorMessage(err) || "Saqlanmadi");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteChild = async () => {
    if (!deleteChildTarget?.id) return;
    setActionLoading(true);
    try {
      await deleteChildStatus(deleteChildTarget.id);
      setDeleteChildTarget(null);
      toastService.success("Child status o'chirildi");
    } catch (err) {
      toastService.error(getApiErrorMessage(err) || "O'chirilmadi");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} minH="100%" bg="bg">
      <Stack spacing={4}>
        <Box>
          <Text fontSize="xl" fontWeight="800" color="text">
            {pageTitle}
          </Text>
          <Text fontSize="sm" color={subtleText} mt={1}>
            {pageSubtitle}
          </Text>
        </Box>

        <Box borderRadius="2xl" p={{ base: 3, md: 4 }} boxShadow="sm">
          <Flex
            justify="space-between"
            align={{ base: "stretch", md: "center" }}
            direction={{ base: "column", md: "row" }}
            gap={3}
            mb={3}
          >
            <Text color={subtleText} fontSize="sm" fontWeight="600">
              JAMI:{" "}
              <Text as="span" color={totalAccent} fontWeight="800">
                {totalLids}
              </Text>{" "}
              TA LID
            </Text>

            {isSuperAdmin && statusFilter && (
              <Button
                {...volidamPrimaryButton}
                leftIcon={<Plus size={16} />}
                onClick={handleOpenCreateChild}
                isDisabled={!selectedParentStatus}
              >
                Child qo&apos;shish
              </Button>
            )}
          </Flex>

          <LeadsFilters
            statuses={parentStatuses}
            statusId={statusFilter}
            onStatusIdChange={setStatusFilter}
            role={roleFilter}
            onRoleChange={handleRoleChange}
            assignedId={assignedId}
            onAssignedIdChange={setAssignedId}
            users={filterUsers}
            usersLoading={filterUsersLoading}
            search={search}
            onSearchChange={setSearch}
            assignMode={false}
            setAssignMode={() => undefined}
            selectedLeadIds={[]}
            setSelectedLeadIds={() => undefined}
            onAssignLeads={async () => undefined}
            hideAssignButton
          />

          {!statusFilter ? (
            <Text color="gray.500" textAlign="center" py={10}>
              Lidlarni ko&apos;rish uchun yuqoridan status tanlang.
            </Text>
          ) : loading && statuses.length === 0 ? (
            <Center py={12}>
              <Spinner size="lg" color="brand.500" />
            </Center>
          ) : !loading && statuses.length === 0 ? (
            <Text color="gray.500" textAlign="center" py={10}>
              Bu statusda child statuslar topilmadi.
            </Text>
          ) : (
            <LeadsKanbanBoard
              boardScrollRef={boardScrollRef}
              statuses={statuses}
              lidsByStatus={lidsByStatus}
              counts={counts}
              loading={loading}
              canManageStatuses={false}
              canManageChildStatuses={isSuperAdmin}
              maxVisibleColumns={4}
              onDropLid={handleDropLid}
              onOpenLid={() => undefined}
              onDeleteLid={undefined}
              onEditStatus={handleEditColumn}
              onDeleteStatus={handleDeleteColumn}
              onPersistScroll={undefined}
              isFiltered={false}
              showFilteredChildren={false}
              assignMode={false}
              selectedLeadIds={[]}
              setSelectedLeadIds={() => undefined}
              // NEW: Add columnStates and onLoadMore as per instructions
              columnStates={columnStates}
              onLoadMore={fetchNextPageForColumn}
            />
          )}
        </Box>

        {/* ── Sentinel — board TASHQARISIDA, page-level scrollda ──
             hasMore=true bo'lganda ko'rinadi, observer trigger qiladi.
             loading indikatori ham shu yerda. ── */}
        {hasMore && (
          <Box ref={sentinelRef} w="full" py={6}>
            {loading && (
              <Center gap={3}>
                <Spinner size="sm" color="gray.400" />
                <Text fontSize="sm" color="gray.400">
                  Yuklanmoqda...
                </Text>
              </Center>
            )}
          </Box>
        )}

        {/* Hammasi yuklanganda xabar */}
        {!hasMore && statuses.length > 0 && !loading && (
          <Text fontSize="xs" color="gray.400" textAlign="center" pb={4}>
            Barcha lidlar ko&apos;rsatildi
          </Text>
        )}
      </Stack>

      <LidChildStatusFormModal
        isOpen={childFormModal.isOpen}
        onClose={childFormModal.onClose}
        mode={childFormMode}
        initialData={selectedChild}
        parentStatus={selectedParentStatus}
        dayType={dayType}
        onSubmit={handleChildSubmit}
        loading={actionLoading}
        nextOrder={
          selectedParentStatus
            ? getNextChildOrder(selectedParentStatus.id)
            : 0
        }
      />

      <ConfirmDelModal
        isOpen={Boolean(deleteChildTarget)}
        onClose={() => !actionLoading && setDeleteChildTarget(null)}
        onConfirm={confirmDeleteChild}
        itemName={deleteChildTarget?.name}
        loading={actionLoading}
        typeItem="child status"
      />
    </Box>
  );
}