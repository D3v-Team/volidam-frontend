import {
  Box,
  HStack,
  Text,
  VStack,
  Center,
  Grid,
  GridItem,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Spinner,
  useColorModeValue,
  Checkbox,
  Tooltip,
  SimpleGrid,
  Flex,
} from "@chakra-ui/react";
import { useState } from "react";
import { MoreVertical, Pencil, Trash2, Plus, LayoutGrid } from "lucide-react";
import LeadCard from "./LeadCard";

function ColumnHeaderActionsMenu({
  onEditColumn,
  onDeleteColumn,
  onAddChild,
  showAddChild,
  showEdit,
  showDelete,
  bannerActionHover,
}) {
  const menuHoverBg = useColorModeValue("gray.50", "whiteAlpha.100");
  const menuDangerHoverBg = useColorModeValue("red.50", "whiteAlpha.100");
  const dangerColor = useColorModeValue("red.200", "red.300");

  return (
    <Menu placement="bottom-end" isLazy>
      <MenuButton
        as={IconButton}
        aria-label="Status amallari"
        icon={<MoreVertical size={16} />}
        size="xs"
        variant="ghost"
        borderRadius="md"
        color="whiteAlpha.900"
        _hover={{ bg: bannerActionHover }}
        onClick={(e) => e.stopPropagation()}
      />
      <MenuList minW="180px" zIndex={20}>
        {showAddChild ? (
          <MenuItem
            icon={<Plus size={14} />}
            onClick={(e) => { e.stopPropagation(); onAddChild?.(); }}
            borderRadius="md"
            _hover={{ bg: menuHoverBg }}
          >
            Child qo&apos;shish
          </MenuItem>
        ) : null}
        {showEdit ? (
          <MenuItem
            icon={<Pencil size={14} />}
            onClick={(e) => { e.stopPropagation(); onEditColumn?.(); }}
            borderRadius="md"
            _hover={{ bg: menuHoverBg }}
          >
            Tahrirlash
          </MenuItem>
        ) : null}
        {showDelete ? (
          <MenuItem
            icon={<Trash2 size={14} />}
            color={dangerColor}
            onClick={(e) => { e.stopPropagation(); onDeleteColumn?.(); }}
            borderRadius="md"
            _hover={{ bg: menuDangerHoverBg }}
          >
            O&apos;chirish
          </MenuItem>
        ) : null}
      </MenuList>
    </Menu>
  );
}

/**
 * Child chip — filter YO'Q holati uchun.
 * Rang yo'q, faqat nom + border. Sodda chip.
 */
function ChildChipPlain({ child }) {
  const chipBg = useColorModeValue("whiteAlpha.300", "whiteAlpha.150");
  return (
    <Box
      px={2}
      py={1}
      borderRadius="md"
      bg={chipBg}
      border="1px solid"
      borderColor="whiteAlpha.400"
      display="flex"
      alignItems="center"
      gap="5px"
      minW={0}
      overflow="hidden"
    >
      <Text
        fontSize="10px"
        fontWeight="700"
        color="white"
        letterSpacing="wide"
        textTransform="uppercase"
        noOfLines={1}
        flex={1}
        minW={0}
      >
        {child.name}
      </Text>
    </Box>
  );
}

/**
 * Child card — filter BOR holati, "showChildren" mode uchun.
 * Rang bilan, 3-nuqta amallar (tahrirlash, o'chirish).
 */
function ChildCardFull({ child, onEdit, onDelete, canManage }) {
  const menuHoverBg = useColorModeValue("gray.50", "whiteAlpha.100");
  const menuDangerHoverBg = useColorModeValue("red.50", "whiteAlpha.100");
  const dangerColor = useColorModeValue("red.200", "red.300");
  const cardBorder = useColorModeValue("gray.200", "whiteAlpha.200");

  return (
    <Box
      borderRadius="xl"
      overflow="hidden"
      borderWidth="1px"
      borderColor={cardBorder}
    >
      <Flex
        px={3}
        py={2.5}
        align="center"
        justify="space-between"
        style={{ background: child.color || "#378ADD" }}
        gap={2}
      >
        <HStack spacing={2} minW={0} flex={1}>
          <Box
            w="8px"
            h="8px"
            borderRadius="full"
            bg="whiteAlpha.800"
            flexShrink={0}
          />
          <Text
            fontSize="xs"
            fontWeight="700"
            color="white"
            textTransform="uppercase"
            letterSpacing="wide"
            noOfLines={1}
            flex={1}
            minW={0}
          >
            {child.name}
          </Text>
        </HStack>

        {canManage ? (
          <Menu placement="bottom-end" isLazy>
            <MenuButton
              as={IconButton}
              aria-label="Child amallar"
              icon={<MoreVertical size={13} />}
              size="xs"
              variant="ghost"
              borderRadius="md"
              color="white"
              _hover={{ bg: "whiteAlpha.300" }}
              onClick={(e) => e.stopPropagation()}
              flexShrink={0}
            />
            <MenuList minW="160px" zIndex={20}>
              <MenuItem
                icon={<Pencil size={13} />}
                onClick={(e) => { e.stopPropagation(); onEdit?.(child); }}
                borderRadius="md"
                _hover={{ bg: menuHoverBg }}
              >
                Tahrirlash
              </MenuItem>
              <MenuItem
                icon={<Trash2 size={13} />}
                color={dangerColor}
                onClick={(e) => { e.stopPropagation(); onDelete?.(child); }}
                borderRadius="md"
                _hover={{ bg: menuDangerHoverBg }}
              >
                O&apos;chirish
              </MenuItem>
            </MenuList>
          </Menu>
        ) : null}
      </Flex>
    </Box>
  );
}

