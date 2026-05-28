import {
    Box,
    Flex,
    Text,
    Icon,
    IconButton,
    Avatar,
    useColorModeValue,
} from "@chakra-ui/react";
import { Phone, Trash2, Clock } from "lucide-react";
import { LEAD_CARD_MIN_H_COMPACT, volidamDangerIconButton } from "./leadStyles";
import { formatDateTime } from "../../utils/tools/formatDateTime";

export default function LeadCard({ lid, onOpen, onDelete, isDragging }) {
    const borderColor = useColorModeValue("rgba(244, 143, 177, 0.4)", "whiteAlpha.200");
    const hoverBorder = useColorModeValue("brand.500", "brand.300");
    const cardBg = useColorModeValue("rgba(255, 255, 255, 0.95)", "whiteAlpha.50");
    const phoneColor = useColorModeValue("brand.600", "brand.300");
    const metaColor = useColorModeValue("textSecondary", "gray.400");

    const title = lid.fio?.trim() || "—";
    const phone = lid.telefon_raqam?.trim() || "";
    const createdLabel = formatDateTime(lid.createdAt, "uz-UZ", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
    const hasMeta = !!phone || (createdLabel && createdLabel !== "-");

    return (
        <Box
            p={3.5}
            minH={hasMeta ? undefined : LEAD_CARD_MIN_H_COMPACT}
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
            onClick={() => onOpen(lid)}
        >
            <Flex align="flex-start" gap={3} minW={0}>
                <Avatar
                    name={title !== "—" ? title : "Lid"}
                    size="lg"
                    bg="brand.500"
                    color="white"
                    flexShrink={0}
                />

                <Box flex="1" minW={0}>
                    <Flex align="flex-start" justify="space-between" gap={2}>
                        <Text
                            fontWeight="700"
                            fontSize="md"
                            color="text"
                            noOfLines={2}
                            letterSpacing="0.02em"
                            flex="1"
                            minW={0}
                        >
                            {title}
                        </Text>

                        {onDelete ? (
                            <IconButton
                                {...volidamDangerIconButton}
                                size="xs"
                                aria-label="Lidni o'chirish"
                                icon={<Trash2 size={14} />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(lid);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        ) : null}
                    </Flex>

                    {hasMeta ? (
                        <Flex
                            direction="column"
                            align="flex-start"
                            gap={1.5}
                            mt={2.5}
                        >
                            {createdLabel && createdLabel !== "-" ? (
                                <Flex align="center" gap={1.5} minW={0} maxW="100%">
                                    <Icon
                                        as={Clock}
                                        boxSize={3.5}
                                        color={metaColor}
                                        flexShrink={0}
                                    />
                                    <Text
                                        fontSize="xs"
                                        fontWeight="600"
                                        color={metaColor}
                                        noOfLines={1}
                                    >
                                        {createdLabel}
                                    </Text>
                                </Flex>
                            ) : null}
                            {phone ? (
                                <Flex align="center" gap={1.5} minW={0} maxW="100%">
                                    <Icon
                                        as={Phone}
                                        boxSize={3.5}
                                        color={phoneColor}
                                        flexShrink={0}
                                    />
                                    <Text
                                        fontSize="xs"
                                        fontWeight="700"
                                        color="text"
                                        noOfLines={1}
                                    >
                                        {phone}
                                    </Text>
                                </Flex>
                            ) : null}
                        </Flex>
                    ) : null}
                </Box>
            </Flex>
        </Box>
    );
}
