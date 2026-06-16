import React, { useEffect, useMemo, useState } from "react";
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
    Select,
    Input,
    Textarea,
    Box,
    useColorModeValue,
    Icon,
} from "@chakra-ui/react";
import { Pencil, CalendarDays, Flag } from "lucide-react";
import { toTashkentDatetimeLocalValue } from "../../../utils/date/tashkent";

function normToken(v) {
    return String(v ?? "")
        .trim()
        .toLowerCase();
}

export default function EditTaskModal({
    isOpen,
    onClose,
    task,
    onSave,
    isSaving,
}) {
    const panelBg = useColorModeValue("gray.50", "whiteAlpha.50");
    const borderCol = useColorModeValue("gray.200", "whiteAlpha.200");
    const headerBorder = useColorModeValue("gray.200", "whiteAlpha.200");
    const footerBg = useColorModeValue("gray.50", "whiteAlpha.50");
    const heroBg = useColorModeValue(
        "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 50%, #ddd6fe 100%)",
        "linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(99,102,241,0.22) 100%)"
    );

    const defaults = useMemo(() => {
        const t = task || {};
        return {
            priority: String(t.priority || "normal"),
            dueDate: toTashkentDatetimeLocalValue(t.due_date || t.dueDate),
        };
    }, [task]);

    const taskTypeLower = useMemo(
        () => normToken(task?.type),
        [task?.type]
    );

    const showNoteField = useMemo(
        () =>
            [
                "notification",
                "notfic",
                "developer",
                "other",
                "company",
            ].includes(taskTypeLower),
        [taskTypeLower]
    );

    const showProductFields = useMemo(
        () => ["price_update", "reorder"].includes(taskTypeLower),
        [taskTypeLower]
    );

    const title = useMemo(() => {
        const t = task || {};
        const d = t?.details && typeof t.details === "object" ? t.details : {};
        const notePreview = String(d.note ?? d.izoh ?? "").trim();
        return (
            d.product_name ||
            t?.product_name ||
            notePreview ||
            (t?.id != null ? `#${String(t.id)}` : "")
        );
    }, [task]);

    const [priority, setPriority] = useState("normal");
    const [dueDate, setDueDate] = useState("");
    const [note, setNote] = useState("");
    const [productName, setProductName] = useState("");
    const [categoryName, setCategoryName] = useState("");

    const taskType = String(task?.type ?? "").trim();

    useEffect(() => {
        if (!isOpen) return;
        setPriority(defaults.priority);
        setDueDate(defaults.dueDate);
    }, [isOpen, defaults.priority, defaults.dueDate]);

    useEffect(() => {
        if (!isOpen || !task) return;
        const d = task.details && typeof task.details === "object" ? task.details : {};
        setNote(String(d.note ?? d.izoh ?? ""));
        setProductName(String(d.product_name ?? ""));
        setCategoryName(String(d.category_name ?? ""));
    }, [isOpen, task]);

    const submit = async () => {
        const payload = { priority };
        if (dueDate) {
            const d = new Date(dueDate);
            if (!Number.isNaN(d.getTime())) payload.due_date = d.toISOString();
        } else {
            payload.due_date = null;
        }

        const baseDetails =
            task?.details && typeof task.details === "object"
                ? { ...task.details }
                : {};
        if (showNoteField) {
            payload.details = { ...baseDetails, note: note.trim() };
        } else if (showProductFields) {
            payload.details = {
                ...baseDetails,
                product_name: productName.trim(),
                category_name: categoryName.trim(),
            };
        }

        await onSave?.(payload);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            isCentered
            size="lg"
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
                    py={5}
                    borderBottomWidth="1px"
                    borderColor={headerBorder}
                    bgImage={heroBg}
                >
                    <HStack justify="space-between" pr={10} align="start">
                        <HStack spacing={3} align="start">
                            <Box
                                w="40px"
                                h="40px"
                                borderRadius="xl"
                                bg={useColorModeValue("white", "whiteAlpha.200")}
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                flexShrink={0}
                            >
                                <Icon as={Pencil} boxSize={5} color="blue.600" />
                            </Box>
                            <Box minW={0}>
                                <Text fontWeight="bold" fontSize="lg">
                                    Vazifani tahrirlash
                                </Text>
                                {title ? (
                                    <Text
                                        fontSize="sm"
                                        color="gray.500"
                                        mt={0.5}
                                        noOfLines={2}
                                    >
                                        {title}
                                    </Text>
                                ) : (
                                    <Text fontSize="sm" color="gray.500" mt={0.5}>
                                        Muhimlik va muddatni o‘zgartiring
                                    </Text>
                                )}
                            </Box>
                        </HStack>
                        <ModalCloseButton top={4} />
                    </HStack>
                </Box>

                <ModalBody px={6} py={5}>
                    <VStack align="stretch" spacing={4}>
                        <Box
                            p={4}
                            bg={panelBg}
                            borderRadius="xl"
                            borderWidth="1px"
                            borderColor={borderCol}
                        >
                            <HStack justify="space-between" mb={2}>
                                <HStack spacing={2}>
                                    <Icon as={Flag} boxSize={4} color="purple.500" />
                                    <Text fontSize="sm" fontWeight="semibold">
                                        Muhimlik
                                    </Text>
                                </HStack>
                            </HStack>
                            <Select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                borderRadius="lg"
                            >
                                <option value="low">Past</option>
                                <option value="normal">Oddiy</option>
                                <option value="high">Yuqori</option>
                                <option value="urgent">Shoshilinch</option>
                            </Select>
                        </Box>

                        <Box
                            p={4}
                            bg={panelBg}
                            borderRadius="xl"
                            borderWidth="1px"
                            borderColor={borderCol}
                        >
                            <HStack justify="space-between" mb={2} align="center">
                                <HStack spacing={2}>
                                    <Icon as={CalendarDays} boxSize={4} color="orange.500" />
                                    <Text fontSize="sm" fontWeight="semibold">
                                        Muddat (ixtiyoriy)
                                    </Text>
                                </HStack>
                            </HStack>
                            <Input
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                borderRadius="lg"
                            />
                            <Text fontSize="xs" color="gray.500" mt={2}>
                                Vaqt zonasi: Toshkent (Asia/Tashkent)
                            </Text>
                            <Text fontSize="xs" color="gray.500" mt={2}>
                                Bo‘sh qoldirsangiz, muddat o‘chiriladi.
                            </Text>
                        </Box>

                        {showNoteField ? (
                            <Box
                                p={4}
                                bg={panelBg}
                                borderRadius="xl"
                                borderWidth="1px"
                                borderColor={borderCol}
                            >
                                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                                    {taskTypeLower === "notification" || taskTypeLower === "notfic"
                                        ? "Bildirishnoma matni"
                                        : taskTypeLower === "company"
                                          ? "Izoh"
                                          : taskTypeLower === "developer"
                                            ? "Vazifa matni / izoh"
                                            : "Izoh"}
                                </Text>
                                <Textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    borderRadius="lg"
                                    rows={5}
                                    placeholder="Matnni kiriting..."
                                />
                            </Box>
                        ) : null}

                        {showProductFields ? (
                            <Box
                                p={4}
                                bg={panelBg}
                                borderRadius="xl"
                                borderWidth="1px"
                                borderColor={borderCol}
                            >
                                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                                    Mahsulot
                                </Text>
                                <VStack align="stretch" spacing={3}>
                                    <Box>
                                        <Text fontSize="xs" color="gray.500" mb={1}>
                                            Mahsulot nomi
                                        </Text>
                                        <Input
                                            value={productName}
                                            onChange={(e) => setProductName(e.target.value)}
                                            borderRadius="lg"
                                            placeholder="Mahsulot nomi"
                                        />
                                    </Box>
                                    <Box>
                                        <Text fontSize="xs" color="gray.500" mb={1}>
                                            Kategoriya (ixtiyoriy)
                                        </Text>
                                        <Input
                                            value={categoryName}
                                            onChange={(e) => setCategoryName(e.target.value)}
                                            borderRadius="lg"
                                            placeholder="Kategoriya"
                                        />
                                    </Box>
                                </VStack>
                            </Box>
                        ) : null}
                    </VStack>
                </ModalBody>

                <ModalFooter
                    bg={footerBg}
                    borderTopWidth="1px"
                    borderColor={headerBorder}
                    gap={3}
                    py={4}
                    px={6}
                >
                    <Button variant="ghost" onClick={onClose} isDisabled={isSaving}>
                        Bekor qilish
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={submit}
                        isLoading={isSaving}
                        loadingText="Saqlanmoqda..."
                        borderRadius="xl"
                        px={8}
                    >
                        Saqlash
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
