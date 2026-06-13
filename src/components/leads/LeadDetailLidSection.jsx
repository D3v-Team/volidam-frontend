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

/**
 * LeadDetailLidSection
 *
 * --- MUAMMO ---
 * status va kun/vaqt (child status) tanlansa ham, child_status_id apiga uzatilmayapti.
 * Clientdan child_status_id ni aniq jo'natish shart.
 * Apiga {child_status_id: ...} bo'sh emas qiymat borishi kerak, tanlab kiritilsa.
 *
 * ✨ YANGILASH: child_status_id — faqat va faqat Vaqtlari (child) dagi IDlardan birini yuborishi shart!
 */

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
  const [selectedTime, setSelectedTime] = useState(""); // child_status_id

  // --- NEW: statik qiymatlarni xotirada saqlash (hooklarni to'g'ri ishlashini ta'minlash uchun) ---
  const selectedStatus = statuses.find(
    (s) => String(s.id) === String(statusId)
  );
  const statusColor = selectedStatus?.color || lid?.status?.color || "#e91e63";
  const dayTypes = Object.keys(selectedStatus?.child_statuses_by_type || {});
  const timeOptions =
    (selectedStatus?.child_statuses_by_type?.[selectedDay] || []);

  // Yangi: All Vaqtlari (child statuses) IDlarini massivga to'plash
  const allChildStatusIds = [];
  if (selectedStatus && selectedStatus.child_statuses_by_type) {
    Object.values(selectedStatus.child_statuses_by_type || {}).forEach(childsArr => {
      childsArr.forEach(child => allChildStatusIds.push(String(child.id)));
    });
  }

  const hasChildStatuses = allChildStatusIds.length > 0;

  useEffect(() => {
    if (!lid) return;
    setFio(lid.fio || "");
    setTelefon(lid.telefon_raqam || "");
    setStatusId(String(lid.status?.id || lid.status_id || ""));
    setParents(lid.ota_ona_fio || "");

    // child_status_id dan boshlang'ich qiymat
    const childId = lid.child_status_id || "";

    // faqat agar allChildStatusIds ichida bo'lsa, o'zlashtiramiz
    // (bu, eski/yaroqsiz qiymatga ega bo'lsa, keyin reset qilamiz)
    setSelectedTime(
      childId && allChildStatusIds.includes(String(childId))
        ? String(childId)
        : ""
    );

    // Agar child_status_id bo'lsa — qaysi dayType ga tegishli ekanini topamiz
    if (childId && allChildStatusIds.includes(String(childId))) {
      const curr = statuses.find(
        (s) => String(s.id) === String(lid.status?.id || lid.status_id)
      );
      if (curr?.child_statuses_by_type) {
        let foundDay = "";
        for (const [day, children] of Object.entries(
          curr.child_statuses_by_type
        )) {
          if (children.some((c) => String(c.id) === String(childId))) {
            foundDay = day;
            break;
          }
        }
        setSelectedDay(foundDay);
      }
    } else {
      setSelectedDay("");
    }
  // eslint-disable-next-line
  }, [lid, statuses]);

  // FORM "dirty" holati tekshiruvi
  const dirty = useMemo(() => {
    if (!lid) return false;
    const baseStatus = String(lid.status?.id || lid.status_id || "");
    // Faqat allChildStatusIds ichidagina child_status_idni tenglashtiramiz. Aks holda, bo'sh deb hisoblash kerak.
    const baseChild = allChildStatusIds.includes(String(lid.child_status_id))
      ? String(lid.child_status_id)
      : "";

    return (
      fio !== (lid.fio || "") ||
      telefon !== (lid.telefon_raqam || "") ||
      statusId !== baseStatus ||
      parents !== (lid.ota_ona_fio || "") ||
      selectedTime !== baseChild
    );
  // eslint-disable-next-line
  }, [lid, fio, telefon, statusId, parents, selectedTime, allChildStatusIds.join(",")]);

  // --- NEW: handleSubmit yangilandi ---
  const handleSubmit = () => {
    // Faqat Vaqt options dagi value(child_status_id) laridan birini qabul qilish!
    const validChildStatus =
      hasChildStatuses && allChildStatusIds.includes(selectedTime)
        ? selectedTime
        : null;

    const data = {
      fio: fio.trim(),
      telefon_raqam: telefon.trim(),
      status_id: statusId,
      ota_ona_fio: parents.trim(),
      child_status_id: validChildStatus,
    };

    onSave?.(data);
  };

  if (!lid) return null;

  // ── Read-only ko'rinish ──
  if (!canEdit) {
    // Vaqtni chiqarishda har doim status+daydan topilsin
    let vaqtiName = "";
    if (
      selectedTime &&
      selectedDay &&
      Array.isArray(timeOptions) &&
      allChildStatusIds.includes(selectedTime)
    ) {
      const found = timeOptions.find((t) => String(t.id) === String(selectedTime));
      vaqtiName = found?.name || "";
    }

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
          <Text
            fontSize={{ base: "xl", md: "2xl" }}
            fontWeight="800"
            color="text"
          >
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
            {parents || "Ota-ona ma'lumoti mavjud emas"}
          </Text>
        </Box>

        {/* Read-only: child status ko'rinishi */}
        {selectedTime && vaqtiName && (
          <Box>
            <Text fontSize="xs" fontWeight="600" color="textSecondary" mb={1}>
              Vaqti
            </Text>
            <Text fontSize="md" fontWeight="600" color="textSecondary">
              {vaqtiName}
            </Text>
          </Box>
        )}
      </SimpleGrid>
    );
  }

  // ── Edit ko'rinish ──
  return (
    <Flex direction="column" gap={5}>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel {...volidamFormLabel}>Status</FormLabel>
          <Select
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
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
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
        </FormControl>

        <FormControl>
          <FormLabel {...volidamFormLabel}>FIO</FormLabel>
          <Input
            {...filterFieldProps}
            value={fio}
            onChange={(e) => setFio(e.target.value)}
            placeholder="To'liq ism"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
        </FormControl>

        <FormControl>
          <FormLabel {...volidamFormLabel}>Telefon raqam</FormLabel>
          <Input
            {...filterFieldProps}
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            placeholder="+998 90 123 45 67"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
        </FormControl>

        {/* --- Kun (toq/juft) + Vaqt tanlash --- */}
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
                      setSelectedTime(""); // kun o'zgarganda vaqtni reset
                    }}
                  >
                    {day === "toq" ? "Toq" : "Juft"}
                  </Button>
                ))}
              </HStack>
            </Box>

            <FormControl>
              <FormLabel {...volidamFormLabel}>Vaqtlari</FormLabel>
              <Select
                {...filterFieldProps}
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                isDisabled={!selectedDay}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
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
            </FormControl>
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