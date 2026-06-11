import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    Button,
    FormControl,
    FormLabel,
    Input,
    HStack,
    VStack,
    Box,
    Text,
    useColorModeValue,
  } from "@chakra-ui/react";
  import { useEffect, useState } from "react";
  import { Save } from "lucide-react";
  import { filterFieldProps, volidamFormLabel, volidamPrimaryButton } from "./leadStyles";
  import { DAY_TYPES } from "../../utils/lidChildStatus";
  
  const DAY_OPTIONS = [
    { value: DAY_TYPES.TOQ, label: "Toq" },
    { value: DAY_TYPES.JUFT, label: "Juft" },
  ];
  
  export default function LidChildStatusFormModal({
    isOpen,
    onClose,
    mode = "create",
    initialData = null,
    parentStatus = null,
    dayType,          // default type (SharedLeadsPage dan keladi)
    onSubmit,
    loading = false,
    nextOrder = 0,
  }) {
    const [name, setName] = useState("");
    const [color, setColor] = useState("#378ADD");
    const [order, setOrder] = useState(0);
    const [type, setType] = useState(DAY_TYPES.TOQ);
  
    const activeBg = useColorModeValue("brand.500", "brand.400");
    const inactiveBg = useColorModeValue("gray.100", "whiteAlpha.100");
    const inactiveColor = useColorModeValue("gray.600", "gray.300");
  
    useEffect(() => {
      if (!isOpen) return;
      if (mode === "edit" && initialData) {
        setName(initialData.name || "");
        setColor(initialData.color || "#378ADD");
        setOrder(initialData.order ?? 0);
        setType(initialData.type || dayType || DAY_TYPES.TOQ);
      } else {
        setName("");
        setColor("#378ADD");
        setOrder(nextOrder);
        setType(dayType || DAY_TYPES.TOQ);
      }
    }, [isOpen, mode, initialData, dayType, nextOrder]);
  
    const handleSubmit = () => {
      if (!name.trim()) return;
      onSubmit?.({
        status_id: parentStatus?.id || initialData?.status_id || "",
        name: name.trim(),
        color,
        order: Number(order),
        type,
      });
    };
  
    const title = mode === "edit" ? "Child statusni tahrirlash" : "Yangi child status";
  
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay backdropFilter="blur(2px)" />
        <ModalContent borderRadius="2xl">
          <ModalHeader fontSize="lg" fontWeight="700">
            {title}
            {parentStatus ? (
              <Text fontSize="sm" fontWeight="500" color="textSecondary" mt={0.5}>
                {parentStatus.name}
              </Text>
            ) : null}
          </ModalHeader>
          <ModalCloseButton />
  
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* ── Kun turi: Toq / Juft toggle ── */}
              <FormControl>
                <FormLabel {...volidamFormLabel}>Kun turi</FormLabel>
                <HStack spacing={2}>
                  {DAY_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      size="sm"
                      borderRadius="lg"
                      fontWeight="700"
                      flex={1}
                      bg={type === opt.value ? activeBg : inactiveBg}
                      color={type === opt.value ? "white" : inactiveColor}
                      _hover={{
                        bg: type === opt.value ? activeBg : useColorModeValue("gray.200", "whiteAlpha.200"),
                      }}
                      onClick={() => setType(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </HStack>
              </FormControl>
  
              <FormControl isRequired>
                <FormLabel {...volidamFormLabel}>Nomi</FormLabel>
                <Input
                  {...filterFieldProps}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Child status nomi"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                  autoFocus
                />
              </FormControl>
  
              <HStack spacing={3} align="end">
                <FormControl flex={1}>
                  <FormLabel {...volidamFormLabel}>Tartib raqami</FormLabel>
                  <Input
                    {...filterFieldProps}
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    min={0}
                  />
                </FormControl>
  
                <FormControl w="120px">
                  <FormLabel {...volidamFormLabel}>Rang</FormLabel>
                  <HStack spacing={2} align="center">
                    <Box
                      w="36px"
                      h="36px"
                      borderRadius="lg"
                      bg={color}
                      flexShrink={0}
                      borderWidth="2px"
                      borderColor="border"
                      cursor="pointer"
                      overflow="hidden"
                      position="relative"
                    >
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        style={{
                          position: "absolute",
                          inset: 0,
                          opacity: 0,
                          cursor: "pointer",
                          width: "100%",
                          height: "100%",
                        }}
                      />
                    </Box>
                    <Input
                      {...filterFieldProps}
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#378ADD"
                      fontSize="xs"
                      flex={1}
                    />
                  </HStack>
                </FormControl>
              </HStack>
            </VStack>
          </ModalBody>
  
          <ModalFooter gap={2}>
            <Button variant="ghost" borderRadius="lg" onClick={onClose} isDisabled={loading}>
              Bekor qilish
            </Button>
            <Button
              {...volidamPrimaryButton}
              leftIcon={<Save size={15} />}
              isLoading={loading}
              isDisabled={!name.trim()}
              onClick={handleSubmit}
            >
              {mode === "edit" ? "Saqlash" : "Yaratish"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }