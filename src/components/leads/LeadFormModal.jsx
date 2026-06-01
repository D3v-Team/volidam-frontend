import {
  Button,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  VStack,
  Box,
  Text,
  Icon,
  HStack,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Checkbox,
  Select,
} from "@chakra-ui/react";
import { useEffect, useState, useRef } from "react";
import {
  FileSpreadsheet,
  X,
  Upload,
  UserPlus,
  XCircle,
  CheckCircle,
  User,
  Phone,
  Users,
  ArrowRight,
  Sparkles,
  Tag,
  ChevronDown,
  Shield,
} from "lucide-react";
import { apiLids } from "../../Services/api/Lids";
import { apiLidStatuses } from "../../Services/api/LidStatuses";
import { apiUsers } from "../../Services/api/Users";
import { toastService } from "../../utils/toast";
import { getApiErrorMessage } from "../../utils/lidStatus";

const ROLES = [
  { value: "operator", label: "Operator" },
  { value: "admin", label: "Admin" },
];

const empty = {
  fio: "",
  telefon_raqam: "",
  ota_ona_fio: "",
  assigned_id: "",
};

export default function LeadFormModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
  mode = "create",
  initialData = null,
  onImportSuccess,
}) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [importLoading, setImportLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [statusesLoading, setStatusesLoading] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const modalBg = "#2D1F35";
  const headerBg = "#331F3A";
  const footerBg = "#291B30";
  const inputBg = "#3A2442";
  const inputBgFocus = "#402A4A";
  const modalBorder = "rgba(180,80,120,0.15)";
  const inputBorder = "rgba(180,80,120,0.18)";
  const inputBorderHover = "rgba(200,100,140,0.35)";
  const inputBorderFocus = "#C2185B";
  const dividerColor = "rgba(180,80,120,0.12)";
  const titleColor = "#F0E8F0";
  const subtitleColor = "#9E8A9E";
  const labelColor = "#C8A8C8";
  const placeholderColor = "#6A5070";
  const accentGradient =
    "linear-gradient(135deg, #AD1457 0%, #C2185B 50%, #D81B60 100%)";
  const accentGradientHover =
    "linear-gradient(135deg, #880E4F 0%, #AD1457 50%, #C2185B 100%)";
  const accentColor = "#C2185B";
  const tabActiveText = "#E91E8C";
  const tabInactiveText = "#6A5070";
  const dropBg = "#301E38";
  const dropBgActive = "#3A2444";
  const dropBorder = "rgba(180,80,120,0.25)";
  const dropBorderActive = "#C2185B";
  const iconBg = "rgba(194,24,91,0.15)";
  const iconColor = "#E91E8C";
  const filePillBg = "#301E38";
  const overlayBg = "rgba(10,5,15,0.75)";
  const successBadgeBg = "#0D2B1A";
  const errorBadgeBg = "#2B0D0D";
  const tableHeadBg = "#331F3A";
  const tableRowHoverBg = "#3A2442";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchStatuses = async () => {
      setStatusesLoading(true);
      try {
        const res = await apiLidStatuses.getAll();
        setStatuses(res.data?.data ?? res.data ?? []);
      } catch {
        setStatuses([]);
      } finally {
        setStatusesLoading(false);
      }
    };
    fetchStatuses();
  }, []);

