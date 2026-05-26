import { useEffect, useState } from "react";
import {
  Box, Heading, Button, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, Input, FormControl, FormLabel, IconButton,
  HStack, useToast, Spinner, Center, Text, Badge,
  SimpleGrid, Avatar, Flex,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon, AddIcon, LockIcon, ChevronLeftIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { apiUsers } from "../../Services/api/Users";
// import { ArrowLeft } from "lucide-react";

const emptyForm = {
  full_name: "",
  username: "",
  password: "",
  role: "admin",
};


const roleColor = (role) => {
  switch (role) {
    case "admin":
      return "red";
    case "manager":
      return "blue";
    default:
      return "gray";
  }
};

export default function Admins() {
const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const {
    isOpen: isFormOpen,
    onOpen: onFormOpen,
    onClose: onFormClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const {
    isOpen: isResetOpen,
    onOpen: onResetOpen,
    onClose: onResetClose,
  } = useDisclosure();

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
     <HStack justify="space-between" mb={6}>
    <HStack spacing={2}>
        <IconButton
            // icon={<ArrowLeft size={18} />}
            variant="ghost"
            aria-label="Orqaga"
            onClick={() => navigate("/superadmin")}
        />
        <Heading size="lg" color="text">Adminlar</Heading>
    </HStack>
    <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={handleOpenAdd}>
        Yaratish
    </Button>
</HStack>

      {loading ? (
        <Center py={10}>
          <Spinner size="xl" />
        </Center>
      ) : users.length === 0 ? (
        <Center py={10}>
          <Text color="gray.400">Ma'lumot yo'q</Text>
        </Center>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing={4}>
          {users.map((user) => (
            <Box
              key={user.id}
              bg="surface"
              border="1px solid"
              borderColor="border"
              borderRadius="xl"
              p={4}
              transition="box-shadow 0.2s"
              _hover={{ boxShadow: "md" }}
            >
              <Flex align="center" gap={3} mb={3}>
                <Avatar
                  size="md"
                  name={user.full_name}
                  bg="red.500"
                  color="white"
                  flexShrink={0}
                />
                <Box minW={0}>
                  <Text
                    fontWeight="700"
                    fontSize="sm"
                    color="text"
                    noOfLines={1}
                  >
                    {user.full_name}
                  </Text>
                  <Text fontSize="xs" color="gray.500" noOfLines={1}>
                    @{user.username}
                  </Text>
                </Box>
              </Flex>

              <Badge
                colorScheme={roleColor(user.role)}
                borderRadius="md"
                px={2}
                py={0.5}
                fontSize="xs"
                mb={3}
              >
                {user.role}
              </Badge>

              <Flex
                borderTopWidth="1px"
                borderColor="border"
                pt={3}
                justify="flex-end"
                gap={1}
              >
                <IconButton
                  size="sm"
                  icon={<EditIcon />}
                  colorScheme="blue"
                  variant="ghost"
                  aria-label="Tahrirlash"
                  onClick={() => handleOpenEdit(user)}
                />
                <IconButton
                  size="sm"
                  icon={<LockIcon />}
                  colorScheme="orange"
                  variant="ghost"
                  aria-label="Parolni tiklash"
                  onClick={() => {
                    setResetId(user.id);
                    onResetOpen();
                  }}
                />
                <IconButton
                  size="sm"
                  icon={<DeleteIcon />}
                  colorScheme="red"
                  variant="ghost"
                  aria-label="O'chirish"
                  onClick={() => {
                    setDeleteId(user.id);
                    onDeleteOpen();
                  }}
                />
              </Flex>
            </Box>
          ))}
        </SimpleGrid>
      )}

      <Modal isOpen={isFormOpen} onClose={onFormClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editId ? "Adminni tahrirlash" : "Admin qo'shish"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody display="flex" flexDirection="column" gap={3}>
            <FormControl>
              <FormLabel>To'liq ism</FormLabel>
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
            <Button variant="ghost" onClick={onFormClose}>
              Bekor qilish
            </Button>
            <Button colorScheme="blue" onClick={handleSubmit}>
              {editId ? "Saqlash" : "Qo'shish"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered size="sm">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>O'chirishni tasdiqlang</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Haqiqatan ham bu foydalanuvchini o'chirmoqchimisiz?</Text>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={onDeleteClose}>
              Yo'q
            </Button>
            <Button colorScheme="red" onClick={handleDelete}>
              Ha, o'chirish
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isResetOpen} onClose={onResetClose} isCentered size="sm">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Parolni tiklash</ModalHeader>
          <ModalCloseButton />
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
            <Button variant="ghost" onClick={onResetClose}>
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
