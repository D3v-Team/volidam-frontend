import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Flex,
  Text,
  Box,
  Badge,
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import {
  filterFieldProps,
  volidamFormLabel,
  volidamPrimaryButton,
} from "./leadStyles";

function FieldCard({ children, ...rest }) {
  const bg = useColorModeValue("rgba(255,255,255,0.8)", "whiteAlpha.50");
  return (
    <Box
      p={4}
      borderRadius="xl"
      borderWidth="1px"
      borderColor="border"
      bg={bg}
      {...rest}
    >
      {children}
    </Box>
  );
}

export default function LeadDetailLidSection({
  lid,
  statuses = [],
  canEdit = false,
  onSave,
  saving = false,
}) {
  const [fio, setFio] = useState("");
  const [telefon, setTelefon] = useState("");
  const [statusId, setStatusId] = useState("");
  const [parents, setParents] = useState("");

  useEffect(() => {
    if (!lid) return;
    setFio(lid.fio || "");
    setTelefon(lid.telefon_raqam || "");
    setStatusId(lid.status_id || lid.status?.id || "");
    setParents(lid.ota_ona_fio || "");
  }, [lid]);

  const dirty = useMemo(() => {
    if (!lid) return false;
    const baseStatus = lid.status_id || lid.status?.id || "";
    return (
      fio !== (lid.fio || "") ||
      telefon !== (lid.telefon_raqam || "") ||
      statusId !== baseStatus ||
      parents !== (lid.ota_ona_fio || "")
    );
  }, [lid, fio, telefon, statusId, parents]);

  const selectedStatus = statuses.find((s) => s.id === statusId);
  const statusColor = selectedStatus?.color || lid?.status?.color || "#e91e63";

  const handleSubmit = () => {
    const data = {
      fio: fio.trim(),

      telefon_raqam: telefon.trim(),

      statusId,

      ota_ona_fio: parents.trim(),
    };



    onSave?.(data);
  };

  if (!lid) return null;

  if (!canEdit) {
    return (
   <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
  
  <Box>
    <Text fontSize="xs" fontWeight="600" color="textSecondary" mb={1}>
      Status
    </Text>
    <Text fontSize="md" fontWeight="700" color={statusColor}>
      {selectedStatus?.name || lid.status?.name || "Belgilangan status mavjud emas"}
    </Text>
  </Box>

  <Box>
    <Text fontSize="xs" fontWeight="600" color="textSecondary" mb={1}>
      Ism Familiya
    </Text>
    <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="text">
      {fio || "Ism familiya ma'lumoti mavjud emas"}
    </Text>
  </Box>

  <Box>
    <Text fontSize="xs" fontWeight="600" color="textSecondary" mb={1}>
      Telefon raqami
    </Text>
    <Text fontSize="md" fontWeight="600" color="textSecondary">
      {telefon || "Telefon raqami mavjud emas"}
    </Text>
  </Box>

  <Box>
    <Text fontSize="xs" fontWeight="600" color="textSecondary" mb={1}>
      Ota-ona
    </Text>
    <Text fontSize="md" fontWeight="600" color="textSecondary">
      {parents ? `${parents}` : "Ota-ona ma'lumoti mavjud emas"}
    </Text>
  </Box>

</SimpleGrid>
    );
  }

  return (
    <Flex direction="column" gap={5}>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel {...volidamFormLabel}>Status</FormLabel>
          <Select
            {...filterFieldProps}
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
          >
            <option value="">Status tanlang</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel {...volidamFormLabel}>Ota-ona ismi</FormLabel>
          <Input
            {...filterFieldProps}
            value={parents || ""}
            onChange={(e) => setParents(e.target.value)}
            placeholder="Ota-ona ismi"
          />
        </FormControl>

        <FormControl>
          <FormLabel {...volidamFormLabel}>FIO</FormLabel>
          <Input
            {...filterFieldProps}
            value={fio}
            onChange={(e) => setFio(e.target.value)}
            placeholder="To'liq ism"
          />
        </FormControl>

        <FormControl>
          <FormLabel {...volidamFormLabel}>Telefon raqam</FormLabel>
          <Input
            {...filterFieldProps}
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            placeholder="+998 90 123 45 67"
          />
        </FormControl>
      </SimpleGrid>

      <Flex
        justify="space-between"
        align="center"
        flexWrap="wrap"
        gap={3}
        pt={1}
        borderColor="border"
      >
        {dirty ? (
          <Badge
            colorScheme="orange"
            variant="subtle"
            borderRadius="full"
            px={3}
          >
            Saqlanmagan o&apos;zgarishlar
          </Badge>
        ) : (
          <Box />
        )}
        <Button
          {...volidamPrimaryButton}
          leftIcon={<Save size={16} />}
          isLoading={saving}
          isDisabled={!dirty && !saving}
          onClick={handleSubmit}
        >
          Saqlash
        </Button>
      </Flex>
    </Flex>
  );
}
