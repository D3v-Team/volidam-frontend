import React, { useEffect, useState } from "react";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    Button,
    VStack,
    HStack,
    Text,
    Input,
    Box,
  
    useColorModeValue,
    FormControl,
    FormLabel,
} from "@chakra-ui/react";
import { useToast } from "../../../hooks/useToast";
import { apiTaskStatuses } from "../../../utils/Controllers/apiTaskStatuses";

function normalizeHex(v) {
    const s = String(v ?? "").trim();
    if (/^#[0-9a-f]{6}$/i.test(s)) return s;
    if (/^#[0-9a-f]{3}$/i.test(s)) return s;
    return "#378ADD";
}

function formatApiErr(e) {
    const m = e?.response?.data?.message;
    if (Array.isArray(m)) return m.join(". ");
    return m ? String(m) : "";
}

export default function EditTaskStatusModal({
    isOpen,
    onClose,
    column,
    onUpdated,
}) {
    const toast = useToast();
    const borderCol = useColorModeValue("gray.200", "whiteAlpha.200");
    const headerBorder = useColorModeValue("gray.200", "whiteAlpha.200");
    const footerBg = useColorModeValue("gray.50", "whiteAlpha.50");
    const heroBg = useColorModeValue(
        "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 50%, #ddd6fe 100%)",
        "linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(99,102,241,0.22) 100%)"
    );

    const [name, setName] = useState("");
    const [colorHex, setColorHex] = useState("#378ADD");
    const [order, setOrder] = useState("1");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen || !column?.id) return;
        setName(String(column.name ?? "").trim());
        setColorHex(normalizeHex(column.color || "#378ADD"));
        setOrder(String(Number(column.order) || 0));
    }, [isOpen, column?.id, column?.name, column?.color, column?.order]);

    const syncColorFromPicker = (e) => {
        setColorHex(normalizeHex(e.target.value));
    };

    const submit = async () => {
        const id = column?.id;
        if (!id) return;
        const n = String(name || "").trim();
        if (!n) {
            toast({
                title: "Nom",
                description: "Status nomini kiriting",
                status: "warning",
                duration: 3000,
                isClosable: true,
                position:"top"
            });
            return;
        }
        const ord = parseInt(String(order).trim(), 10);
        if (!Number.isFinite(ord) || ord < 0) {
            toast({
                title: "Tartib",
                description: "Tartib raqami musbat butun son bo‘lishi kerak",
                status: "warning",
                duration: 3000,
                isClosable: true,
                 position:"top"
            });
            return;
        }
        const body = {
            name: n,
            color: normalizeHex(colorHex),
            order: ord,
        };
        setSubmitting(true);
        try {
            await apiTaskStatuses.update(id, body);
            toast({
                title: "Saqlandi",
                description: "Status yangilandi",
                status: "success",
                duration: 2500,
                isClosable: true,
                 position:"top"
            });
            onUpdated?.();
            onClose?.();
        } catch (e) {
            console.error(e);
            toast({
                title: "Xatolik",
                description: formatApiErr(e) || "Statusni yangilab bo‘lmadi",
                status: "error",
                duration: 5000,
                isClosable: true,
                 position:"top"
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen && !!column?.id}
            onClose={onClose}
            isCentered
            size="md"
            motionPreset="slideInBottom"
        >
            <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(6px)" />
            <ModalContent
                bg="surface"
                borderRadius="2xl"
                overflow="hidden"
                boxShadow="2xl"
                borderWidth="1px"
                borderColor={borderCol}
            >
                <Box
                    px={6}
                    py={4}
                    borderBottomWidth="1px"
                    borderColor={headerBorder}
                    bgImage={heroBg}
                >
                    <Text fontWeight="bold" fontSize="lg" pr={10}>
                        Statusni tahrirlash
                    </Text>
                    <Text fontSize="sm" color="gray.500" mt={1}>
                        Nom, rang va tartib
                    </Text>
                    <ModalCloseButton top={4} />
                </Box>

                <ModalBody px={6} py={5}>
                    <VStack align="stretch" spacing={4}>
                        <FormControl>
                            <FormLabel fontSize="sm">Nom</FormLabel>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                borderRadius="lg"
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm">Rang</FormLabel>
                            <HStack spacing={3}>
                                <Input
                                    type="color"
                                    value={normalizeHex(colorHex)}
                                    onChange={syncColorFromPicker}
                                    w="56px"
                                    h="40px"
                                    p={1}
                                    borderRadius="lg"
                                    cursor="pointer"
                                />
                                <Input
                                    value={colorHex}
                                    onChange={(e) =>
                                        setColorHex(e.target.value)
                                    }
                                    borderRadius="lg"
                                    fontFamily="mono"
                                    size="sm"
                                />
                            </HStack>
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm">Tartib (order)</FormLabel>
                            <Input
                                type="number"
                                min={0}
                                value={order}
                                onChange={(e) => setOrder(e.target.value)}
                                borderRadius="lg"
                            />
                        </FormControl>
                    </VStack>
                </ModalBody>

                <ModalFooter
                    bg={footerBg}
                    borderTopWidth="1px"
                    borderColor={headerBorder}
                    gap={3}
                >
                    <Button variant="ghost" onClick={onClose} isDisabled={submitting}>
                        Bekor qilish
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={submit}
                        isLoading={submitting}
                        borderRadius="xl"
                    >
                        Saqlash
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
