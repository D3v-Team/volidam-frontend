import { memo } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  Icon,
  useColorModeValue,
  useDisclosure,

  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Checkbox,
} from "@chakra-ui/react";
import { useToast } from "../../../hooks/useToast";
import {
  Info,
  Flag,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  MapPin,
  Star,
  User as UserIcon,
  Hash,
  Phone,
  Laptop,
} from "lucide-react";
import TaskDetailsModal from "./TaskDetailsModal";
import {
  taskTypeLabel,
  taskPriorityLabel,
  taskStatusLabel,
  assigneeTypeDisplay,
  assigneeFullNameDisplay,
  isTaskSourceAuto,
  formatWhen,
  adminPathForTaskLocation,
} from "./taskHelpers";
import { useNavigate } from "react-router-dom";

function TaskCard({
  row,
  onRequestEdit,
  onRequestDelete,
  /** optional: show selection checkbox (bulk assign mode) */
  selectionMode = false,
  isSelected = false,
  onToggleSelected,
  /** optional: open assign modal for this single task */
  onAssign,
  /** optional: hide "assign" action in menu */
  hideAssign = false,
  /** optional: only allow edit/delete if true */
  canEdit = true,
  density = "default",
  isDragging = false,
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const ratingScheme = (grade) => {
    const g = String(grade ?? "")
      .trim()
      .toUpperCase();
    if (!g) return "gray";
    if (g === "A") return "green";
    if (g === "B") return "yellow";
    if (g === "C") return "orange";
    if (g === "D" || g === "F") return "red";
    return "gray";
  };
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isMenuOpen,
    onOpen: onMenuOpen,
    onClose: onMenuClose,
  } = useDisclosure();
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const hoverBorder = useColorModeValue("blue.400", "blue.300");
  const subtle = useColorModeValue("gray.600", "gray.400");
  const cardBg = useColorModeValue("white", "whiteAlpha.50");
  const cardHoverBg = useColorModeValue(
    "linear-gradient(145deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%)",
    "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
  );
  const menuHoverBg = useColorModeValue("gray.50", "whiteAlpha.100");
  const menuDangerHoverBg = useColorModeValue("red.50", "whiteAlpha.100");
  const menuDangerColor = useColorModeValue("red.600", "red.300");
  const rawType = String(row?.type ?? "")
    .trim()
    .toLowerCase();
  const isNotif = rawType === "notification" || rawType === "notfic";
  const isCompany = rawType === "company";
  const isDeveloper = rawType === "developer";
  const d = row?.details && typeof row.details === "object" ? row.details : {};
  const note = d.note ?? d.izoh;
  const noteStr =
    note != null && String(note).trim() !== "" ? String(note).trim() : "";
  const locName =
    d.location_name != null && String(d.location_name).trim() !== ""
      ? String(d.location_name).trim()
      : "";
  const addr =
    d.address != null && String(d.address).trim() !== ""
      ? String(d.address).trim()
      : "";
  const title = isCompany
    ? locName || noteStr || addr || "—"
    : isDeveloper
      ? noteStr || "—"
      : isNotif
        ? noteStr || "—"
        : (row.details?.product_name ?? row.product_name ?? "—");
  const showCompanyAddr = isCompany && Boolean(addr);
  const showCompanyNoteExtra =
    isCompany && Boolean(noteStr) && noteStr !== String(title).trim();
  const showDeveloperNote = false;
  const inn =
    isCompany && d.inn != null && String(d.inn).trim() !== ""
      ? String(d.inn).trim()
      : "";
  const ratingGrade =
    isCompany && d.rating_grade != null && String(d.rating_grade).trim() !== ""
      ? String(d.rating_grade).trim()
      : "";
  const rating =
    isCompany && d.rating != null && String(d.rating).trim() !== ""
      ? String(d.rating).trim()
      : "";
  const director =
    isCompany &&
    (d.director_name != null || d.directorName != null) &&
    String(d.director_name ?? d.directorName).trim() !== ""
      ? String(d.director_name ?? d.directorName).trim()
      : "";
  const phone =
    isCompany && d.phone != null && String(d.phone).trim() !== ""
      ? String(d.phone).trim()
      : "";
  const created = row.created_at ?? row.createdAt;
  const assignee = assigneeTypeDisplay(row.assignee_type);
  const assigneeNameLine = assigneeFullNameDisplay(row);
  const sourceAuto = isTaskSourceAuto(row);
  const isSparse = density === "sparse";
  const showAssignAction =
    isCompany && !hideAssign && typeof onAssign === "function";
  const showDeleteAction = typeof onRequestDelete === "function";
  const hasAnyMenuAction =
    showAssignAction ||
    showDeleteAction ||
    (canEdit &&
      (typeof onRequestEdit === "function" ||
        typeof onRequestDelete === "function"));
  const companyDetailsPath = isCompany
    ? adminPathForTaskLocation(d?.location_type, d?.location_id)
    : null;
  const nonCompanyFixedH = { base: "156px", md: "156px" };
  const companyMinH = { base: "228px", md: "228px" };
  const companyChipSx = {
    variant: "subtle",
    borderRadius: "full",
    px: 2,
    py: 0.5,
    fontSize: "xs",
    fontWeight: "700",
    textTransform: "none",
    display: "inline-flex",
    alignItems: "center",
    maxW: "100%",
    flexShrink: 0,
    whiteSpace: "nowrap",
  };
  const hasRating = Boolean(ratingGrade || rating);
  const hasInn = Boolean(inn);
  const hasDirector = Boolean(director);
  const hasPhone = Boolean(phone);
  const hasMetaRow1 = hasRating || hasInn;
  const hasMetaRow2 = hasDirector || hasPhone;

  return (
    <>
      <Box
        p={3}
        borderRadius="2xl"
        border="1px solid"
        borderColor={borderColor}
        bg={cardBg}
        backgroundImage="none"
        display="flex"
        flexDirection="column"
        overflow={isCompany ? "hidden" : undefined}
        transition={
          isDragging
            ? "none"
            : "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease"
        }
        boxShadow={
          isSparse
            ? "0 2px 8px rgba(15, 23, 42, 0.06)"
            : "0 1px 3px rgba(15, 23, 42, 0.04)"
        }
        _hover={
          isDragging
            ? undefined
            : {
                transform: "translateY(-3px)",
                borderColor: hoverBorder,
                boxShadow: isSparse
                  ? "0 14px 28px -6px rgba(59, 130, 246, 0.22), 0 8px 16px -8px rgba(15, 23, 42, 0.12)"
                  : "0 10px 22px -6px rgba(59, 130, 246, 0.18), 0 4px 10px -4px rgba(15, 23, 42, 0.08)",
                bg: cardHoverBg,
              }
        }
        _active={isDragging ? undefined : { transform: "translateY(-1px)" }}
        h={isCompany ? companyMinH : nonCompanyFixedH}
        minH={isCompany ? companyMinH : nonCompanyFixedH}
        cursor="pointer"
        onClick={() => {
          if (selectionMode) {
            onToggleSelected?.(!isSelected);
            return;
          }
          if (isCompany) {
            if (companyDetailsPath) navigate(companyDetailsPath);
            return;
          }
          onOpen();
        }}
        onMouseLeave={onMenuClose}
      >
        <VStack
          align="stretch"
          spacing={isCompany ? 1.5 : 2}
          flex="1"
          justify="space-between"
        >
          <HStack justify="space-between" align="flex-start" spacing={2}>
            <HStack spacing={2} minW={0}>
              {selectionMode ? (
                <Box
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    isChecked={!!isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleSelected?.(e.target.checked);
                    }}
                    mt={0.5}
                  />
                </Box>
              ) : null}
              <Box minW={0} flex={1} display="flex" flexDirection="column">
                {isCompany ? (
                  <>
                    <Text
                      fontWeight="800"
                      fontSize="md"
                      lineHeight="short"
                      noOfLines={2}
                      minH="2.5rem"
                    >
                      {title}
                    </Text>
                    {showCompanyNoteExtra ? (
                      <Text mt={0.5} fontSize="xs" color={subtle} noOfLines={1}>
                        {noteStr}
                      </Text>
                    ) : null}
                    {showCompanyAddr ? (
                      <HStack
                        spacing={1}
                        mt={1}
                        color={subtle}
                        fontSize="xs"
                        align="flex-start"
                      >
                        <Icon
                          as={MapPin}
                          boxSize={3.5}
                          flexShrink={0}
                          mt={0.5}
                        />
                        <Text noOfLines={2} flex={1} minW={0}>
                          {addr}
                        </Text>
                      </HStack>
                    ) : null}
                    <Box mt={1.5} flexShrink={0}>
                      {hasMetaRow1 ? (
                        <Box
                          display="flex"
                          flexWrap="wrap"
                          gap={1.5}
                          alignItems="center"
                          mb={hasMetaRow2 ? 1.5 : 0}
                        >
                          {hasRating ? (
                            <Badge
                              colorScheme={ratingScheme(ratingGrade)}
                              {...companyChipSx}
                            >
                              <HStack spacing={1}>
                                <Icon as={Star} boxSize={3.5} />
                                <Text>
                                  {ratingGrade || "—"}
                                  {rating ? ` (${rating})` : ""}
                                </Text>
                              </HStack>
                            </Badge>
                          ) : null}
                          {hasInn ? (
                            <Badge
                              colorScheme="blue"
                              {...companyChipSx}
                              cursor="pointer"
                              _hover={{ bg: "blue.50" }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await navigator.clipboard.writeText(inn);
                                  toast({
                                    title: "INN nusxa bo‘ldi",
                                    status: "success",
                                    duration: 2000,
                                    isClosable: true,
                                     position:"top"
                                  });
                                } catch {
                                  toast({
                                    title: "Nusxalab bo‘lmadi",
                                    status: "error",
                                    duration: 3000,
                                    isClosable: true,
                                     position:"top"
                                  });
                                }
                              }}
                            >
                              <HStack spacing={1}>
                                <Icon as={Hash} boxSize={3.5} />
                                <Text fontFamily="mono">{inn}</Text>
                              </HStack>
                            </Badge>
                          ) : null}
                        </Box>
                      ) : null}
                      {hasMetaRow2 ? (
                        <Box
                          display="flex"
                          flexWrap="wrap"
                          gap={2}
                          alignItems="center"
                          mb={0}
                        >
                          {hasDirector ? (
                            <Badge
                              colorScheme="gray"
                              {...companyChipSx}
                              w="100%"
                              flexBasis="100%"
                              maxW="100%"
                              height="auto"
                              whiteSpace="normal"
                              alignItems="flex-start"
                            >
                              <HStack
                                spacing={1}
                                align="flex-start"
                                w="100%"
                                minW={0}
                              >
                                <Icon
                                  as={UserIcon}
                                  boxSize={3.5}
                                  flexShrink={0}
                                  mt={0.5}
                                />
                                <Text flex={1} minW={0} noOfLines={1}>
                                  {director}
                                </Text>
                              </HStack>
                            </Badge>
                          ) : null}
                          {hasPhone ? (
                            <Badge
                              colorScheme="teal"
                              {...companyChipSx}
                              flexShrink={0}
                            >
                              <HStack spacing={1}>
                                <Icon as={Phone} boxSize={3.5} />
                                <Text>{phone}</Text>
                              </HStack>
                            </Badge>
                          ) : null}
                        </Box>
                      ) : null}
                    </Box>
                  </>
                ) : (
                  <>
                    <Text fontWeight="800" fontSize="md" noOfLines={2}>
                      {title}
                    </Text>
                    {showDeveloperNote ? (
                      <Text mt={1} fontSize="sm" color={subtle} noOfLines={2}>
                        {noteStr}
                      </Text>
                    ) : null}
                    <HStack
                      spacing={2}
                      mt={1}
                      color={subtle}
                      fontSize="xs"
                      flexWrap="wrap"
                    >
                      <Badge
                        colorScheme="purple"
                        variant="subtle"
                        borderRadius="full"
                        px={2}
                        py={0.5}
                        textTransform="none"
                      >
                        {taskTypeLabel(row.type)}
                      </Badge>
                      <HStack spacing={1}>
                        <Icon as={Flag} boxSize={3.5} />
                        <Text>{taskPriorityLabel(row.priority)}</Text>
                      </HStack>
                    </HStack>
                  </>
                )}
              </Box>
            </HStack>

            <HStack spacing={1}>
              {!isCompany ? (
                <IconButton
                  icon={<Info size={18} />}
                  aria-label="Batafsil ma'lumot"
                  size="sm"
                  variant="ghost"
                  colorScheme="blue"
                  borderRadius="full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen();
                  }}
                />
              ) : null}
              {hasAnyMenuAction ? (
                <Menu
                  placement="bottom-end"
                  gutter={6}
                  isLazy
                  isOpen={isMenuOpen}
                  onOpen={onMenuOpen}
                  onClose={onMenuClose}
                  closeOnSelect
                  closeOnBlur
                >
                  <MenuButton
                    as={IconButton}
                    icon={<MoreVertical size={18} />}
                    aria-label="Amallar"
                    size="sm"
                    variant="ghost"
                    borderRadius="full"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isMenuOpen) onMenuClose();
                      else onMenuOpen();
                    }}
                  />
                  <MenuList
                    p={2}
                    borderRadius="xl"
                    boxShadow="xl"
                    borderWidth="1px"
                    minW="190px"
                    zIndex={20}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {showAssignAction ? (
                      <MenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onMenuClose();
                          setTimeout(() => onAssign?.(row), 0);
                        }}
                        borderRadius="lg"
                        _hover={{ bg: menuHoverBg }}
                        _focus={{ bg: menuHoverBg }}
                      >
                        Biriktirish
                      </MenuItem>
                    ) : null}
                    {canEdit && typeof onRequestEdit === "function" ? (
                      <MenuItem
                        icon={<Pencil size={16} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMenuClose();
                          setTimeout(() => onRequestEdit?.(row), 0);
                        }}
                        borderRadius="lg"
                        _hover={{ bg: menuHoverBg }}
                        _focus={{ bg: menuHoverBg }}
                      >
                        Tahrirlash
                      </MenuItem>
                    ) : null}
                    {showDeleteAction ? (
                      <MenuItem
                        icon={<Trash2 size={16} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMenuClose();
                          setTimeout(() => onRequestDelete?.(row), 0);
                        }}
                        borderRadius="lg"
                        color={menuDangerColor}
                        _hover={{ bg: menuDangerHoverBg }}
                        _focus={{ bg: menuDangerHoverBg }}
                      >
                        O‘chirish
                      </MenuItem>
                    ) : null}
                  </MenuList>
                </Menu>
              ) : null}
            </HStack>
          </HStack>

          <HStack
            justify="space-between"
            pt={isSparse ? 2 : 1}
            color={subtle}
            fontSize="xs"
            flexWrap="wrap"
          >
            <HStack spacing={2} minW={0}>
              <Icon
                as={isDeveloper ? Laptop : assignee.icon}
                boxSize={4}
                color={isDeveloper ? "teal.500" : `${assignee.color}.500`}
              />
              <Text noOfLines={1} maxW="220px">
                {assigneeNameLine}
              </Text>
              {sourceAuto ? (
                <Badge
                  colorScheme="teal"
                  variant="subtle"
                  borderRadius="full"
                  px={2}
                  py={0.5}
                  textTransform="none"
                >
                  auto
                </Badge>
              ) : null}
            </HStack>
            <HStack spacing={1}>
              <Icon as={Calendar} boxSize={3.5} />
              <Text>{formatWhen(created)}</Text>
            </HStack>
          </HStack>
        </VStack>
      </Box>

      {!isCompany ? (
        <TaskDetailsModal
          isOpen={isOpen}
          onClose={onClose}
          details={row.details}
          taskType={row.type}
          meta={{
            Turi: taskTypeLabel(row.type),
            Status: row?.status?.name ?? taskStatusLabel(row.status),
            Ustuvorligi: taskPriorityLabel(row.priority),
            "Mas'ul turi": assignee.label,
            "Mas'ul": assigneeNameLine,
            Muddat: row?.due_date ? formatWhen(row?.due_date) : "Belgilanmagan",
            "Yaratilgan vaqti": formatWhen(created),
            "Kim yaratdi":
              row?.created?.full_name ??
              row?.created?.username ??
              row?.created_by ??
              "—",
          }}
        />
      ) : null}
    </>
  );
}

export default memo(TaskCard);
