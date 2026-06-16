import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Heading, HStack, Text, Center, Button, Badge, useDisclosure, Flex, Select, FormControl, FormLabel, useColorModeValue, IconButton, Checkbox } from "@chakra-ui/react";
import AppSpinner from "../../components/ui/AppSpinner";

import { useToast } from "../../hooks/useToast";
import { CalendarDays, ChevronLeft, ChevronRight, ListPlus, Trash2 } from "lucide-react";
import { apiLocations } from "../../utils/Controllers/Locations";
import { apiLocationStatuses } from "../../utils/Controllers/apiLocationStatuses";
import CreateLocationStatusModal from "./_components/CreateLocationStatusModal";
import EditLocationStatusModal from "./_components/EditLocationStatusModal";
import LocationStatusNoteModal from "./_components/LocationStatusNoteModal";
import LocationAssignModal from "./_components/LocationAssignModal";
import ConfirmDelModal from "../../components/common/ConfirmDelModal";
import PaginationBar from "../../components/common/PaginationBar";
import CompanyKanbanBlock from "./_components/CompanyKanbanBlock";
import { useAdminCompanyTasksBoard } from "./_components/useAdminCompanyTasksBoard";
import {
  COMPANY_REGIONS,
  getAssigneeFilterRolesForTaskType,
  pickDetailsNoteFromTask,
  pickTaskLabelForCancelModal,
} from "./_components/adTaskBoardShared";

