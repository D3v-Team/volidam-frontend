import {
  Box,
  Flex,
  Text,
  Icon,
  IconButton,
  useColorModeValue,
  Checkbox,
  Divider,
  Badge,
} from "@chakra-ui/react";

import {
  Phone,
  Trash2,
  Clock,
  User,
  UsersRound,
  UsersIcon,
  ShieldUser,
} from "lucide-react";
import { LEAD_CARD_MIN_H_COMPACT, volidamDangerIconButton } from "./leadStyles";
import { formatDateTime } from "../../utils/tools/formatDateTime";

function getInitials(name) {
  if (!name || name === "—") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function LeadCard({
  lid,
  onOpen,
  onDelete,
  isDragging,
  assignMode,
  selectedLeadIds,
  setSelectedLeadIds,
}) {
  const borderColor = useColorModeValue(
    "rgba(244, 143, 177, 0.4)",
    "whiteAlpha.200",
  );
  const hoverBorder = useColorModeValue("brand.500", "brand.300");
  const cardBg = useColorModeValue(
    "rgba(255, 255, 255, 0.95)",
    "whiteAlpha.50",
  );
  const phoneColor = useColorModeValue("brand.600", "brand.300");
  const metaColor = useColorModeValue("textSecondary", "gray.400");

  const title = lid.fio?.trim() || "—";
  const phone = lid.telefon_raqam?.trim() || "";
  const assignee = lid.assignee?.full_name || "";
  const parents = lid.ota_ona_fio?.trim() || "";
  const createdLabel = formatDateTime(lid.createdAt, "uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const hasDate = createdLabel && createdLabel !== "-";

  const isChecked = selectedLeadIds?.includes(lid.id);
  console.log("assignMode", assignMode);

  return (
    <Box
      px={5}
      py={5}
      w="100%"
      minW={0}
      overflow="hidden"
      display="flex"
      flexDirection="column"
      borderRadius="2xl"
      border="1px solid"
      borderColor={borderColor}
      bg={cardBg}
      opacity={isDragging ? 0.85 : 1}
      transition={
        isDragging
          ? "none"
          : "border-color 0.2s, box-shadow 0.2s, transform 0.15s"
      }
      boxShadow="0 2px 12px rgba(233, 30, 99, 0.06)"
      _hover={
        isDragging
          ? undefined
          : {
              transform: "translateY(-2px)",
              borderColor: hoverBorder,
              boxShadow: "0 8px 24px rgba(233, 30, 99, 0.12)",
            }
      }
      cursor="grab"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("lidId", lid.id);
        e.dataTransfer.setData("statusId", lid.status_id || "");
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => {
        if (assignMode) {
          if (isChecked) {
            setSelectedLeadIds((prev) => prev.filter((id) => id !== lid.id));
          } else {
            setSelectedLeadIds((prev) => [...prev, lid.id]);
          }

          return;
        }

        onOpen(lid);
      }}
    >
      <Flex justify="space-between" align="center" mb={4}>
        {assignMode && (
          <Checkbox
            isChecked={isChecked}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedLeadIds((prev) => [...prev, lid.id]);
              } else {
                setSelectedLeadIds((prev) =>
                  prev.filter((id) => id !== lid.id),
                );
              }
            }}
          />
        )}
        <Text fontWeight="800" fontSize="2xl" color="text" noOfLines={2}>
          {title}
        </Text>

        {onDelete && (
          <IconButton
            {...volidamDangerIconButton}
            size="sm"
            aria-label="Lidni o'chirish"
            icon={<Trash2 size={17} />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(lid);
            }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        )}
      </Flex>

      <Flex align="center" gap={2} mb={3}>
        <Icon as={UsersIcon} boxSize={4} color={metaColor} />
        <Text fontSize="md" fontWeight="600" color="text">
          {parents}
        </Text>
      </Flex>

      <Flex align="center" gap={2} mb={4}>
        <Icon as={Phone} boxSize={4} color={phoneColor} />
        <Text fontSize="md" fontWeight="700" color="text">
          {phone}
        </Text>
      </Flex>

      <Divider mb={4} />

      <Flex justify="space-between" align="center" mt="auto">
        <Flex align="center" gap={2}>
          <Icon as={ShieldUser} boxSize={4} color={metaColor} />
          <Text fontSize="sm" fontWeight="700" color="text">
            {assignee}
          </Text>
        </Flex>

        {hasDate && (
          <Flex align="center" gap={2}>
            <Icon as={Clock} boxSize={4} color={metaColor} />
            <Text fontSize="sm" fontWeight="600" color={metaColor}>
              {createdLabel}
            </Text>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}

