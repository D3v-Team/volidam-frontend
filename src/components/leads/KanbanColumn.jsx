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
} from "@chakra-ui/react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import LeadCard from "./LeadCard";

function ColumnHeaderActionsMenu({
  onEditColumn,
  onDeleteColumn,
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
      <MenuList minW="160px" zIndex={20}>
        <MenuItem
          icon={<Pencil size={14} />}
          onClick={(e) => {
            e.stopPropagation();
            onEditColumn?.();
          }}
          borderRadius="md"
          _hover={{ bg: menuHoverBg }}
        >
          Tahrirlash
        </MenuItem>
        <MenuItem
          icon={<Trash2 size={14} />}
          color={dangerColor}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteColumn?.();
          }}
          borderRadius="md"
          _hover={{ bg: menuDangerHoverBg }}
        >
          O&apos;chirish
        </MenuItem>
      </MenuList>
    </Menu>
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
  canManageStatuses,
  isDragOver,
  onDragOver,
  onDragLeave,
  assignMode,

  selectedLeadIds,

  setSelectedLeadIds,
}) {
  const bg = useColorModeValue("gray.50", "whiteAlpha.50");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const activeBg = useColorModeValue("brand.50", "whiteAlpha.100");
  const activeBorder = useColorModeValue("brand.300", "brand.400");
  const emptyBorder = useColorModeValue("gray.200", "gray.600");
  const emptyText = useColorModeValue("gray.500", "gray.400");
  const bannerActionHover = useColorModeValue(
    "blackAlpha.100",
    "whiteAlpha.200",
  );
  const emptyInnerBg = useColorModeValue("white", "transparent");

  const accent = status?.color || "#378ADD";
  const displayCount = Number(count) > 0 ? count : lids.length;

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
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(status.id);
      }}
      onDragLeave={() => onDragLeave?.()}
      onDrop={(e) => {
        e.preventDefault();
        const lidId = e.dataTransfer.getData("lidId");
        const fromStatusId = e.dataTransfer.getData("statusId");
        if (lidId) onDropLid(lidId, fromStatusId, status.id);
      }}
    >
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
                        prev.filter((id) => !lids.some((lid) => lid.id === id)),
                      );
                    }
                  }}
                />
              )}
              <Text
                fontWeight="700"
                fontSize="md"
                color="white"
                textAlign="center"
                noOfLines={2}
              >
                {status.name}
              </Text>
              <Text fontSize="sm" fontWeight="semibold" color="whiteAlpha.900">
                {displayCount}
              </Text>
            </HStack>
          </GridItem>
          <GridItem justifySelf="end">
            {canManageStatuses ? (
              <ColumnHeaderActionsMenu
                onEditColumn={() => onEditStatus?.(status)}
                onDeleteColumn={() => onDeleteStatus?.(status)}
                bannerActionHover={bannerActionHover}
              />
            ) : null}
          </GridItem>
        </Grid>
      </Box>

      <Box flex={1} minH={0}>
        {loading && lids.length === 0 ? (
          <Center py={10}>
            <Spinner size="md" color="gray.400" />
          </Center>
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
