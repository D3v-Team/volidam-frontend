import {
    Box,
    Button,
    Center,
    Flex,
    HStack,
    IconButton,
    Spinner,
    Stack,
    Text,
    Tooltip,
    useColorModeValue,
    useDisclosure,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { ListPlus, Plus, LayoutGrid } from "lucide-react";
import LeadsFilters from "../../components/leads/LeadsFilters";
import LeadsKanbanBoard from "../../components/leads/LeadsKanbanBoard";
import LidStatusFormModal from "../../components/leads/LidStatusFormModal";
import LidChildStatusFormModal from "../../components/leads/LidChildStatusFormModal";
import ConfirmDelModal from "../../components/common/ConfirmDelModal";
import useDebounce from "../../hooks/useDebounce";
import { useSharedLeadsBoard } from "../../hooks/useSharedLeadsBoard";
import { apiUsers } from "../../Services/api/Users";
import { toastService } from "../../utils/toast";
import { getApiErrorMessage } from "../../utils/lidStatus";
import { DAY_TYPES } from "../../utils/lidChildStatus";
import { volidamOutlineButton, volidamPrimaryButton } from "../../components/leads/leadStyles";

export default function SharedLeadsPage({ dayType = DAY_TYPES.TOQ }) {
    const isToq = dayType === DAY_TYPES.TOQ;
    const pageTitle = isToq ? "Toq kunlari" : "Juft kunlari";
    const pageSubtitle = isToq
        ? "Toq kunlardagi lidlar va child statuslar"
        : "Juft kunlardagi lidlar va child statuslar";

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
    // Category toggle: filter rejimida toolbar'dan boshqariladi
    const [showFilteredChildren, setShowFilteredChildren] = useState(false);

    const statusFormModal = useDisclosure();
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
        createStatus,
        createChildStatus,
        updateChildStatus,
        deleteChildStatus,
        getParentStatus,
        getNextChildOrder,
    } = useSharedLeadsBoard({
        dayType,
        statusFilter,
        search: debouncedSearch,
        assignedId: debouncedAssignedId,
        role: roleFilter,
    });

    const selectedParentStatus = useMemo(
        () => (statusFilter ? getParentStatus(statusFilter) : null),
        [statusFilter, getParentStatus]
    );

    // isChildMode: filter tanlangan va u haqiqiy parent status
    const isChildMode = Boolean(statusFilter && selectedParentStatus);

    const nextStatusOrder = useMemo(() => {
        if (!parentStatuses.length) return 0;
        return Math.max(...parentStatuses.map((s) => s.order ?? 0)) + 1;
    }, [parentStatuses]);

    const subtleText = useColorModeValue("gray.600", "gray.400");
    const totalAccent = useColorModeValue("brand.600", "brand.300");
    const panelBg = useColorModeValue("white", "whiteAlpha.50");

    const handleRoleChange = async (role) => {
        setRoleFilter(role);
        setAssignedId("");
        setStatusFilter("");
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

    const handleStatusFilterChange = (id) => {
        setStatusFilter(id);
        setShowFilteredChildren(false); // filter o'zgarsa toggle reset
    };

    // Toolbar primary button:
    // - filter yo'q → "Yangi status" (parent status yaratish)
    // - filter tanlangan → "Child qo'shish"
    const handlePrimaryAction = () => {
        if (isChildMode) {
            setChildFormMode("create");
            setSelectedChild(null);
            childFormModal.onOpen();
        } else {
            statusFormModal.onOpen();
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

    const openEditChild = (column) => {
        setChildFormMode("edit");
        setSelectedChild(column.childData || column);
        childFormModal.onOpen();
    };

    const handleChildSubmit = async (data) => {
        setActionLoading(true);
        try {
            if (childFormMode === "create") {
                await createChildStatus(data);
                toastService.success("Child status yaratildi");
            } else if (selectedChild?.id) {
                await updateChildStatus(selectedChild.id, data);
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
        } catch (err) {
            toastService.error(getApiErrorMessage(err) || "O'chirilmadi");
        } finally {
            setActionLoading(false);
        }
    };

    const handleEditColumn = (column) => {
        if (column.isChild) openEditChild(column);
    };

    const handleDeleteColumn = (column) => {
        if (column.isChild) {
            setDeleteChildTarget(column.childData || column);
        }
    };

    useEffect(() => {
        if (!statusFilter) return;
        const stillValid = parentStatuses.some((s) => s.id === statusFilter);
        if (!stillValid) setStatusFilter("");
    }, [parentStatuses, statusFilter]);

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

                <Box borderRadius="2xl" p={{ base: 3, md: 4 }} bg={panelBg} boxShadow="sm">
                    <Flex
                        justify="space-between"
                        align={{ base: "stretch", md: "center" }}
                        direction={{ base: "column", md: "row" }}
                        gap={3}
                        mb={4}
                    >
                        <Box />
                        <Flex
                            direction="column"
                            align={{ base: "stretch", md: "flex-end" }}
                            gap={2}
                        >
                            <HStack spacing={2} flexWrap="wrap" justify="flex-end">
                                {/* Category toggle — faqat filter rejimida, "Child qo'shish" oldida */}
                                {isChildMode ? (
                                    <Tooltip
                                        label={showFilteredChildren ? "Yopish" : "Kategoriyalar"}
                                        placement="top"
                                        hasArrow
                                    >
                                        <IconButton
                                            aria-label="Kategoriyalar"
                                            icon={<LayoutGrid size={16} />}
                                            size="sm"
                                            variant={showFilteredChildren ? "solid" : "outline"}
                                            colorScheme="brand"
                                            borderRadius="lg"
                                            onClick={() => setShowFilteredChildren((v) => !v)}
                                        />
                                    </Tooltip>
                                ) : null}
                                <Button
                                    {...(isChildMode ? volidamPrimaryButton : volidamOutlineButton)}
                                    leftIcon={isChildMode ? <Plus size={16} /> : <ListPlus size={16} />}
                                    onClick={handlePrimaryAction}
                                    isDisabled={isChildMode && !selectedParentStatus}
                                >
                                    {isChildMode ? "Child qo'shish" : "Yangi status"}
                                </Button>
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

                    <LeadsFilters
                        statuses={parentStatuses}
                        statusId={statusFilter}
                        onStatusIdChange={handleStatusFilterChange}
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

                    {loading && statuses.length === 0 ? (
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
                            canManageStatuses={false}
                            canManageChildStatuses={isChildMode}
                            maxVisibleColumns={4}
                            onDropLid={() => undefined}
                            onOpenLid={() => undefined}
                            onDeleteLid={undefined}
                            onEditStatus={handleEditColumn}
                            onDeleteStatus={handleDeleteColumn}
                            isFiltered={isChildMode}
                            showFilteredChildren={showFilteredChildren}
                            assignMode={false}
                            selectedLeadIds={[]}
                            setSelectedLeadIds={() => undefined}
                        />
                    )}
                </Box>
            </Stack>

            {/* Parent status yaratish modali */}
            <LidStatusFormModal
                isOpen={statusFormModal.isOpen}
                onClose={statusFormModal.onClose}
                mode="create"
                onSubmit={handleStatusSubmit}
                loading={actionLoading}
                nextOrder={nextStatusOrder}
            />

            {/* Child status yaratish/tahrirlash modali */}
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