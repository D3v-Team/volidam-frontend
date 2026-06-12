import {
  Box,
  Button,
  Center,
  Flex,
  HStack,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
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

  // Child CRUD state
  const [childFormMode, setChildFormMode] = useState("create");
  const [selectedChild, setSelectedChild] = useState(null);
  const [deleteChildTarget, setDeleteChildTarget] = useState(null);

  const childFormModal = useDisclosure();

  const debouncedSearch = useDebounce(search, 350);
  const debouncedAssignedId = useDebounce(assignedId, 350);

  const {
    statuses,
    parentStatuses,
    lidsByStatus,
    counts,
    totalLids,
    loading,
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

  // Parent statuslar yuklanganda role bo'yicha default statusni avtomatik tanlash
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
  const panelBg = useColorModeValue("white", "whiteAlpha.50");

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

  // Drag & Drop
  const handleDropLid = async (lidId, fromStatusId, toStatusId) => {
    if (fromStatusId === toStatusId) return;
    try {
      await moveLidToChildStatus(lidId, toStatusId);
    } catch {
      toastService.error("Status o'zgartirilmadi");
    }
  };

  // Child yaratish modal ochish
  const handleOpenCreateChild = () => {
    setChildFormMode("create");
    setSelectedChild(null);
    childFormModal.onOpen();
  };

  // Child tahrirlash
  const handleEditColumn = (column) => {
    if (!isSuperAdmin) return;
    setChildFormMode("edit");
    setSelectedChild(column.childData || column);
    childFormModal.onOpen();
  };

  // Child o'chirish
  const handleDeleteColumn = (column) => {
    if (!isSuperAdmin) return;
    setDeleteChildTarget(column.childData || column);
  };

  // Child form submit
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

  // Child o'chirishni tasdiqlash
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
            {/* Jami lid soni */}
            <Text color={subtleText} fontSize="sm" fontWeight="600">
              JAMI:{" "}
              <Text as="span" color={totalAccent} fontWeight="800">
                {totalLids}
              </Text>{" "}
              TA LID
            </Text>

            {/* Super admin uchun child qo'shish tugmasi */}
            {isSuperAdmin && statusFilter && (
              <Button
                {...volidamPrimaryButton}
                leftIcon={<Plus size={16} />}
                onClick={handleOpenCreateChild}
                isDisabled={!selectedParentStatus}
              >
                Child qo'shish
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
              statuses={statuses}
              lidsByStatus={lidsByStatus}
              counts={counts}
              loading={loading}
              canManageStatuses={false}
              canManageChildStatuses={isSuperAdmin} // super_admin uchun 3 nuqta
              maxVisibleColumns={4}
              onDropLid={handleDropLid}
              onOpenLid={() => undefined}
              onDeleteLid={undefined}
              onEditStatus={handleEditColumn}
              onDeleteStatus={handleDeleteColumn}
              isFiltered={false}
              showFilteredChildren={false}
              assignMode={false}
              selectedLeadIds={[]}
              setSelectedLeadIds={() => undefined}
            />
          )}
        </Box>
      </Stack>

      {/* Child yaratish/tahrirlash modali */}
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

      {/* O'chirish tasdiqlash modali */}
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