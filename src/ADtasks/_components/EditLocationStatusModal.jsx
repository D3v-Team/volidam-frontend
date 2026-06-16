import { useEffect, useState } from "react";
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

export default function EditLocationStatusModal({
    isOpen,
    onClose,
    column,
    onUpdated,
}) {
    const toast = useToast();
    const [name, setName] = useState("");
    const [order, setOrder] = useState("1");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen || !column?.id) return;
        setName(String(column.name ?? "").trim());
        setOrder(String(Number(column.order) || 0));
    }, [isOpen, column?.id, column?.name, column?.order]);

    const submit = async () => {
        const id = column?.id;
        if (!id) return;
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
            await apiLocationStatuses.update(id, { name: n, order: ord });
            toast({ title: "Saqlandi", status: "success", duration: 2500,  position:"top" });
            onUpdated?.();
            onClose();
        } catch (e) {
            toast({
                title: "Xatolik",
                description: formatApiErr(e) || "Yangilab bo'lmadi",
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
            isOpen={isOpen && !!column?.id}
            onClose={onClose}
            title="Statusni tahrirlash"
            subtitle="Nom va tartib"
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
