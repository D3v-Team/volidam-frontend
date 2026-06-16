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
    Input,
    Select,
    Box,
   
    useColorModeValue,
    FormControl,
    FormLabel,
} from "@chakra-ui/react";

import { apiTaskStatuses } from "../../../utils/Controllers/apiTaskStatuses";
import { useToast } from "../../../hooks/useToast";

const TASK_TYPE_OPTIONS = [
    { value: "company", label: "Kompaniya" },
    { value: "notification", label: "Bildirishnoma" },
    { value: "price_update", label: "Narx yangilash" },
    { value: "reorder", label: "Mahsulot topish" },
    { value: "developer", label: "Dasturiy ta'minot" },
    { value: "other", label: "Boshqa" },
];

function normalizeHex(v) {
    const s = String(v ?? "").trim();
    if (/^#[0-9a-f]{6}$/i.test(s)) return s;
    if (/^#[0-9a-f]{3}$/i.test(s)) return s;
    return "#378ADD";
}

function randomColorHex() {
    // curated palette (good contrast, not too light)
    const palette = [
        "#0EA5E9", // sky
        "#22C55E", // green
        "#F97316", // orange
        "#A855F7", // purple
        "#E11D48", // rose
        "#14B8A6", // teal
        "#F59E0B", // amber
        "#3B82F6", // blue
        "#EC4899", // pink
        "#9CA3AF", // gray
        "#7C3AED", // violet
    ];
    return palette[Math.floor(Math.random() * palette.length)];
}

export default function CreateTaskStatusModal({
    isOpen,
    onClose,
    defaultTaskType = "company",
    suggestedOrder = 1,
    onCreated,
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
    const [taskType, setTaskType] = useState("company");
    const [colorHex, setColorHex] = useState("#378ADD");
    const [order, setOrder] = useState("1");
    const [submitting, setSubmitting] = useState(false);

    const orderDefault = useMemo(
        () => (Number.isFinite(Number(suggestedOrder)) ? String(suggestedOrder) : "1"),
        [suggestedOrder]
    );

    useEffect(() => {
        if (!isOpen) return;
        setName("");
        const tt = String(defaultTaskType || "").trim();
        const ok = TASK_TYPE_OPTIONS.some((o) => o.value === tt);
        setTaskType(ok ? tt : "company");
        setColorHex(randomColorHex());
        setOrder(orderDefault);
    }, [isOpen, defaultTaskType, orderDefault]);

    const syncColorFromPicker = (e) => {
        setColorHex(normalizeHex(e.target.value));
    };

    const submit = async () => {
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
            task_type: String(taskType).trim(),
            color: normalizeHex(colorHex),
            order: ord,
        };
        setSubmitting(true);
        try {
            await apiTaskStatuses.create(body);
            toast({
                title: "Yaratildi",
                description: "Status saqlandi",
                status: "success",
                duration: 2500,
                isClosable: true,
                 position:"top"
            });
            onCreated?.();
            onClose?.();
        } catch (e) {
            console.error(e);
            const msg = e?.response?.data?.message;
            toast({
                title: "Xatolik",
                description: Array.isArray(msg)
                    ? msg.join(". ")
                    : msg || "Status yaratib bo‘lmadi",
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
            isOpen={isOpen}
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
                        Yangi status
                    </Text>
                    <Text fontSize="sm" color="gray.500" mt={1}>
                        Joriy vazifa turi uchun ustun qo‘shiladi
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
                                placeholder="Masalan: Telefon qilindi"
                                borderRadius="lg"
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm">Vazifa turi</FormLabel>
                            <Select
                                value={taskType}
                                onChange={(e) => setTaskType(e.target.value)}
                                borderRadius="lg"
                            >
                                {TASK_TYPE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </Select>
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
                                    placeholder="#378ADD"
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