useEffect(() => {
  if (!isOpen) return;
  if (mode === "edit" && initialData) {
    setForm({
      fio: initialData.fio || "",
      telefon_raqam: initialData.telefon_raqam || "",
      ota_ona_fio: initialData.ota_ona_fio || "",
      assigned_id: initialData.assigned_id || "",
    });
    if (initialData.assigned_id && initialData.assigned_role) {
      setSelectedRole(initialData.assigned_role);
      setSelectedUserId(initialData.assigned_id);
      setUsersLoading(true);
      apiUsers.getUsers(initialData.assigned_role)
        .then((res) => setUsers(res.data?.data ?? res.data ?? []))
        .catch(() => setUsers([]))
        .finally(() => setUsersLoading(false));
    }
  } else {
    setForm(empty);
  }
  setErrors({});
  setSelectedFile(null);
  setDragActive(false);
  setTabIndex(0);
  setImportResult(null);
  setShowResultModal(false);
  setSelectedStatusId("");
  setShowStatusDropdown(false);
  setSelectedRole("");     
  setSelectedUserId("");     
  setUsers([]);              
}, [isOpen, mode, initialData]);

  const validate = () => {
    const next = {};
    if (!form.fio.trim()) next.fio = "FIO kiritilmagan";
    if (!form.telefon_raqam.trim()) next.telefon_raqam = "Telefon kiritilmagan";
    if (!form.ota_ona_fio.trim()) next.ota_ona_fio = "Ota-ona FIO kiritilmagan";
    if (!form.assigned_id) next.assigned_id = "Hodim tanlanmagan"; 
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      fio: form.fio.trim(),
      telefon_raqam: form.telefon_raqam.trim(),
      ota_ona_fio: form.ota_ona_fio.trim(),
      assigned_id: form.assigned_id,
    });
  };



  const handleFileSelect = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      toastService.error("Faqat .xlsx yoki .xls fayl yuklang");
      return;
    }
    setSelectedFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDropFile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toastService.warning("Fayl tanlang");
      return;
    }
    if (!selectedStatusId) {
      toastService.warning("Status tanlang");
      return;
    }
    setImportLoading(true);
    try {
      const res = await apiLids.importExcel(selectedFile, selectedStatusId);
      const data = res.data?.data ?? res.data ?? {};
      const { total, success, failed, errors } = data;
      setImportResult({ total, success, failed, errors: errors || [] });
      if (failed > 0) {
        setShowResultModal(true);
      } else {
        toastService.success(
          `${success ?? total} ta lid muvaffaqiyatli yuklandi`,
        );
        setSelectedFile(null);
        onClose();
        if (onImportSuccess) onImportSuccess();
      }
    } catch (err) {
      toastService.error(getApiErrorMessage(err) || "Import amalga oshmadi");
    } finally {
      setImportLoading(false);
    }
  };

  const handleCloseResultModal = () => {
    setShowResultModal(false);
    setImportResult(null);
    setSelectedFile(null);
    onClose();
    if (onImportSuccess) onImportSuccess();
  };

  const handlePrimaryAction = () => {
    if (tabIndex === 0) handleSubmit({ preventDefault: () => {} });
    else handleImport();
  };

  const isEdit = mode === "edit";
  const isCreateDisabled =
    !form.fio.trim() ||
    !form.telefon_raqam.trim() ||
    !form.ota_ona_fio.trim() ||
    !form.assigned_id;

  const inputStyle = {
    bg: inputBg,
    border: "1.5px solid",
    borderColor: inputBorder,
    borderRadius: "12px",
    color: titleColor,
    fontSize: "15px",
    height: "50px",
    px: 4,
    _placeholder: { color: placeholderColor, fontSize: "14px" },
    _focus: {
      borderColor: inputBorderFocus,
      boxShadow: "0 0 0 3px rgba(194,24,91,0.2)",
      bg: inputBgFocus,
    },
    _hover: { borderColor: inputBorderHover },
    transition: "all 0.2s ease",
  };

  const labelStyle = {
    color: labelColor,
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    mb: 2,
  };

  const primaryBtnStyle = {
    bgGradient: accentGradient,
    color: "white",
    size: "md",
    height: "46px",
    px: 6,
    borderRadius: "12px",
    fontWeight: "600",
    fontSize: "14px",
    _hover: {
      bgGradient: accentGradientHover,
      transform: "translateY(-1px)",
      boxShadow: "0 8px 24px rgba(194,24,91,0.4)",
    },
    _active: {
      transform: "translateY(0)",
      boxShadow: "0 2px 8px rgba(194,24,91,0.25)",
    },
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const ghostBtnStyle = {
    variant: "ghost",
    size: "md",
    height: "46px",
    px: 5,
    borderRadius: "12px",
    color: subtitleColor,
    fontWeight: "500",
    fontSize: "14px",
    _hover: { bg: inputBg, color: titleColor },
    transition: "all 0.2s ease",
  };

  const RoleCheckboxes = () => {
  const handleRoleChange = async (role) => {
    setSelectedRole(role);
    setSelectedUserId("");
    setForm((p) => ({ ...p, assigned_id: "" }));
    setUsers([]);
    if (!role) return;
    setUsersLoading(true);
    try {
      const res = await apiUsers.getUsers(role);
      setUsers(res.data?.data ?? res.data ?? []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  return (
    <FormControl isInvalid={!!errors.assigned_id}>
      <FormLabel {...labelStyle}>
        <HStack spacing={1.5}>
          <Icon as={Shield} boxSize={3.5} color={accentColor} />
          <span>Mas'ul shaxs</span>
        </HStack>
      </FormLabel>
      <VStack
        w="100%"
        align="stretch"
        spacing={3}
        p={3}
        border="1.5px solid"
        borderColor={errors.assigned_id ? "#C2185B" : inputBorder}
        borderRadius="12px"
      >
        <Flex gap={4} w="100%">
        
          <Select
            w="100%"
            placeholder="Rol tanlang"
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value)}  // ✅ TO'G'RI
            bg={inputBg}
            borderColor={inputBorder}
            color={selectedRole ? titleColor : placeholderColor}
            _hover={{ borderColor: inputBorderHover }}
            _focus={{
              borderColor: inputBorderFocus,
              boxShadow: "0 0 0 3px rgba(194,24,91,0.2)",
            }}
            transition="all 0.2s ease"
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>


          <Select
            w="100%"
            placeholder={
              !selectedRole
                ? "Avval rol tanlang"
                : usersLoading
                  ? "Yuklanmoqda..."
                  : users.length === 0
                    ? "Hodim topilmadi"
                    : "Hodimni tanlang"
            }
            value={selectedUserId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedUserId(id);
              setForm((p) => ({ ...p, assigned_id: id }));  // ✅ TO'G'RI
            }}
            isDisabled={!selectedRole || usersLoading || users.length === 0}
            bg={inputBg}
            borderColor={inputBorder}
            color={selectedUserId ? titleColor : placeholderColor}
            _hover={{ borderColor: inputBorderHover }}
            _focus={{
              borderColor: inputBorderFocus,
              boxShadow: "0 0 0 3px rgba(194,24,91,0.2)",
            }}
            transition="all 0.2s ease"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fio ?? user.name ?? user.full_name ?? user.id}
              </option>
            ))}
          </Select>
        </Flex>
      </VStack>
      <FormErrorMessage fontSize="12px" mt={1.5} color="pink.400">
        {errors.assigned_id}
      </FormErrorMessage>
    </FormControl>
  );
};

  const selectedStatus = statuses.find((s) => s.id === selectedStatusId);

  const StatusDropdown = () => (
    <FormControl mt={4}>
      <FormLabel {...labelStyle}>
        <HStack spacing={1.5}>
          <Icon as={Tag} boxSize={3.5} color={accentColor} />
          <span>Status tanlang</span>
        </HStack>
      </FormLabel>
      {statusesLoading ? (
        <Flex align="center" gap={2} h="50px">
          <Spinner size="sm" color={accentColor} />
          <Text fontSize="13px" color={subtitleColor}>
            Statuslar yuklanmoqda...
          </Text>
        </Flex>
      ) : (
        <Box position="relative" ref={dropdownRef}>
          <Flex
            align="center"
            justify="space-between"
            px={4}
            h="50px"
            bg={inputBg}
            border="1.5px solid"
            borderColor={showStatusDropdown ? inputBorderFocus : inputBorder}
            borderRadius="12px"
            cursor="pointer"
            onClick={() => setShowStatusDropdown((v) => !v)}
            boxShadow={
              showStatusDropdown ? "0 0 0 3px rgba(194,24,91,0.2)" : "none"
            }
            _hover={{ borderColor: inputBorderHover }}
            transition="all 0.2s ease"
            userSelect="none"
          >
            {selectedStatus ? (
              <HStack spacing={3}>
                <Box
                  w="24px"
                  h="24px"
                  borderRadius="6px"
                  bg={selectedStatus.color || "#888"}
                  flexShrink={0}
                  boxShadow="0 2px 8px rgba(0,0,0,0.35)"
                />
                <Text fontSize="15px" fontWeight="500" color={titleColor}>
                  {selectedStatus.name}
                </Text>
              </HStack>
            ) : (
              <Text fontSize="14px" color={placeholderColor}>
                Status tanlang...
              </Text>
            )}
            <Icon
              as={ChevronDown}
              boxSize={4}
              color={subtitleColor}
              transform={showStatusDropdown ? "rotate(180deg)" : "rotate(0deg)"}
              transition="transform 0.2s ease"
            />
          </Flex>

          {showStatusDropdown && (
            <Box
              position="absolute"
              bottom="calc(100% + 6px)"
              left={0}
              right={0}
              zIndex={9999}
              bg="#2D1F35"
              border="1.5px solid"
              borderColor={inputBorderFocus}
              borderRadius="12px"
              boxShadow="0 -12px 40px rgba(0,0,0,0.6)"
              overflow="hidden"
              maxH="220px"
              overflowY="auto"
              sx={{
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": {
                  bg: "rgba(194,24,91,0.4)",
                  borderRadius: "4px",
                },
              }}
            >
              {statuses.map((s, idx) => {
                const isSelected = s.id === selectedStatusId;
                return (
                  <Flex
                    key={s.id}
                    align="center"
                    gap={3}
                    px={4}
                    py={3}
                    cursor="pointer"
                    bg={isSelected ? "rgba(194,24,91,0.15)" : "transparent"}
                    borderBottom={
                      idx < statuses.length - 1 ? "1px solid" : "none"
                    }
                    borderColor="rgba(180,80,120,0.1)"
                    _hover={{ bg: "rgba(194,24,91,0.1)" }}
                    transition="background 0.15s"
                    onClick={() => {
                      setSelectedStatusId(s.id);
                      setShowStatusDropdown(false);
                    }}
                  >
                    <Box
                      w="24px"
                      h="24px"
                      borderRadius="6px"
                      bg={s.color || "#888"}
                      flexShrink={0}
                      boxShadow="0 2px 8px rgba(0,0,0,0.35)"
                    />
                    <Text
                      fontSize="14px"
                      fontWeight={isSelected ? "600" : "400"}
                      color={isSelected ? "#E91E8C" : titleColor}
                    >
                      {s.name}
                    </Text>
                    {isSelected && (
                      <Icon
                        as={CheckCircle}
                        boxSize={4}
                        color="#E91E8C"
                        ml="auto"
                      />
                    )}
                  </Flex>
                );
              })}
            </Box>
          )}
        </Box>
      )}
    </FormControl>
  );

  const ImportResultModal = () => {
    if (!importResult) return null;
    const { total, success, failed, errors } = importResult;
    const isAllSuccess = failed === 0;
    return (
      <Modal
        isOpen={showResultModal}
        onClose={handleCloseResultModal}
        size="xl"
        isCentered
      >
        <ModalOverlay bg={overlayBg} backdropFilter="blur(10px)" />
        <ModalContent
          borderRadius="20px"
          bg={modalBg}
          border="1px solid"
          borderColor={modalBorder}
          boxShadow={
            isAllSuccess
              ? "0 20px 50px rgba(0,200,80,0.08)"
              : "0 20px 50px rgba(194,24,91,0.12)"
          }
          overflow="hidden"
        >
          <ModalHeader
            bg={headerBg}
            borderBottom="1px solid"
            borderColor={dividerColor}
            py={5}
            px={6}
          >
            <HStack spacing={3}>
              <Flex
                w={10}
                h={10}
                borderRadius="12px"
                align="center"
                justify="center"
                bg={isAllSuccess ? successBadgeBg : errorBadgeBg}
              >
                <Icon
                  as={isAllSuccess ? CheckCircle : XCircle}
                  boxSize={5}
                  color={isAllSuccess ? "green.400" : "red.400"}
                />
              </Flex>
              <Text fontSize="lg" fontWeight="700" color={titleColor}>
                Import natijalari
              </Text>
            </HStack>
          </ModalHeader>
          <ModalBody px={6} py={5}>
            <HStack spacing={3} mb={6}>
              <Box
                flex={1}
                p={4}
                borderRadius="14px"
                bg={inputBg}
                border="1px solid"
                borderColor={modalBorder}
                textAlign="center"
              >
                <Text fontSize="2xl" fontWeight="800" color={titleColor}>
                  {total}
                </Text>
                <Text
                  fontSize="11px"
                  color={subtitleColor}
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                  mt={1}
                >
                  Umumiy
                </Text>
              </Box>
              <Box
                flex={1}
                p={4}
                borderRadius="14px"
                bg={isAllSuccess ? "#0D2B1A" : inputBg}
                border="1px solid"
                borderColor={isAllSuccess ? "#1A4A2A" : modalBorder}
                textAlign="center"
              >
                <Text fontSize="2xl" fontWeight="800" color="green.400">
                  {success}
                </Text>
                <Text
                  fontSize="11px"
                  color={subtitleColor}
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                  mt={1}
                >
                  Muvaffaqiyatli
                </Text>
              </Box>
              {failed > 0 && (
                <Box
                  flex={1}
                  p={4}
                  borderRadius="14px"
                  bg="#2B1020"
                  border="1px solid"
                  borderColor="#4A1A30"
                  textAlign="center"
                >
                  <Text fontSize="2xl" fontWeight="800" color="pink.400">
                    {failed}
                  </Text>
                  <Text
                    fontSize="11px"
                    color={subtitleColor}
                    fontWeight="600"
                    textTransform="uppercase"
                    letterSpacing="0.05em"
                    mt={1}
                  >
                    Xatolik
                  </Text>
                </Box>
              )}
            </HStack>
            {errors.length > 0 && (
              <>
                <Text
                  fontWeight="700"
                  mb={3}
                  fontSize="13px"
                  color={labelColor}
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                >
                  Xatoliklar ro'yxati
                </Text>
                <Box
                  overflowX="auto"
                  borderRadius="14px"
                  border="1px solid"
                  borderColor={modalBorder}
                  overflow="hidden"
                >
                  <Table variant="simple" size="sm">
                    <Thead bg={tableHeadBg}>
                      <Tr>
                        {["Qator", "F.I.O", "Sabab"].map((h) => (
                          <Th
                            key={h}
                            color={labelColor}
                            fontSize="11px"
                            fontWeight="700"
                            textTransform="uppercase"
                            letterSpacing="0.05em"
                            py={3}
                            borderColor={dividerColor}
                          >
                            {h}
                          </Th>
                        ))}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {errors.map((err, idx) => (
                        <Tr
                          key={idx}
                          _hover={{ bg: tableRowHoverBg }}
                          transition="background 0.15s"
                        >
                          <Td
                            fontWeight="600"
                            color={titleColor}
                            fontSize="sm"
                            borderColor={dividerColor}
                            py={3}
                          >
                            <Badge
                              borderRadius="6px"
                              px={2}
                              py={0.5}
                              bg={inputBg}
                              color={subtitleColor}
                              fontSize="11px"
                              fontWeight="700"
                            >
                              #{err.row}
                            </Badge>
                          </Td>
                          <Td
                            color={titleColor}
                            fontSize="sm"
                            borderColor={dividerColor}
                            py={3}
                          >
                            {err.fio || "—"}
                          </Td>
                          <Td fontSize="sm" borderColor={dividerColor} py={3}>
                            <Badge
                              bg="rgba(194,24,91,0.2)"
                              color="#E91E8C"
                              borderRadius="6px"
                              px={2}
                              py={0.5}
                              fontSize="11px"
                              fontWeight="600"
                            >
                              {err.reason}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </>
            )}
          </ModalBody>
          <ModalFooter
            bg={footerBg}
            borderTop="1px solid"
            borderColor={dividerColor}
            px={6}
            py={4}
          >
            <Button
              {...primaryBtnStyle}
              onClick={handleCloseResultModal}
              leftIcon={<CheckCircle size={16} />}
            >
              Yopish
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  };

  if (isEdit) {
    return (
      <>
        <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
          <ModalOverlay bg={overlayBg} backdropFilter="blur(10px)" />
          <ModalContent
            borderRadius="20px"
            bg={modalBg}
            border="1px solid"
            borderColor={modalBorder}
            boxShadow="0 20px 50px rgba(0,0,0,0.5)"
            overflow="hidden"
          >
            <ModalHeader
              bg={headerBg}
              borderBottom="1px solid"
              borderColor={dividerColor}
              px={6}
              py={5}
            >
              <HStack spacing={3}>
                <Flex
                  w={10}
                  h={10}
                  borderRadius="12px"
                  align="center"
                  justify="center"
                  bg={iconBg}
                >
                  <Icon as={User} boxSize={5} color={iconColor} />
                </Flex>
                <Box>
                  <Text
                    fontSize="lg"
                    fontWeight="700"
                    color={titleColor}
                    lineHeight="tight"
                  >
                    Lidni tahrirlash
                  </Text>
                  <Text fontSize="13px" color={subtitleColor} mt={0.5}>
                    Ma'lumotlarni yangilang
                  </Text>
                </Box>
              </HStack>
            </ModalHeader>
            <ModalBody px={6} py={6}>
              <VStack spacing={5}>
                <FormControl isInvalid={!!errors.fio}>
                  <FormLabel {...labelStyle}>
                    <HStack spacing={1.5}>
                      <Icon as={User} boxSize={3.5} color={accentColor} />
                      <span>FIO</span>
                    </HStack>
                  </FormLabel>
                  <Input
                    {...inputStyle}
                    value={form.fio}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, fio: e.target.value }))
                    }
                    placeholder="Aliyev Ali Valiyevich"
                  />
                  <FormErrorMessage fontSize="12px" mt={1.5} color="pink.400">
                    {errors.fio}
                  </FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors.ota_ona_fio}>
                  <FormLabel {...labelStyle}>
                    <HStack spacing={1.5}>
                      <Icon as={Users} boxSize={3.5} color={accentColor} />
                      <span>Ota-ona FIO</span>
                    </HStack>
                  </FormLabel>
                  <Input
                    {...inputStyle}
                    value={form.ota_ona_fio}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, ota_ona_fio: e.target.value }))
                    }
                    placeholder="Aliyev Vali Valiyevich"
                  />
                  <FormErrorMessage fontSize="12px" mt={1.5} color="pink.400">
                    {errors.ota_ona_fio}
                  </FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors.telefon_raqam}>
                  <FormLabel {...labelStyle}>
                    <HStack spacing={1.5}>
                      <Icon as={Phone} boxSize={3.5} color={accentColor} />
                      <span>Telefon raqam</span>
                    </HStack>
                  </FormLabel>
                  <Input
                    {...inputStyle}
                    value={form.telefon_raqam}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, telefon_raqam: e.target.value }))
                    }
                    placeholder="+998 90 123 45 67"
                  />
                  <FormErrorMessage fontSize="12px" mt={1.5} color="pink.400">
                    {errors.telefon_raqam}
                  </FormErrorMessage>
                </FormControl>
                <RoleCheckboxes />
              </VStack>
            </ModalBody>
            <ModalFooter
              bg={footerBg}
              borderTop="1px solid"
              borderColor={dividerColor}
              px={6}
              py={4}
              gap={3}
            >
              <Button {...ghostBtnStyle} onClick={onClose} isDisabled={loading}>
                Bekor qilish
              </Button>
              <Button
                {...primaryBtnStyle}
                isLoading={loading}
                loadingText="Saqlanmoqda..."
                onClick={handleSubmit}
                leftIcon={<CheckCircle size={16} />}
              >
                Saqlash
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        <ImportResultModal />
      </>
    );
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay bg={overlayBg} backdropFilter="blur(10px)" />
        <ModalContent
          borderRadius="20px"
          bg={modalBg}
          border="1px solid"
          borderColor={modalBorder}
          boxShadow="0 25px 60px rgba(0,0,0,0.6)"
          maxW="520px"
        >
          <Box
            bg={headerBg}
            borderBottom="1px solid"
            borderColor={dividerColor}
            px={6}
            pt={5}
            pb={0}
          >
            <HStack spacing={3} mb={4}>
              <Flex
                w={10}
                h={10}
                borderRadius="12px"
                align="center"
                justify="center"
                bgGradient={accentGradient}
                boxShadow="0 4px 12px rgba(194,24,91,0.4)"
              >
                <Icon as={Sparkles} boxSize={5} color="white" />
              </Flex>
              <Box>
                <Text
                  fontSize="lg"
                  fontWeight="700"
                  color={titleColor}
                  lineHeight="tight"
                >
                  Yangi lid / Excel import
                </Text>
                <Text fontSize="13px" color={subtitleColor} mt={0.5}>
                  Yangi lid qo'shing yoki Excel orqali yuklang
                </Text>
              </Box>
            </HStack>
            <HStack spacing={0}>
              {[
                { label: "Lid qo'shish", icon: UserPlus },
                { label: "Excel yuklash", icon: FileSpreadsheet },
              ].map((tab, idx) => {
                const isActive = tabIndex === idx;
                return (
                  <Button
                    key={idx}
                    onClick={() => setTabIndex(idx)}
                    variant="unstyled"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    px={5}
                    py={3}
                    h="auto"
                    borderRadius="0"
                    borderBottom="2px solid"
                    borderColor={isActive ? accentColor : "transparent"}
                    color={isActive ? tabActiveText : tabInactiveText}
                    bg="transparent"
                    fontWeight={isActive ? "700" : "500"}
                    fontSize="14px"
                    transition="all 0.2s ease"
                    _hover={{ color: tabActiveText }}
                    gap={2}
                  >
                    <Icon as={tab.icon} boxSize={4} />
                    {tab.label}
                  </Button>
                );
              })}
            </HStack>
          </Box>

          <ModalBody px={6} py={6}>
            {tabIndex === 0 && (
              <VStack spacing={5} align="stretch">
                <FormControl isInvalid={!!errors.fio}>
                  <FormLabel {...labelStyle}>
                    <HStack spacing={1.5}>
                      <Icon as={User} boxSize={3.5} color={accentColor} />
                      <span>FIO</span>
                    </HStack>
                  </FormLabel>
                  <Input
                    {...inputStyle}
                    value={form.fio}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, fio: e.target.value }))
                    }
                    placeholder="Masalan: Aliyev Ali Valiyevich"
                  />
                  <FormErrorMessage fontSize="12px" mt={1.5} color="pink.400">
                    {errors.fio}
                  </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.ota_ona_fio}>
                  <FormLabel {...labelStyle}>
                    <HStack spacing={1.5}>
                      <Icon as={Users} boxSize={3.5} color={accentColor} />
                      <span>Ota-ona FIO</span>
                    </HStack>
                  </FormLabel>
                  <Input
                    {...inputStyle}
                    value={form.ota_ona_fio}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, ota_ona_fio: e.target.value }))
                    }
                    placeholder="Masalan: Aliyev Vali Valiyevich"
                  />
                  <FormErrorMessage fontSize="12px" mt={1.5} color="pink.400">
                    {errors.ota_ona_fio}
                  </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.telefon_raqam}>
                  <FormLabel {...labelStyle}>
                    <HStack spacing={1.5}>
                      <Icon as={Phone} boxSize={3.5} color={accentColor} />
                      <span>Telefon raqam</span>
                    </HStack>
                  </FormLabel>
                  <Input
                    {...inputStyle}
                    value={form.telefon_raqam}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, telefon_raqam: e.target.value }))
                    }
                    placeholder="+998 90 123 45 67"
                  />
                  <FormErrorMessage fontSize="12px" mt={1.5} color="pink.400">
                    {errors.telefon_raqam}
                  </FormErrorMessage>
                </FormControl>

                <RoleCheckboxes />
              </VStack>
            )}

            {tabIndex === 1 && (
              <Box>
                <Box
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDropFile}
                  onClick={() => fileInputRef.current?.click()}
                  border="2px dashed"
                  borderColor={dragActive ? dropBorderActive : dropBorder}
                  borderRadius="16px"
                  bg={dragActive ? dropBgActive : dropBg}
                  p={8}
                  textAlign="center"
                  cursor="pointer"
                  transition="all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                  _hover={{
                    borderColor: dropBorderActive,
                    bg: dropBgActive,
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 24px rgba(194,24,91,0.12)",
                  }}
                  role="group"
                >
                  <Flex
                    w={14}
                    h={14}
                    borderRadius="16px"
                    align="center"
                    justify="center"
                    bg={iconBg}
                    mx="auto"
                    mb={3}
                    transition="transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                    _groupHover={{ transform: "scale(1.1) rotate(-3deg)" }}
                    boxShadow="0 4px 14px rgba(194,24,91,0.15)"
                  >
                    <Icon as={Upload} boxSize={6} color={iconColor} />
                  </Flex>
                  <Text
                    fontSize="15px"
                    fontWeight="700"
                    color={titleColor}
                    mb={1}
                  >
                    Excel faylni yuklash
                  </Text>
                  <Text fontSize="13px" color={subtitleColor}>
                    Faylni bu yerga tashlang yoki{" "}
                    <Text as="span" color={tabActiveText} fontWeight="600">
                      bosib tanlang
                    </Text>
                  </Text>
                  <HStack justify="center" mt={3} spacing={2}>
                    <Badge
                      bg={iconBg}
                      color={iconColor}
                      borderRadius="6px"
                      px={2}
                      py={0.5}
                      fontSize="11px"
                      fontWeight="700"
                    >
                      .xlsx
                    </Badge>
                    <Badge
                      bg={iconBg}
                      color={iconColor}
                      borderRadius="6px"
                      px={2}
                      py={0.5}
                      fontSize="11px"
                      fontWeight="700"
                    >
                      .xls
                    </Badge>
                    <Text fontSize="12px" color={subtitleColor}>
                      • Max 5MB
                    </Text>
                  </HStack>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                </Box>

                {selectedFile && (
                  <Flex
                    align="center"
                    justify="space-between"
                    mt={4}
                    p={3.5}
                    bg={filePillBg}
                    borderRadius="12px"
                    border="1px solid"
                    borderColor={modalBorder}
                    transition="all 0.2s ease"
                    _hover={{ borderColor: dropBorderActive }}
                  >
                    <HStack spacing={3}>
                      <Flex
                        w={9}
                        h={9}
                        borderRadius="10px"
                        align="center"
                        justify="center"
                        bg={iconBg}
                      >
                        <Icon
                          as={FileSpreadsheet}
                          color={iconColor}
                          boxSize={4}
                        />
                      </Flex>
                      <Box>
                        <Text
                          fontSize="13px"
                          fontWeight="600"
                          color={titleColor}
                          noOfLines={1}
                          maxW="240px"
                        >
                          {selectedFile.name}
                        </Text>
                        <Text fontSize="12px" color={subtitleColor}>
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </Text>
                      </Box>
                    </HStack>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      borderRadius="8px"
                      color={subtitleColor}
                      _hover={{ bg: "rgba(194,24,91,0.15)", color: "#E91E8C" }}
                      p={2}
                      minW="auto"
                      h="auto"
                    >
                      <Icon as={X} boxSize={4} />
                    </Button>
                  </Flex>
                )}

                <StatusDropdown />
              </Box>
            )}
          </ModalBody>

          <ModalFooter
            bg={footerBg}
            borderTop="1px solid"
            borderColor={dividerColor}
            px={6}
            py={4}
            gap={3}
            justify="flex-end"
          >
            <Button {...ghostBtnStyle} onClick={onClose}>
              Bekor qilish
            </Button>
            <Button
              {...primaryBtnStyle}
              leftIcon={
                tabIndex === 0 ? <UserPlus size={16} /> : <Upload size={16} />
              }
              rightIcon={<ArrowRight size={14} />}
              onClick={handlePrimaryAction}
              isLoading={tabIndex === 0 ? loading : importLoading}
              loadingText={
                tabIndex === 0 ? "Qo'shilmoqda..." : "Yuklanmoqda..."
              }
              isDisabled={
                tabIndex === 0
                  ? isCreateDisabled
                  : !selectedFile || !selectedStatusId
              }
            >
              {tabIndex === 0 ? "Lid qo'shish" : "Excel yuklash"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <ImportResultModal />
    </>
  );
}
