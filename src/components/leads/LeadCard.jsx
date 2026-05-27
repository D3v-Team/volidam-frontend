import {
    Box,
    Flex,
    Text,
    Icon,
    IconButton,
    useColorModeValue,
} from "@chakra-ui/react";
import { Phone, Trash2 } from "lucide-react";
import { LEAD_CARD_MIN_H_COMPACT, volidamDangerIconButton } from "./leadStyles";

export default function LeadCard({ lid, onOpen, onDelete, isDragging }) {
    const borderColor = useColorModeValue("rgba(244, 143, 177, 0.4)", "whiteAlpha.200");
    const hoverBorder = useColorModeValue("brand.500", "brand.300");
    const cardBg = useColorModeValue("rgba(255, 255, 255, 0.95)", "whiteAlpha.50");
    const phoneColor = useColorModeValue("brand.600", "brand.300");

    const title = lid.fio?.trim() || "—";
    const phone = lid.telefon_raqam?.trim() || "";
    const hasFooter = !!phone;

    return (
        <Box
            p={3.5}
            minH={hasFooter ? undefined : LEAD_CARD_MIN_H_COMPACT}
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
            <Flex align="flex-start" gap={2} mb={hasFooter ? 2.5 : 0} minW={0}>
                <Text
                    fontWeight="800"
                    fontSize="sm"
                    lineHeight="short"
                    noOfLines={3}
                    letterSpacing="0.03em"
                    flex={1}
                    minW={0}
                    pr={1}
                    color="text"
                >
                    {title}
                </Text>

                {onDelete ? (
                    <IconButton
                        {...volidamDangerIconButton}
                        aria-label="Lidni o'chirish"
                        icon={<Trash2 size={15} />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(lid);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                ) : null}
            </Flex>

            {hasFooter ? (
                <Flex
                    flexWrap="wrap-reverse"
                    justify="space-between"
                    align="center"
                    columnGap={2}
                    rowGap={1.5}
                    w="100%"
                    minW={0}
                    mt="auto"
                >
                    <LeadCardPhone phone={phone} phoneColor={phoneColor} />
                </Flex>
            ) : null}
        </Box>
    );
}

function LeadCardPhone({ phone, phoneColor }) {
    if (!phone) return null;
    return (
        <Flex align="center" gap={1.5} flexShrink={0} minW={0} maxW="100%">
            <Icon as={Phone} boxSize={3.5} color={phoneColor} flexShrink={0} />
            <Text fontSize="xs" fontWeight="700" color="text" noOfLines={1}>
                {phone}
            </Text>
        </Flex>
    );
}
