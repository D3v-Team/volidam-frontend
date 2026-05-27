import { useEffect, useState } from "react";
import {
    Box,
    Heading,
    Button,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    useDisclosure,
    Input,
    FormControl,
    FormLabel,
    HStack,
    useToast,
    Spinner,
    Center,
    Text,
    SimpleGrid,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import { apiUsers } from "../../Services/api/Users";
import UserCard from "../../components/ui/UserCard";
import {
    volidamPrimaryButton,
    volidamGhostButton,
    volidamModalCloseButton,
} from "../../components/ui/volidamUi";

const emptyForm = {
    full_name: "",
    username: "",
    password: "",
    role: "admin",
};

export default function Admins() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [editId, setEditId] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [resetId, setResetId] = useState(null);
    const [newPassword, setNewPassword] = useState("");

    const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
    const { isOpen: isResetOpen, onOpen: onResetOpen, onClose: onResetClose } = useDisclosure();

    const toast = useToast();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await apiUsers.getUsers("admin");
            setUsers(res.data || []);
        } catch {
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenAdd = () => {
        setEditId(null);
        setFormData(emptyForm);
        onFormOpen();
    };

    const handleOpenEdit = (user) => {
        setEditId(user.id);
        setFormData({
            full_name: user.full_name,
            username: user.username,
            password: "",
            role: user.role,
        });
        onFormOpen();
    };

    const handleSubmit = async () => {
        try {
            if (editId) {
                await apiUsers.Update(formData, editId);
            } else {
                await apiUsers.Add(formData);
            }
            onFormClose();
            setFormData(emptyForm);
            await fetchUsers();
        } catch {
            toast({ title: "Xatolik yuz berdi", status: "error", duration: 3000 });
        }
    };

    const handleDelete = async () => {
        try {
            await apiUsers.Delete(deleteId);
            onDeleteClose();
            fetchUsers();
        } catch {
            toast({ title: "Xatolik yuz berdi", status: "error", duration: 3000 });
        }
    };

    const handleResetPassword = async () => {
        try {
            await apiUsers.ResetPassword(resetId, { password: newPassword });
            onResetClose();
            setNewPassword("");
        } catch {
            toast({ title: "Xatolik yuz berdi", status: "error", duration: 3000 });
        }
    };

    return (
        <Box p={6}>
            <HStack justify="space-between" mb={4}>
                <Heading size="lg" color="text">
                    Adminlar
                </Heading>
                <Button leftIcon={<AddIcon />} {...volidamPrimaryButton} onClick={handleOpenAdd}>
                    Yaratish
                </Button>
            </HStack>

            {loading ? (
                <Center py={10}>
                    <Spinner size="xl" />
                </Center>
            ) : users.length === 0 ? (
                <Center py={10}>
                    <Text color="textSecondary">Ma&apos;lumot yo&apos;q</Text>
                </Center>
            ) : (
                <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
                    {users.map((user) => (
                        <UserCard
                            key={user.id}
                            user={user}
                            onEdit={handleOpenEdit}
                            onResetPassword={(u) => {
                                setResetId(u.id);
                                onResetOpen();
                            }}
                            onDelete={(u) => {
                                setDeleteId(u.id);
                                onDeleteOpen();
                            }}
                        />
                    ))}
                </SimpleGrid>
            )}

            <Modal isOpen={isFormOpen} onClose={onFormClose} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{editId ? "Adminni tahrirlash" : "Admin qo'shish"}</ModalHeader>
                    <ModalCloseButton {...volidamModalCloseButton} />
                    <ModalBody display="flex" flexDirection="column" gap={3}>
                        <FormControl>
                            <FormLabel>To&apos;liq ism</FormLabel>
                            <Input
                                value={formData.full_name}
                                onChange={(e) =>
                                    setFormData({ ...formData, full_name: e.target.value })
                                }
                                placeholder="John Doe"
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel>Username</FormLabel>
                            <Input
                                value={formData.username}
                                onChange={(e) =>
                                    setFormData({ ...formData, username: e.target.value })
                                }
                                placeholder="john"
                            />
                        </FormControl>
                        {!editId && (
                            <FormControl>
                                <FormLabel>Parol</FormLabel>
                                <Input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({ ...formData, password: e.target.value })
                                    }
                                    placeholder="••••••••"
                                />
                            </FormControl>
                        )}
                    </ModalBody>
                    <ModalFooter gap={2}>
                        <Button {...volidamGhostButton} onClick={onFormClose}>
                            Bekor qilish
                        </Button>
                        <Button {...volidamPrimaryButton} onClick={handleSubmit}>
                            {editId ? "Saqlash" : "Qo'shish"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered size="sm">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>O&apos;chirishni tasdiqlang</ModalHeader>
                    <ModalCloseButton {...volidamModalCloseButton} />
                    <ModalBody>
                        <Text>Haqiqatan ham bu foydalanuvchini o&apos;chirmoqchimisiz?</Text>
                    </ModalBody>
                    <ModalFooter gap={2}>
                        <Button {...volidamGhostButton} onClick={onDeleteClose}>
                            Yo&apos;q
                        </Button>
                        <Button colorScheme="red" onClick={handleDelete}>
                            Ha, o&apos;chirish
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal isOpen={isResetOpen} onClose={onResetClose} isCentered size="sm">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Parolni tiklash</ModalHeader>
                    <ModalCloseButton {...volidamModalCloseButton} />
                    <ModalBody>
                        <FormControl>
                            <FormLabel>Yangi parol</FormLabel>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </FormControl>
                    </ModalBody>
                    <ModalFooter gap={2}>
                        <Button {...volidamGhostButton} onClick={onResetClose}>
                            Bekor qilish
                        </Button>
                        <Button colorScheme="orange" onClick={handleResetPassword}>
                            Saqlash
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
}
