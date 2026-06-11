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
  HStack,
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
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  useEffect(() => {
    if (!lid) return;
    setFio(lid.fio || "");
    setTelefon(lid.telefon_raqam || "");
    setStatusId(String(lid.status?.id || lid.status_id || ""));
    setParents(lid.ota_ona_fio || "");
  }, [lid]);

  const dirty = useMemo(() => {
    if (!lid) return false;
    const baseStatus = String(lid.status?.id || lid.status_id || "");
    return (
      fio !== (lid.fio || "") ||
      telefon !== (lid.telefon_raqam || "") ||
      statusId !== baseStatus ||
      parents !== (lid.ota_ona_fio || "")
    );
  }, [lid, fio, telefon, statusId, parents]);

  const selectedStatus = statuses.find(
    (s) => String(s.id) === String(statusId),
  );
  const statusColor = selectedStatus?.color || lid?.status?.color || "#e91e63";

  const dayTypes = Object.keys(selectedStatus?.child_statuses_by_type || {});
  const timeOptions =
    selectedStatus?.child_statuses_by_type?.[selectedDay] || [];

  const hasChildStatuses = Object.values(
    selectedStatus?.child_statuses_by_type || {}
  ).some((items) => items.length > 0);

  const handleSubmit = () => {
    const data = {
      fio: fio.trim(),
      telefon_raqam: telefon.trim(),
      status_id: statusId,
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
            {selectedStatus?.name ||
              lid.status?.name ||
              "Belgilangan status mavjud emas"}
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
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            {...filterFieldProps}
            value={statusId}
            onChange={(e) => {
              setStatusId(e.target.value);
              setSelectedDay("");
              setSelectedTime("");
            }}
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
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          />
        </FormControl>

        <FormControl>
          <FormLabel {...volidamFormLabel}>FIO</FormLabel>
          <Input
            {...filterFieldProps}
            value={fio}
            onChange={(e) => setFio(e.target.value)}
            placeholder="To'liq ism"
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          />
        </FormControl>

        <FormControl>
          <FormLabel {...volidamFormLabel}>Telefon raqam</FormLabel>
          <Input
            {...filterFieldProps}
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            placeholder="+998 90 123 45 67"
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          />
        </FormControl>

        {/* ── Kun (toq/juft) toggle tugmalar ── */}
        {hasChildStatuses && (
          <>
            <Box>
              <Text fontSize="sm" fontWeight="600" color="textSecondary" mb={2}>
                Kunlari
              </Text>
              <HStack spacing={2}>
                {dayTypes.map((day) => (
                  <Button
                    key={day}
                    size="sm"
                    borderRadius="lg"
                    fontWeight="700"
                    variant={selectedDay === day ? "solid" : "outline"}
                    colorScheme={selectedDay === day ? "brand" : "gray"}
                    onClick={() => {
                      setSelectedDay((prev) => (prev === day ? "" : day));
                      setSelectedTime("");
                    }}
                  >
                    {day === "toq" ? "Toq" : "Juft"}
                  </Button>
                ))}
              </HStack>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="600" color="textSecondary" mb={1}>
                Vaqtlari
              </Text>
              <Select
                {...filterFieldProps}
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                isDisabled={!selectedDay}
              >
                <option value="">
                  {selectedDay ? "Vaqt tanlang" : "Avval kun tanlang"}
                </option>
                {timeOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Box>
          </>
        )}
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
          <Badge colorScheme="orange" variant="subtle" borderRadius="full" px={3}>
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