export default function AdminCompanyTasksPage() {
  const toast = useToast();

  // Statuslar bo'yicha filter — page-da boshqariladi, hookka uzatiladi.
  // notStatusIds: BELGILANMAGAN status id lari (so'rovda `not_statuses`).
  // thisDay: "Faqat bugun" — default false, belgilansa true (`this_day`).
  // Filtr sessiyada saqlanadi (refresh / sahifa almashganda yo'qolmasin).
  const FILTER_SESSION_KEY = "admin:company-tasks:filters";
  const readFilterSession = () => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(window.sessionStorage.getItem(FILTER_SESSION_KEY) || "null");
    } catch {
      return null;
    }
  };

  const [notStatusIds, setNotStatusIds] = useState(() => {
    const saved = readFilterSession();
    return new Set(
      Array.isArray(saved?.notStatusIds) ? saved.notStatusIds.map(String) : []
    );
  });
  const [thisDay, setThisDay] = useState(() => !!readFilterSession()?.thisDay);
  const [activeClearing, setActiveClearing] = useState(false);
  // "Tozalash" tanlash rejimi — checkboxlar faqat shu yoki assign rejimida chiqadi
  const [clearMode, setClearMode] = useState(false);

  const toggleStatusFilter = useCallback((id, checked) => {
    setNotStatusIds((prev) => {
      const next = new Set(prev);
      if (checked) next.delete(String(id));
      else next.add(String(id));
      return next;
    });
  }, []);
  const setAllStatusFilter = useCallback((checked, allIds = []) => {
    setNotStatusIds(checked ? new Set() : new Set(allIds.map(String)));
  }, []);

  const board = useAdminCompanyTasksBoard({ notStatusIds, thisDay });

  // Filter (status / this_day) har o'zgarganda — avtomatik birinchi sahifani qayta yuklash.
  const notStatusesSig = useMemo(
    () => Array.from(notStatusIds).map(String).sort().join(","),
    [notStatusIds]
  );
  const filterFetchFirstRunRef = useRef(true);
  useEffect(() => {
    if (filterFetchFirstRunRef.current) {
      filterFetchFirstRunRef.current = false;
      return;
    }
    board.refetchFirstPage?.({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notStatusesSig, thisDay]);

  // Filtrni sessiyaga yozish (refresh/navigatsiyada tiklanadi)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        FILTER_SESSION_KEY,
        JSON.stringify({
          notStatusIds: Array.from(notStatusIds).map(String),
          thisDay: !!thisDay,
        })
      );
    } catch {
      /* noop */
    }
  }, [FILTER_SESSION_KEY, notStatusIds, thisDay]);

  // "Faqat bugun" o'chsa — tozalash rejimini va (assign bo'lmasa) tanlovni bo'shatish
  useEffect(() => {
    if (!thisDay) {
      setClearMode(false);
      if (!board.assignMode) board.setSelectedTaskIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thisDay]);

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

  // Belgilanmagan (not_statuses) statuslar ustuni board'da ko'rsatilmaydi
  const visibleColumns = useMemo(
    () => board.kanbanColumns.filter((c) => !notStatusIds.has(String(c?.id))),
    [board.kanbanColumns, notStatusIds]
  );

  // "Tozalash" rejimiga kirish/chiqish (assign bilan o'zaro eksklyuziv)
  const enterClearMode = useCallback(() => {
    setClearMode(true);
    board.setAssignMode?.(false);
    board.setSelectedTaskIds(new Set());
  }, [board]);

  const exitClearMode = useCallback(() => {
    setClearMode(false);
    board.setSelectedTaskIds(new Set());
  }, [board]);

  // "Tozalash" submit: tanlangan tasklarni /api/locations/active → is_active:false
  const handleClearActive = useCallback(async () => {
    const ids = Array.from(board.selectedTaskIds ?? [])
      .map(String)
      .filter(Boolean);
    if (!ids.length) return;
    setActiveClearing(true);
    try {
      await apiLocations.setActive({ location_ids: ids, is_active: false });
      toast({
        title: "Tozalandi",
        status: "success",
        duration: 2500,
        position: "top",
      });
      board.setSelectedTaskIds(new Set());
      setClearMode(false);
      board.refetchFirstPage?.({ silent: false });
    } catch (e) {
      console.error(e);
      toast({
        title: "Tozalab bo'lmadi",
        status: "error",
        duration: 4000,
        position: "top",
      });
    } finally {
      setActiveClearing(false);
    }
  }, [board, toast]);

  // ── Drag (hold) paytida chetga yaqinlashganda board surilishi (x + y) ──
  const autoScrollRafRef = useRef(null);
  const autoScrollPointerRef = useRef({ x: 0, y: 0 });
  const autoScrollOnMoveRef = useRef(null);

  const stopDragAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current != null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
    if (autoScrollOnMoveRef.current) {
      window.removeEventListener("pointermove", autoScrollOnMoveRef.current);
      window.removeEventListener("dragover", autoScrollOnMoveRef.current);
      autoScrollOnMoveRef.current = null;
    }
  }, []);

  const startDragAutoScroll = useCallback(() => {
    if (typeof window === "undefined") return;
    stopDragAutoScroll();
    const onMove = (e) => {
      const pt = e.touches && e.touches[0] ? e.touches[0] : e;
      if (pt) autoScrollPointerRef.current = { x: pt.clientX, y: pt.clientY };
    };
    autoScrollOnMoveRef.current = onMove;
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("dragover", onMove, { passive: true });

    const EDGE = 90; // chet zonasi (px)
    const MAX_SPEED = 24; // px/frame
    const speedFor = (dist) =>
      Math.ceil(Math.min(1, Math.max(0, (EDGE - dist) / EDGE)) * MAX_SPEED);

    const tick = () => {
      const { x, y } = autoScrollPointerRef.current;

      // Gorizontal — board konteyneri
      const hEl = board.boardScrollRef?.current;
      if (hEl && hEl.scrollWidth > hEl.clientWidth + 1) {
        const r = hEl.getBoundingClientRect();
        const dl = x - r.left;
        const dr = r.right - x;
        if (dr < EDGE) hEl.scrollLeft += speedFor(dr);
        else if (dl < EDGE) hEl.scrollLeft -= speedFor(dl);
      }

      // Vertikal — sahifa konteyneri (mainScrollRef)
      const vEl = board.mainScrollRef?.current;
      if (vEl && vEl.scrollHeight > vEl.clientHeight + 1) {
        const r = vEl.getBoundingClientRect();
        const dt = y - r.top;
        const db = r.bottom - y;
        if (db < EDGE) vEl.scrollTop += speedFor(db);
        else if (dt < EDGE) vEl.scrollTop -= speedFor(dt);
      }

      autoScrollRafRef.current = requestAnimationFrame(tick);
    };
    autoScrollRafRef.current = requestAnimationFrame(tick);
  }, [board.boardScrollRef, board.mainScrollRef, stopDragAutoScroll]);

  useEffect(() => stopDragAutoScroll, [stopDragAutoScroll]);

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
          variant="outline"
          colorScheme="blue"
          size="sm"
          leftIcon={<ListPlus size={16} />}
          borderRadius="lg"
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
        <Flex wrap="wrap" gap={3} align="flex-end" rowGap={4} mb={"35px"}>
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
       

            {!board.assignMode ? (
              <Button
                colorScheme="blue"
                borderRadius="lg"
                onClick={() => {
                  board.setAssignMode(true);
                  board.setSelectedTaskIds(new Set());
                  setClearMode(false);
                }}
              >
                Hodim biriktirish
              </Button>

              
            ) : (
              <HStack>
                <Button
                  colorScheme="blue"
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
            )}

            
          </Box>
               <HStack spacing={2}>
              <IconButton
                aria-label="Chapga"
                icon={<ChevronLeft size={18} />}
                size="md"
                colorScheme="blue"
                borderRadius="lg"
                onClick={() =>
                  board.boardScrollRef?.current?.scrollBy({
                    left: -320,
                    behavior: "smooth",
                  })
                }
              />
              <IconButton
                aria-label="O'ngga"
                icon={<ChevronRight size={18} />}
                size="md"
                colorScheme="blue"
                borderRadius="lg"
                onClick={() =>
                  board.boardScrollRef?.current?.scrollBy({
                    left: 320,
                    behavior: "smooth",
                  })
                }
              />
            </HStack>
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
            
            {board.loading ? (
              <Flex align="center" gap={1}>
                <AppSpinner size="sm" /> <span>Yuklanmoqda...</span>
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

        {/* Statuslar bo'yicha filter (not_statuses) + Faqat bugun (this_day) */}
        {board.kanbanColumns.length > 0 ? (
          <Flex
            direction={{ base: "column", lg: "row" }}
            align={{ base: "stretch", lg: "flex-end" }}
            justify="space-between"
            gap={4}
            pt={1}
          >
            <Box flex="1" minW={0}>
              <FormLabel
                fontSize="sm"
                mb={2}
                fontWeight="semibold"
                color={filterLabelColor}
              >
                Statuslar bo'yicha filter
              </FormLabel>
              <Flex wrap="wrap" columnGap={5} rowGap={2} align="center">
                <Checkbox
                  colorScheme="blue"
                  fontWeight="semibold"
                  isChecked={notStatusIds.size === 0}
                  isIndeterminate={
                    notStatusIds.size > 0 &&
                    notStatusIds.size < board.kanbanColumns.length
                  }
                  onChange={(e) =>
                    setAllStatusFilter(
                      e.target.checked,
                      board.kanbanColumns.map((c) => c.id)
                    )
                  }
                >
                  Hammasi
                </Checkbox>
                {board.kanbanColumns.map((col) => (
                  <Checkbox
                    key={col.id}
                    colorScheme="blue"
                    isChecked={!notStatusIds.has(String(col.id))}
                    onChange={(e) =>
                      toggleStatusFilter(col.id, e.target.checked)
                    }
                  >
                    <HStack spacing={2}>
                      {/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(col.color) ? (
                        <Box
                          w="10px"
                          h="10px"
                          borderRadius="full"
                          bg={col.color}
                          flexShrink={0}
                        />
                      ) : null}
                      <Text fontSize="sm">{col.name || "—"}</Text>
                    </HStack>
                  </Checkbox>
                ))}
              </Flex>
            </Box>

            <HStack
              spacing={2}
              flexShrink={0}
              alignSelf={{ base: "flex-start", lg: "auto" }}
            >
              {thisDay && clearMode ? (
                <>
                  <Button
                    variant="outline"
                    borderRadius="lg"
                    h="40px"
                    flexShrink={0}
                    onClick={exitClearMode}
                  >
                    Bekor
                  </Button>
                  <Badge
                    colorScheme={
                      (board.selectedTaskIds?.size ?? 0) > 0 ? "green" : "gray"
                    }
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="sm"
                    fontWeight="semibold"
                  >
                    Tanlangan: {board.selectedTaskIds?.size ?? 0}
                  </Badge>
                  <Button
                    leftIcon={<Trash2 size={16} />}
                    colorScheme="red"
                    borderRadius="lg"
                    h="40px"
                    flexShrink={0}
                    isLoading={activeClearing}
                    isDisabled={(board.selectedTaskIds?.size ?? 0) === 0}
                    onClick={handleClearActive}
                  >
                    {`Tozalash${
                      board.selectedTaskIds?.size
                        ? ` (${board.selectedTaskIds.size})`
                        : ""
                    }`}
                  </Button>
                </>
              ) : thisDay ? (
                <Button
                  leftIcon={<Trash2 size={16} />}
                  colorScheme="red"
                  variant="outline"
                  borderRadius="lg"
                  h="40px"
                  flexShrink={0}
                  onClick={enterClearMode}
                >
                  Tozalash
                </Button>
              ) : null}

              <Flex
                as="button"
                type="button"
                onClick={() => setThisDay((v) => !v)}
                align="center"
                gap={2}
                px={4}
                h="40px"
                flexShrink={0}
                borderRadius="lg"
                fontSize="sm"
                fontWeight="semibold"
                borderWidth="1px"
                transition="all 0.15s ease"
                bg={thisDay ? "blue.500" : "surface"}
                color={thisDay ? "white" : "text"}
                borderColor={thisDay ? "blue.500" : "border"}
                _hover={{ borderColor: "blue.400" }}
              >
                <CalendarDays size={16} />
                <Text as="span">{thisDay ? "Hammasi" : "Faqat bugun"}</Text>
              </Flex>
            </HStack>
          </Flex>
        ) : null}
      </Flex>

      {board.restoring || board.loading || board.statusesLoading ? (
        <Center py={16}>
          <AppSpinner size="xl" />
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
          kanbanColumns={visibleColumns}
          grouped={board.grouped}
          columnByKey={board.columnByKey}
          countByStatus={board.countByStatus}
          setRows={board.setRows}
          setCountByStatus={board.setCountByStatus}
          onPersistScroll={board.schedulePersistScroll}
          onDragSessionStart={() => {
            board.onDragSessionStart?.();
            startDragAutoScroll();
          }}
          onDragSessionEnd={() => {
            board.onDragSessionEnd?.();
            stopDragAutoScroll();
          }}
          onCancelDropRequest={board.setCancelDrop}
          assignMode={board.assignMode || clearMode}
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
            <AppSpinner size="xl" />
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
            toast({ title: "O'chirildi", status: "success", duration: 2500 , position:"top"});
            setDeleteTarget(null);
            board.refetchFirstPage({ silent: true });
          } catch (e) {
            console.error(e);
            toast({ title: "Xatolik", status: "error", duration: 4000,  position:"top" });
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
            toast({ title: "O'chirildi", status: "success",  position:"top" });
            onDelStatusClose();
            setStatusDeleteTarget(null);
            board.setStatusListTick((n) => n + 1);
          } catch (e) {
            console.error(e);
            toast({ title: "Xatolik", status: "error",  position:"top" });
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