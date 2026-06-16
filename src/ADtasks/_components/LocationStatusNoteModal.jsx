import { useEffect, useState } from "react";
import {
    Button,
    Textarea,
    Text,
    VStack,
    FormControl,
    FormLabel,
    useColorModeValue,
} from "@chakra-ui/react";
import AdTasksModalShell from "./AdTasksModalShell";

/** Status o‘zgarishi — izoh chatga, keyin PUT /locations/{id}/status */
export default function LocationStatusNoteModal({
    isOpen,
    onClose,
    itemTitle = "",
    statusName = "",
    existingNote = "",
    onConfirm,
    isSubmitting = false,
    variant = "status",
}) {
    const [note, setNote] = useState("");
    const muted = useColorModeValue("gray.600", "gray.400");
    const isCancel = variant === "cancel";

    useEffect(() => {
        if (isOpen) setNote("");
    }, [isOpen]);

    const submit = async () => {
        const t = String(note ?? "").trim();
        if (!t) return;
        await onConfirm?.(t);
    };

    const title = isCancel ? "Bekor qilish" : "Statusni yangilash";
    const noteLabel = isCancel ? "Bekor qilish sababi (chat)" : "Izoh (chat)";
    return (
        <AdTasksModalShell
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title={title}
            subtitle="Izoh avval chatga yoziladi, so‘ng status yangilanadi"
            tone={isCancel ? "danger" : "default"}
            closeOnOverlayClick={!isSubmitting}
            footer={
                <>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        isDisabled={isSubmitting}
                    >
                        Bekor qilish
                    </Button>
                    <Button
                        colorScheme={isCancel ? "red" : "blue"}
                        onClick={submit}
                        isLoading={isSubmitting}
                        loadingText="Saqlanmoqda..."
                        isDisabled={!String(note ?? "").trim()}
                        borderRadius="xl"
                    >
                        {isCancel ? "Statusni yangilash" : "Saqlash"}
                    </Button>
                </>
            }
        >
            <VStack align="stretch" spacing={4}>
                {itemTitle ? (
                    <Text fontSize="sm" color={muted} noOfLines={2}>
                        {itemTitle}
                    </Text>
                ) : null}
                {statusName ? (
                    <Text fontSize="sm" color={muted}>
                        Yangi status:{" "}
                        <Text as="span" fontWeight="700" color="text">
                            {statusName}
                        </Text>
                    </Text>
                ) : null}
                <FormControl isRequired>
                    <FormLabel fontSize="sm">{noteLabel}</FormLabel>
                    <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Chat uchun izoh..."
                        rows={4}
                        borderRadius="lg"
                        isDisabled={isSubmitting}
                    />
                </FormControl>
                {existingNote ? (
                    <>
                        <Text fontSize="sm" fontWeight="semibold">
                            Joriy izoh
                        </Text>
                        <Text fontSize="sm" color={muted} whiteSpace="pre-wrap">
                            {existingNote}
                        </Text>
                    </>
                ) : null}
            </VStack>
        </AdTasksModalShell>
    );
}
