import { useCallback, useState } from "react";
import {
  Box,
  Heading,
  HStack,
  Text,
  Spinner,
  Center,
  Button,
  Badge,
  useToast,
  useDisclosure,
  Flex,
  Select,
  FormControl,
  FormLabel,
  useColorModeValue,
} from "@chakra-ui/react";
import { ListPlus } from "lucide-react";
import { apiLocations } from "../../utils/Controllers/Locations";
import { apiLocationStatuses } from "../../utils/Controllers/apiLocationStatuses";
import CreateLocationStatusModal from "./_components/CreateLocationStatusModal";
import EditLocationStatusModal from "./_components/EditLocationStatusModal";
import LocationStatusNoteModal from "./_components/LocationStatusNoteModal";
import LocationAssignModal from "./_components/LocationAssignModal";
import ConfirmDelModal from "../../components/common/ConfirmDelModal";
import { volidamOutlineButton } from "../../components/ui/volidamUi";
import PaginationBar from "../../components/common/PaginationBar";
import CompanyKanbanBlock from "./_components/CompanyKanbanBlock";
import { useAdminCompanyTasksBoard } from "./_components/useAdminCompanyTasksBoard";
import {
  COMPANY_REGIONS,
  getAssigneeFilterRolesForTaskType,
  pickDetailsNoteFromTask,
  pickTaskLabelForCancelModal,
} from "./_components/adTaskBoardShared";

