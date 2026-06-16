import { useEffect, useMemo, useState } from "react";
import {
    Button,
    VStack,
    Input,
  
    FormControl,
    FormLabel,
} from "@chakra-ui/react";
import { useToast } from "../../../hooks/useToast";
import { apiLocationStatuses } from "../../../utils/Controllers/apiLocationStatuses";
import AdTasksModalShell from "./AdTasksModalShell";

function formatApiErr(e) {
    const m = e?.response?.data?.message;
    if (Array.isArray(m)) return m.join(". ");
    return m ? String(m) : "";
}

export default function CreateLocationStatusModal({
    isOpen,
    onClose,
    suggestedOrder = 1,
    onCreated,
}) {
    const toast = useToast();
    const [name, setName] = useState("");
    const [order, setOrder] = useState("1");
    const [submitting, setSubmitting] = useState(false);

    const orderDefault = useMemo(
        () => (Number.isFinite(Number(suggestedOrder)) ? String(suggestedOrder) : "1"),
        [suggestedOrder]
    );

    useEffect(() => {
        if (!isOpen) return;
        setName("");
        setOrder(orderDefault);
    }, [isOpen, orderDefault]);

    const submit = async () => {
        const n = String(name ?? "").trim();
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
        setSubmitting(true);
        try {
            await apiLocationStatuses.create({ name: n, order: ord });
            toast({ title: "Status yaratildi", status: "success", duration: 2500 , position:"top"});
            onCreated?.();
            onClose();
        } catch (e) {
            toast({
                title: "Xatolik",
                description: formatApiErr(e) || "Yaratib bo'lmadi",
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
        <AdTasksModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Yangi status"
            subtitle="Kompaniya kanban ustuni qo‘shiladi"
            footer={
                <>
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
                </>
            }
        >
            <VStack align="stretch" spacing={4}>
                <FormControl isRequired>
                    <FormLabel fontSize="sm">Nom</FormLabel>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Masalan: Telefon qilindi"
                        borderRadius="lg"
                    />
                </FormControl>
                <FormControl isRequired>
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
        </AdTasksModalShell>
    );
}
