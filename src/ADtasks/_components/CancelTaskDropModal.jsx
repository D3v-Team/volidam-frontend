import React, { useEffect, useState } from "react";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    Button,
    Textarea,
    Text,
    VStack,
    useColorModeValue,
} from "@chakra-ui/react";

export default function CancelTaskDropModal({
    isOpen,
    onClose,
    taskTitle = "",
    existingNote = "",
    onConfirm,
    isSubmitting = false,
}) {
    const [reason, setReason] = useState("");
    const labelColor = useColorModeValue("gray.700", "gray.300");
    const muted = useColorModeValue("gray.600", "gray.400");

    useEffect(() => {
        if (isOpen) setReason("");
    }, [isOpen]);

    const submit = async () => {
        const t = String(reason ?? "").trim();
        if (!t) return;
        await onConfirm?.(t);
    };

    const canSubmit = String(reason ?? "").trim().length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
            <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
            <ModalContent borderRadius="2xl" bg="surface" borderWidth="1px" borderColor="border">
                <ModalHeader pb={1}>Bekor qilish</ModalHeader>
                <ModalCloseButton isDisabled={isSubmitting} />
                <ModalBody>
                    <VStack align="stretch" spacing={4}>
                 
                        <Text fontSize="xs" color={muted} mb={2}>
                            Izoh avval chatga yoziladi, so‘ng status yangilanadi.
                        </Text>
                        <Text fontSize="sm" fontWeight="semibold" color={labelColor}>
                            Bekor qilish sababi (chat)
                        </Text>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Chat uchun izoh..."
                            rows={4}
                            borderRadius="xl"
                            isDisabled={isSubmitting}
                        />
                        {existingNote ? (
                            <>
                                <Text fontSize="sm" fontWeight="semibold" color={labelColor}>
                                    Joriy izoh
                                </Text>
                                <Text fontSize="sm" color={muted} whiteSpace="pre-wrap">
                                    {existingNote}
                                </Text>
                            </>
                        ) : (
                            <Text fontSize="xs" color={muted}>
                                Joriy izoh yo‘q — faqat bekor qilish sababi qo‘shiladi.
                            </Text>
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter gap={3}>
                    <Button variant="ghost" onClick={onClose} isDisabled={isSubmitting}>
                        Orqaga
                    </Button>
                    <Button
                        colorScheme="red"
                        onClick={submit}
                        isLoading={isSubmitting}
                        loadingText="Saqlanmoqda..."
                        isDisabled={!String(reason ?? "").trim()}
                        borderRadius="xl"
                    >
                        Statusni yangilash
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