export default function KanbanColumn({
  status,
  lids = [],
  count = 0,
  loading,
  colLayout,
  onOpenLid,
  onDeleteLid,
  onDropLid,
  onEditStatus,
  onDeleteStatus,
  onAddChildStatus,
  canManageStatuses,
  canManageChildStatuses,
  isDragOver,
  onDragOver,
  onDragLeave,
  assignMode,
  selectedLeadIds,
  setSelectedLeadIds,
  // isFiltered: filter orqali bitta status tanlangan (SharedLeadsPage dan keladi)
  isFiltered = false,
  // showFilteredChildren: filter rejimda toolbar toggle holati (tashqaridan boshqariladi)
  showFilteredChildren = false,
}) {
  // Filter yo'q holda — ichki toggle; filter bor holda — tashqi prop
  const [showChildrenLocal, setShowChildrenLocal] = useState(false);
  const showChildren = isFiltered ? showFilteredChildren : showChildrenLocal;

  const bg = useColorModeValue("gray.50", "whiteAlpha.50");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const activeBg = useColorModeValue("brand.50", "whiteAlpha.100");
  const activeBorder = useColorModeValue("brand.300", "brand.400");
  const emptyBorder = useColorModeValue("gray.200", "gray.600");
  const emptyText = useColorModeValue("gray.500", "gray.400");
  const bannerActionHover = useColorModeValue("blackAlpha.100", "whiteAlpha.200");
  const emptyInnerBg = useColorModeValue("white", "transparent");
  const chipsPanelBg = useColorModeValue("blackAlpha.100", "whiteAlpha.50");

  const accent = status?.color || "#378ADD";
  const displayCount = Number(count) > 0 ? count : lids.length;
  const isChild = Boolean(status?.isChild);
  const hasChildren = Array.isArray(status?.children) && status.children.length > 0;

  const canManage = canManageStatuses || canManageChildStatuses;
  const showAddChild = false;
  const showEdit = canManageChildStatuses ? isChild : canManageStatuses;
  const showDelete = canManageChildStatuses ? isChild : canManageStatuses;

  // Category toggle tugmasi header ichida faqat filter YO'Q holda ko'rinadi
  // (filter holida toolbar'dagi toggle ishlatiladi)
  const showCategoryToggleInHeader = hasChildren && !isFiltered;

  // Filter holida showChildren = true bo'lsa → faqat child cardlar (rangli, amallar bilan)
  // Filter holida showChildren = false → leads + header ichida rangsiz chiplar
  // Filter yo'q → leads + header ichida rangsiz chiplar (showChildren toggle)

  return (
    <Box
      flex={colLayout?.flex}
      minW={colLayout?.minW ?? 0}
      maxW={colLayout?.maxW}
      w={colLayout?.w}
      overflow="hidden"
      bg={isDragOver ? activeBg : bg}
      borderWidth="1px"
      borderColor={isDragOver ? activeBorder : border}
      borderRadius="2xl"
      p={3}
      minH="400px"
      h="auto"
      alignSelf="stretch"
      display="flex"
      flexDirection="column"
      transition="background 0.15s ease, border-color 0.15s ease"
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(status.id); }}
      onDragLeave={() => onDragLeave?.()}
      onDrop={(e) => {
        e.preventDefault();
        const lidId = e.dataTransfer.getData("lidId");
        const fromStatusId = e.dataTransfer.getData("statusId");
        if (lidId) onDropLid(lidId, fromStatusId, status.id);
      }}
    >
      {/* ── Column header banner ── */}
      <Box
        alignSelf="stretch"
        mx={-3}
        mt={-3}
        mb={3}
        px={3}
        pt={3}
        pb={2.5}
        bg={accent}
        borderTopRadius="2xl"
        flexShrink={0}
        overflow="hidden"
      >
        <Grid
          templateColumns="minmax(0,1fr) auto minmax(0,1fr)"
          alignItems="center"
          gap={2}
        >
          <GridItem />
          <GridItem justifySelf="center" minW={0}>
            <HStack spacing={2} justify="center" flexWrap="wrap">
              {assignMode && (
                <Checkbox
                  isChecked={
                    lids.length > 0 &&
                    lids.every((lid) => selectedLeadIds.includes(lid.id))
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedLeadIds((prev) => [
                        ...new Set([...prev, ...lids.map((l) => l.id)]),
                      ]);
                    } else {
                      setSelectedLeadIds((prev) =>
                        prev.filter((id) => !lids.some((lid) => lid.id === id))
                      );
                    }
                  }}
                />
              )}
              <VStack spacing={0} align="center">
                {status.parentStatusName && isChild ? (
                  <Text
                    fontSize="10px"
                    fontWeight="600"
                    color="whiteAlpha.800"
                    textTransform="uppercase"
                    letterSpacing="wider"
                    noOfLines={1}
                  >
                    {status.parentStatusName}
                  </Text>
                ) : null}
                <Text
                  fontWeight="700"
                  fontSize="md"
                  color="white"
                  textAlign="center"
                  noOfLines={2}
                >
                  {status.name}
                </Text>
              </VStack>
              <Text fontSize="sm" fontWeight="semibold" color="whiteAlpha.900">
                {displayCount}
              </Text>
            </HStack>
          </GridItem>

          <GridItem justifySelf="end">
            <HStack spacing={1}>
              {/* Category toggle — filter YO'Q holda header ichida */}
              {showCategoryToggleInHeader ? (
                <Tooltip
                  label={showChildren ? "Yopish" : "Kategoriyalar"}
                  placement="top"
                  hasArrow
                >
                  <IconButton
                    aria-label="Kategoriyalar"
                    icon={<LayoutGrid size={15} />}
                    size="xs"
                    variant="ghost"
                    borderRadius="md"
                    color="whiteAlpha.900"
                    bg={showChildren ? "whiteAlpha.400" : "transparent"}
                    _hover={{ bg: bannerActionHover }}
                    onClick={(e) => { e.stopPropagation(); setShowChildrenLocal((v) => !v); }}
                  />
                </Tooltip>
              ) : null}

              {canManage ? (
                <ColumnHeaderActionsMenu
                  onEditColumn={() => onEditStatus?.(status)}
                  onDeleteColumn={() => onDeleteStatus?.(status)}
                  onAddChild={() => onAddChildStatus?.(status)}
                  showAddChild={showAddChild}
                  showEdit={showEdit}
                  showDelete={showDelete}
                  bannerActionHover={bannerActionHover}
                />
              ) : null}
            </HStack>
          </GridItem>
        </Grid>

        {/* ── Rangsiz chiplar paneli — category bosilganda yoki filter bo'lmasa ham ── */}
        {hasChildren && showChildren && !(isFiltered && showChildren) ? (
          <Box
            mt={2.5}
            mx={-3}
            px={3}
            pt={2.5}
            pb={2}
            bg={chipsPanelBg}
            borderTop="1px solid"
            borderColor="whiteAlpha.200"
          >
            <SimpleGrid columns={4} spacing={1.5}>
              {status.children.map((child) => (
                <ChildChipPlain key={child.id} child={child} />
              ))}
            </SimpleGrid>
          </Box>
        ) : null}
      </Box>

      {/* ── Column body ── */}
      <Box flex={1} minH={0}>
        {loading && lids.length === 0 ? (
          <Center py={10}>
            <Spinner size="md" color="gray.400" />
          </Center>
        ) : isFiltered && hasChildren && showChildren ? (
          /* Filter + showChildren=true → child cardlar 4 tadan grid (rangli, amallar bilan) */
          <SimpleGrid columns={4} spacing={2}>
            {status.children.map((child) => (
              <ChildCardFull
                key={child.id}
                child={child}
                canManage={canManageChildStatuses}
                onEdit={(c) =>
                  onEditStatus?.({ ...c, isChild: true, childData: c.childData ?? c })
                }
                onDelete={(c) =>
                  onDeleteStatus?.({ ...c, isChild: true, childData: c.childData ?? c })
                }
              />
            ))}
          </SimpleGrid>
        ) : lids.length === 0 ? (
          <Center
            py={10}
            minH="120px"
            borderWidth="1px"
            borderStyle="dashed"
            borderColor={emptyBorder}
            borderRadius="xl"
            bg={emptyInnerBg}
          >
            <VStack spacing={2}>
              <Text fontWeight="700" color={emptyText}>
                Lidlar yo&apos;q
              </Text>
              <Text fontSize="sm" color={emptyText}>
                Bu statusda hozircha lid yo&apos;q.
              </Text>
            </VStack>
          </Center>
        ) : (
          <VStack align="stretch" spacing={2}>
            {lids.map((lid) => (
              <LeadCard
                key={lid.id}
                lid={{ ...lid, status_id: lid.status_id || status.id }}
                onOpen={onOpenLid}
                onDelete={onDeleteLid}
                assignMode={assignMode}
                selectedLeadIds={selectedLeadIds}
                setSelectedLeadIds={setSelectedLeadIds}
              />
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
}