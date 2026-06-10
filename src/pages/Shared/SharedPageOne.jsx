import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import LeadsFilters from "../../components/leads/LeadsFilters";
import LeadsKanbanBoard from "../../components/leads/LeadsKanbanBoard";
import LidStatusFormModal from "../../components/leads/LidStatusFormModal";
import useDebounce from "../../hooks/useDebounce";
import { useLeadsBoard } from "../../hooks/useLeadsBoard";
import { apiUsers } from "../../Services/api/Users";
import { toastService } from "../../utils/toast";
import { getApiErrorMessage } from "../../utils/lidStatus";

export default function SharedPageOne() {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [assignedId, setAssignedId] = useState("");
  const [filterUsers, setFilterUsers] = useState([]);
  const [filterUsersLoading, setFilterUsersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const statusFormModal = useDisclosure();

  const debouncedSearch = useDebounce(search, 350);
  const debouncedAssignedId = useDebounce(assignedId, 350);

  const { statuses, allStatuses, lidsByStatus, counts, loading, createStatus } =
    useLeadsBoard({
      statusFilter,
      search: debouncedSearch,
      assignedId: debouncedAssignedId,
      role: roleFilter,
    });

  const nextStatusOrder = useMemo(() => {
    if (!allStatuses.length) return 0;
    return Math.max(...allStatuses.map((s) => s.order ?? 0)) + 1;
  }, [allStatuses]);

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

  const handleStatusSubmit = async (data) => {
    setActionLoading(true);
    try {
      await createStatus(data);
      toastService.success("Status yaratildi");
      statusFormModal.onClose();
    } catch (err) {
      toastService.error(getApiErrorMessage(err) || "Status saqlanmadi");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} minH="100%" bg="bg">
      <Stack spacing={4}>
        

        <Box borderRadius="2xl" p={3} bg="whiteAlpha.50">
          <Flex
            justify="space-between"
            align={{ base: "stretch", md: "center" }}
            direction={{ base: "column", md: "row" }}
            gap={3}
            mb={4}
          >
            <Box />
            <Button colorScheme="pink" onClick={statusFormModal.onOpen}>
              Yangi status
            </Button>
          </Flex>

          <LeadsFilters
            statuses={allStatuses}
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
            hideAssignButton={true}
          />

          {loading && allStatuses.length === 0 ? (
            <Center py={12}>
              <Spinner size="lg" color="brand.500" />
            </Center>
          ) : statuses.length === 0 ? (
            <Text color="gray.500" textAlign="center" py={10}>
              Hech qanday status topilmadi.
            </Text>
          ) : (
            <LeadsKanbanBoard
              statuses={statuses}
              lidsByStatus={lidsByStatus}
              counts={counts}
              loading={loading}
              canManageStatuses={true}
              maxVisibleColumns={4}
              onDropLid={() => undefined}
              onOpenLid={() => undefined}
              onDeleteLid={undefined}
              onEditStatus={() => undefined}
              onDeleteStatus={() => undefined}
              assignMode={false}
              selectedLeadIds={[]}
              setSelectedLeadIds={() => undefined}
            />
          )}
        </Box>

     
      </Stack>
    </Box>
  );
}