/** Admin `/tasks/company` — kompaniya vazifalari (ADtasks.jsx dan alohida). */
export default function AdminCompanyTasksPage() {
  const toast = useToast();
  const board = useAdminCompanyTasksBoard();
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

  const [activeStatusColumn, setActiveStatusColumn] = useState(null);
  const [statusDeleteTarget, setStatusDeleteTarget] = useState(null);
  const [statusDeleting, setStatusDeleting] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetTaskIds, setAssignTargetTaskIds] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filterDivider = useColorModeValue("gray.200", "whiteAlpha.200");
  const filterLabelColor = useColorModeValue("gray.700", "gray.300");
  const subtleText = useColorModeValue("gray.600", "gray.400");
  const emptyStateBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const emptyStateBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const filterFieldProps = {
    size: "md",
    borderRadius: "lg",
    variant: "outline",
    bg: "surface",
    color: "text",
    borderColor: "border",
  };

  const assigneeRoleFilterOptions =
    getAssigneeFilterRolesForTaskType("company");

  const openAssignModal = useCallback((locationIds) => {
    const ids = (locationIds ?? [])
      .map((x) => String(x).trim())
      .filter(Boolean);
    if (!ids.length) return;
    setAssignTargetTaskIds(ids);
    setAssignModalOpen(true);
  }, []);

  const handleAssignOne = useCallback(
    (r) => openAssignModal([String(r?.id ?? "").trim()]),
    [openAssignModal],
  );

  const handleDeleteOne = useCallback((r) => {
    setDeleteTarget(r);
  }, []);

  const handleEditColumn = useCallback(
    (col) => {
      setActiveStatusColumn(col);
      onEditStatusOpen();
    },
    [onEditStatusOpen],
  );

  const handleDeleteColumn = useCallback(
    (col) => {
      setStatusDeleteTarget(col);
      onDelStatusOpen();
    },
    [onDelStatusOpen],
  );

  const closeAssignModal = useCallback(() => {
    setAssignModalOpen(false);
    setAssignTargetTaskIds([]);
  }, []);

  const handleAssignSuccess = useCallback(() => {
    closeAssignModal();
    board.setAssignMode(false);
    board.setSelectedTaskIds(new Set());
    board.refetchFirstPage({ silent: true });
  }, [board, closeAssignModal]);

  const suggestedStatusOrder =
    board.kanbanColumns.length === 0
      ? 1
      : Math.max(...board.kanbanColumns.map((c) => Number(c.order) || 0)) + 1;

  return (
    <Box
      ref={board.mainScrollRef}
      h="100vh"
      overflowY="auto"
      pr="20px"
      pb="20px"
      pt="20px"
    >
      <Flex justify="space-between" align="center" mb={4} gap={4} wrap="wrap">
        <Heading size="lg">Kompaniya vazifalari</Heading>
        <Button
          {...volidamOutlineButton}
          size="sm"
          leftIcon={<ListPlus size={16} />}
          onClick={onCreateStatusOpen}
        >
          Location status
        </Button>
      </Flex>

      <Flex
        direction="column"
        gap={3}
        mb={5}
        pb={4}
        borderBottomWidth="1px"
        borderBottomColor={filterDivider}
      >
        <Flex wrap="wrap" gap={3} align="flex-end" rowGap={4}>
          {!board.fixedAssigneeFilterRole ? (
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
                value={board.filterAssigneeType}
                onChange={(e) => board.setFilterAssigneeType(e.target.value)}
                {...filterFieldProps}
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
              value={board.filterAssigneeId}
              onChange={(e) => board.setFilterAssigneeId(e.target.value)}
              isDisabled={
                !board.effectiveFilterAssigneeType && !board.filterAssigneeType
              }
              {...filterFieldProps}
            >
              <option value="">Barchasi</option>
              {board.assigneeFilterList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.username || u.phone || u.id}
                </option>
              ))}
            </Select>
          </FormControl>
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
              Manzil
            </FormLabel>
            <Select
              value={board.filterCompanyRegion}
              onChange={(e) => board.setFilterCompanyRegion(e.target.value)}
              {...filterFieldProps}
            >
              <option value="">Barchasi</option>
              {COMPANY_REGIONS.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </Select>
          </FormControl>
          <Box flexShrink={0}>
            {role === "superadmin" &&
              (!board.assignMode ? (
                <Button
                  colorScheme="pink"
                  borderRadius="lg"
                  onClick={() => {
                    board.setAssignMode(true);
                    board.setSelectedTaskIds(new Set());
                  }}
                >
                  Hodim biriktirish
                </Button>
              ) : (
                <HStack>
                  <Button
                    colorScheme="pink"
                    borderRadius="lg"
                    isDisabled={board.selectedTaskIds.size === 0}
                    onClick={() =>
                      openAssignModal(Array.from(board.selectedTaskIds))
                    }
                  >
                    Saqlash
                  </Button>

                  <Button
                    variant="outline"
                    borderRadius="lg"
                    onClick={() => {
                      board.setAssignMode(false);
                      board.setSelectedTaskIds(new Set());
                    }}
                  >
                    Bekor qilish
                  </Button>
                </HStack>
              ))}
          </Box>
          <Badge
            colorScheme="pink"
            px={3}
            py={1}
            borderRadius="full"
            fontSize="sm"
            fontWeight="semibold"
            flexShrink={0}
            alignSelf="flex-end"
            ml="auto"
          >
            {board.loading ? (
              <Flex align="center" gap={1}>
                <Spinner size="xs" /> <span>Yuklanmoqda...</span>
              </Flex>
            ) : (
              `Jami: ${board.total} ta vazifa`
            )}
          </Badge>
        </Flex>
        {board.effectiveFilterAssigneeType &&
        board.assigneeListTotalPages > 1 ? (
          <PaginationBar
            mt={0}
            page={board.assigneeListPage}
            totalPages={board.assigneeListTotalPages}
            loading={board.assigneeFilterLoading}
            onPageChange={(p) => board.setAssigneeListPage(p)}
          />
        ) : null}
      </Flex>

      {board.loading || board.statusesLoading ? (
        <Center py={16}>
          <Spinner size="lg" color="blue.500" />
        </Center>
      ) : board.kanbanColumns.length === 0 ? (
        <Box
          borderRadius="2xl"
          borderWidth="1px"
          borderColor={emptyStateBorder}
          bg={emptyStateBg}
          px={{ base: 6, md: 10 }}
          py={{ base: 10, md: 14 }}
        >
          <Text textAlign="center" color={subtleText}>
            Kompaniya vazifalari uchun status ustunlari yo&apos;q
          </Text>
        </Box>
      ) : (
        <CompanyKanbanBlock
          boardScrollRef={board.boardScrollRef}
          kanbanColumns={board.kanbanColumns}
          grouped={board.grouped}
          columnByKey={board.columnByKey}
          countByStatus={board.countByStatus}
          setRows={board.setRows}
          setCountByStatus={board.setCountByStatus}
          onPersistScroll={board.schedulePersistScroll}
          onDragSessionStart={board.onDragSessionStart}
          onDragSessionEnd={board.onDragSessionEnd}
          onCancelDropRequest={board.setCancelDrop}
          assignMode={board.assignMode}
          selectedTaskIds={board.selectedTaskIds}
          setSelectedTaskIds={board.setSelectedTaskIds}
          onAssign={handleAssignOne}
          onRequestDelete={handleDeleteOne}
          onEditColumn={handleEditColumn}
          onDeleteColumn={handleDeleteColumn}
        />
      )}

      <Box ref={board.sentinelRef} h="1px" />
      {board.hasMore ? (
        <Center py={6}>
          <HStack spacing={2} color={subtleText}>
            <Spinner size="sm" />
            <Text fontSize="sm">Yuklanmoqda...</Text>
          </HStack>
        </Center>
      ) : null}

      <CreateLocationStatusModal
        isOpen={isCreateStatusOpen}
        onClose={onCreateStatusClose}
        suggestedOrder={suggestedStatusOrder}
        onCreated={() => board.setStatusListTick((n) => n + 1)}
      />
      <EditLocationStatusModal
        isOpen={isEditStatusOpen}
        onClose={() => {
          onEditStatusClose();
          setActiveStatusColumn(null);
        }}
        column={activeStatusColumn}
        onUpdated={() => {
          board.setStatusListTick((n) => n + 1);
          board.refetchFirstPage({ silent: true });
        }}
      />
      <LocationStatusNoteModal
        isOpen={Boolean(board.cancelDrop)}
        onClose={() =>
          !board.cancelReasonSubmitting && board.setCancelDrop(null)
        }
        itemTitle={
          board.cancelDrop
            ? pickTaskLabelForCancelModal(board.cancelDrop.task)
            : ""
        }
        statusName={board.cancelDrop?.statusName ?? ""}
        existingNote={
          board.cancelDrop ? pickDetailsNoteFromTask(board.cancelDrop.task) : ""
        }
        onConfirm={board.confirmCancelDrop}
        isSubmitting={board.cancelReasonSubmitting}
        variant={board.cancelDrop?.variant === "cancel" ? "cancel" : "status"}
      />
      <ConfirmDelModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          const id = String(deleteTarget?.id ?? "").trim();
          if (!id) return;
          setDeleting(true);
          try {
            await apiLocations.Delete(id, "Kompaniya");
            toast({ title: "O'chirildi", status: "success", duration: 2500 });
            setDeleteTarget(null);
            board.refetchFirstPage({ silent: true });
          } catch (e) {
            console.error(e);
            toast({ title: "Xatolik", status: "error", duration: 4000 });
          } finally {
            setDeleting(false);
          }
        }}
        itemName={
          deleteTarget?.details?.location_name ??
          deleteTarget?.name ??
          String(deleteTarget?.id ?? "")
        }
        loading={deleting}
        typeItem="kompaniya"
      />
      <ConfirmDelModal
        isOpen={isDelStatusOpen}
        onClose={() => {
          onDelStatusClose();
          setStatusDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!statusDeleteTarget?.id) return;
          setStatusDeleting(true);
          try {
            await apiLocationStatuses.remove(statusDeleteTarget.id);
            toast({ title: "O'chirildi", status: "success" });
            onDelStatusClose();
            setStatusDeleteTarget(null);
            board.setStatusListTick((n) => n + 1);
          } catch (e) {
            console.error(e);
            toast({ title: "Xatolik", status: "error" });
          } finally {
            setStatusDeleting(false);
          }
        }}
        itemName={statusDeleteTarget?.name ?? ""}
        loading={statusDeleting}
        typeItem="status"
      />

      <LocationAssignModal
        isOpen={assignModalOpen}
        onClose={closeAssignModal}
        locationIds={assignTargetTaskIds}
        onSuccess={handleAssignSuccess}
      />
    </Box>
  );
}
