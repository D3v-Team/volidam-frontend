import {
  Box,
  Flex,
  Text,
  Icon,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import { Phone, Trash2, Clock, User } from "lucide-react";
import { LEAD_CARD_MIN_H_COMPACT, volidamDangerIconButton } from "./leadStyles";
import { formatDateTime } from "../../utils/tools/formatDateTime";

function getInitials(name) {
  if (!name || name === "—") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function LeadCard({ lid, onOpen, onDelete, isDragging }) {
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
  const createdLabel = formatDateTime(lid.createdAt, "uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const hasDate = createdLabel && createdLabel !== "-";

  return (
    <Box
      px={5}
      py={5}
      w="100%"
      minW={0}
      px={4}
      py={4}
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
      onClick={() => onOpen(lid)}
    >
      <Flex align="stretch" gap={4} minW={0}>
       

        <Box flex="1" minW={0}>
          <Flex align="center" gap={1.5} minW={0}>
            <Icon as={User} boxSize={5} color={metaColor} flexShrink={0} />
            <Text
              fontWeight="700"
              fontSize="lg"
              color="text"
              noOfLines={2}
              letterSpacing="0.02em"
              minW={0}
            >
              {title}
            </Text>
          </Flex>

          {phone ? (
            <Flex align="center" gap={1.5} mt={2} minW={0}>
              <Icon
                as={Phone}
                boxSize={4}
                color={phoneColor}
                flexShrink={0}
              />
              <Text fontSize="sm" fontWeight="700" color="text" noOfLines={1}>
                {phone}
              </Text>
            </Flex>
          ) : null}
        </Box>

        <Flex
          direction="column"
          align="flex-end"
          justify="space-between"
          flexShrink={0}
          minH="100%"
        >
          {onDelete ? (
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
          ) : (
            <Box />
          )}

          {hasDate ? (
            <Flex align="center" gap={1} mt={2}>
              <Icon as={Clock} boxSize={3.5} color={metaColor} flexShrink={0} />
              <Text
                fontSize="2xs"
                fontWeight="600"
                color={metaColor}
                whiteSpace="nowrap"
              >
                {createdLabel}
              </Text>
            </Flex>
          ) : null}
        </Flex>
      </Flex>
    </Box>
  );
}

