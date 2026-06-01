import {
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Icon,
  FormControl,
  FormLabel,
  useColorModeValue,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Toast,
} from "@chakra-ui/react";
import { Search } from "lucide-react";
import { filterFieldProps, searchFieldProps } from "./leadStyles";
import { useState } from "react";
import { useToast } from "@chakra-ui/react";
import { apiUsers } from "../../Services/api/Users";

export default function LeadsFilters({
  statuses,
  statusId,
  onStatusIdChange,
  role,
  onRoleChange,
  assignedId,
  onAssignedIdChange,
  users,
  usersLoading,
  search,
  onSearchChange,
  assignMode,
  onAssignLeads,
  setAssignMode,

  selectedLeadIds,

  setSelectedLeadIds,
}) {
  const labelColor = useColorModeValue("textSecondary", "gray.300");
  const iconColor = useColorModeValue("brand.400", "gray.400");

  const assignModal = useDisclosure();
  const [selectedRole, setSelectedRole] = useState("");
  const [assignUsers, setAssignUsers] = useState([]);
  const [assignUsersLoading, setAssignUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const handleRoleChange = async (role) => {
    console.log("ROLE =>", role);
    setSelectedRole(role);
    setSelectedUserId("");
    setAssignUsers([]);

    if (!role) return;

    setAssignUsersLoading(true);

    try {
      const res = await apiUsers.getUsers(role);

      setAssignUsers(res.data?.data ?? res.data ?? []);
    } catch {
      setAssignUsers([]);
    } finally {
      setAssignUsersLoading(false);
    }
  };


  const handleAssign = async () => {
  if (!selectedUserId) return;

  await onAssignLeads({
    lid_ids: selectedLeadIds,
    assigned_id: selectedUserId,
  });

  assignModal.onClose();
  setAssignMode(false);
  setSelectedLeadIds([]);
  setSelectedUserId("");
  setSelectedRole("");
  setAssignUsers([]);
};



  return (
    <>
      <Flex
        gap={3}
        mb={4}
        flexWrap="wrap"
        align={{ base: "stretch", md: "flex-end" }}
      >
        {/* 1: Rol tanlash */}
        <FormControl maxW={{ base: "full", md: "180px" }} flex="0 0 auto">
          <FormLabel fontSize="xs" color={labelColor} mb={1} fontWeight="600">
            Rol
          </FormLabel>
          <Select
            {...filterFieldProps}
            size="sm"
            h="36px"
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
          >
            <option value="">Barcha rollar</option>
            <option value="operator">Operator</option>
            <option value="admin">Admin</option>
          </Select>
        </FormControl>

        {/* 2: Hodim tanlash — rol tanlanganda faollashadi */}
        <FormControl maxW={{ base: "full", md: "180px" }} flex="0 0 auto">
          <FormLabel fontSize="xs" color={labelColor} mb={1} fontWeight="600">
            Hodim
          </FormLabel>
          <Select
            {...filterFieldProps}
            size="sm"
            h="36px"
            value={assignedId}
            onChange={(e) => onAssignedIdChange(e.target.value)}
           isDisabled={!role || usersLoading}
          >
            <option value="">
              {!role
                ? "Avval rol tanlang"
                : usersLoading
                  ? "Yuklanmoqda..."
                  : "Barcha hodimlar"}
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fio ?? u.name ?? u.full_name ?? u.id}
              </option>
            ))}
          </Select>
        </FormControl>

        {/* 3: Status */}

        {/* 4: Qidiruv */}
        <FormControl w={{ base: "full", md: "450px" }} flex="0 0 auto">
          <FormLabel fontSize="xs" color={labelColor} mb={1} fontWeight="600">
            Qidiruv
          </FormLabel>
          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none" h="36px">
              <Icon as={Search} color={iconColor} boxSize={3.5} />
            </InputLeftElement>
            <Input
              {...searchFieldProps}
              pl={8}
              placeholder="FIO, telefon..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </InputGroup>
        </FormControl>
        {!assignMode ? (
          <Button
            size="md"
            colorScheme="pink"
            onClick={() => setAssignMode(true)}
          >
            Hodim Biriktirish
          </Button>
        ) : (
          <>
        <Button
  colorScheme="pink"
  onClick={assignModal.onOpen}
  isDisabled={selectedLeadIds.length === 0}
>
  Saqlash ({selectedLeadIds.length})
</Button>
            <Button
              variant="outline"
              onClick={() => {
                setAssignMode(false);
                setSelectedLeadIds([]);
              }}
            >
              Bekor qilish
            </Button>
          </>
        )}
      </Flex>

      <Modal
        isOpen={assignModal.isOpen}
        onClose={assignModal.onClose}
        isCentered
      >
        <ModalOverlay />

        <ModalContent>
          <ModalHeader>Hodim biriktirish</ModalHeader>

          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Rol</FormLabel>

              <Select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
              >
                <option value="">Rol tanlang</option>

                <option value="operator">Operator</option>

                <option value="admin">Admin</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Hodim</FormLabel>

              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                isDisabled={!role || usersLoading}
              >
                <option value="">
                  {assignUsersLoading ? "Yuklanmoqda..." : "Hodim tanlang"}
                </option>

                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fio ?? u.name ?? u.username ?? u.id}
                  </option>
                ))}
              </Select>
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button mr={3} onClick={assignModal.onClose}>
              Yopish
            </Button>
            <Button
  colorScheme="pink"
  onClick={handleAssign}
  isDisabled={!selectedUserId}
>
  Biriktirish
</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
