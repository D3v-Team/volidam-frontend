import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  GridItem,
  HStack,
  Icon,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Clock, ShieldUser, User } from "lucide-react";
import { apiLids } from "../../Services/api/Lids";
import { apiLidColumns } from "../../Services/api/LidColumns";
import { apiLidStatuses } from "../../Services/api/LidStatuses";
import { unwrapEntity } from "../../utils/api/parsePagination";
import { normalizeLidFromApi } from "../../utils/lidBoard";
import {
  buildColumnValueFormState,
  buildLidValuesPayload,
  parseLidColumnsResponse,
} from "../../utils/lidColumns";
import {
  getApiErrorMessage,
  normalizeStatusFromApi,
  sortStatuses,
  unwrapStatuses,
} from "../../utils/lidStatus";
import { getLeadsBasePath } from "../../utils/leadsPaths";
import { toastService } from "../../utils/toast";
import { useAuthStore } from "../../store/authStore";
import { isSuperAdmin } from "../../utils/roles";
import LeadDetailSection from "../../components/leads/LeadDetailSection";
import LeadDetailLidSection from "../../components/leads/LeadDetailLidSection";
import { volidamGhostButton } from "../../components/leads/leadStyles";
import LidColumnsManageSection from "../../components/leads/LidColumnsManageSection";
import LeadValueFieldsSection from "../../components/leads/LeadValueFieldsSection";
import { formatDateTime } from "../../utils/tools/formatDateTime";

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);

  const [lid, setLid] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [columnDefs, setColumnDefs] = useState([]);
  const [valueForm, setValueForm] = useState({});
  const [savedSnapshot, setSavedSnapshot] = useState({});
  const [savingLid, setSavingLid] = useState(false);
  const [savingValues, setSavingValues] = useState(false);

  const role = user?.role;
  const canManageColumns = isSuperAdmin(role);

  const canEditLid =
    isSuperAdmin(role) ||
    lid?.assigned_id === user?.id ||
    lid?.assignee?.id === user?.id;

  const canEditValues = canEditLid;

  const listPath = getLeadsBasePath(pathname);

  const isPanel =
    pathname.startsWith("/admin") || pathname.startsWith("/operator");

  // ─── Data loader ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!id) return;
    setFetching(true);
    try {
      const [colRes, lidRes, statusRes] = await Promise.all([
        apiLidColumns.getAll(),
        apiLids.getById(id),
        apiLidStatuses.getAll(),
      ]);

      const cols = parseLidColumnsResponse(colRes);
      const entity = normalizeLidFromApi(unwrapEntity(lidRes.data));
      const form = buildColumnValueFormState(entity, cols);
      const statusList = sortStatuses(unwrapStatuses(statusRes?.data)).map(
        normalizeStatusFromApi
      );

      setColumnDefs(cols);
      setStatuses(statusList);
      setLid(entity);
      setValueForm(form);
      setSavedSnapshot(form);
    } catch (err) {
      toastService.error(getApiErrorMessage(err) || "Lid yuklanmadi");
      setLid(null);
    } finally {
      setFetching(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Values dirty check ────────────────────────────────────────────────────
  const valuesDirty = useMemo(() => {
    return columnDefs.some(
      (c) => (valueForm[c.id] ?? "") !== (savedSnapshot[c.id] ?? "")
    );
  }, [columnDefs, valueForm, savedSnapshot]);

  const handleValueChange = (columnId, next) => {
    setValueForm((prev) => ({ ...prev, [columnId]: next }));
  };

  // ─── Save lid ──────────────────────────────────────────────────────────────
  // Tartib:
  //   1. apiLids.update  — fio, telefon, ota_ona_fio, values (child_status_id ham)
  //   2. status o'zgansa — apiLids.updateStatus
  //   3. child_status o'zgansa — apiLids.updateChildStatus (PUT /lids/{id}/child-status)
  const handleSaveLid = async ({
    fio,
    telefon_raqam,
    status_id,
    ota_ona_fio,
    child_status_id,
  }) => {
    if (!lid?.id) return;
    setSavingLid(true);
    try {
      const values = buildLidValuesPayload(columnDefs, valueForm);

      // 1. Asosiy lid ma'lumotlarini yangilash
      await apiLids.update(lid.id, {
        fio,
        telefon_raqam,
        ota_ona_fio,
        child_status_id: child_status_id ?? null,
        values,
      });

      // 2. Status o'zgangan bo'lsa — alohida status endpointiga
      const currentStatus = String(lid.status?.id || lid.status_id || "");
      const newStatus = String(status_id || "");
      if (newStatus && newStatus !== currentStatus) {
        await apiLids.updateStatus(lid.id, newStatus, child_status_id ?? null);
      }

      // 3. Child status o'zgangan bo'lsa — alohida child-status endpointiga
      const currentChild = String(lid.child_status_id ?? "");
      const newChild = String(child_status_id ?? "");
      if (newChild !== currentChild) {
        await apiLids.updateChildStatus(lid.id, child_status_id ?? null);
      }

      await loadData();
      toastService.success("Lid yangilandi");
    } catch (err) {
      toastService.error(getApiErrorMessage(err) || "Saqlanmadi");
    } finally {
      setSavingLid(false);
    }
  };

  // ─── Save custom field values ──────────────────────────────────────────────
  const handleSaveValues = async () => {
    if (!lid?.id) return;
    setSavingValues(true);
    try {
      const values = buildLidValuesPayload(columnDefs, valueForm);

      await apiLids.update(lid.id, {
        fio: lid.fio,
        telefon_raqam: lid.telefon_raqam,
        ota_ona_fio: lid.ota_ona_fio,
        child_status_id: lid.child_status_id ?? null,
        values,
      });

      await loadData();
      toastService.success("Maydonlar saqlandi");
    } catch (err) {
      toastService.error(getApiErrorMessage(err) || "Saqlanmadi");
    } finally {
      setSavingValues(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const statusColor = lid?.status?.color || "#e91e63";
  const creatorName = lid?.created_by_name || lid?.creator?.full_name || "—";

  return (
    <Box
      flex={isPanel ? "1" : undefined}
      h={isPanel ? undefined : "auto"}
      minH={isPanel ? 0 : "100vh"}
      overflowY="auto"
      overflowX="hidden"
      w="100%"
      minW={0}
      bg="bg"
      pb={{ base: 8, md: 12 }}
    >
      <Box
        w="100%"
        px={{ base: 3, sm: 4, md: 6, lg: 8 }}
        py={{ base: 3, md: 6 }}
      >
        <Button
          {...volidamGhostButton}
          size="sm"
          leftIcon={<ArrowLeft size={16} />}
          mb={{ base: 3, md: 5 }}
          onClick={() => navigate(listPath)}
        >
          Barcha lidlar
        </Button>

        {fetching ? (
          <VStack spacing={4} align="stretch">
            <Skeleton h="120px" borderRadius="xl" />
            <Skeleton h="280px" borderRadius="xl" />
          </VStack>
        ) : !lid ? (
          <LeadDetailSection title="Lid topilmadi">
            <Text color="textSecondary" textAlign="center" py={8}>
              Ma&apos;lumot mavjud emas
            </Text>
          </LeadDetailSection>
        ) : (
          <VStack align="stretch" spacing={{ base: 4, md: 6 }} w="100%">
            {/* ── Asosiy ma'lumotlar ── */}
            <LeadDetailSection
              title="Asosiy ma'lumotlar"
              subtitle="FIO, telefon va status"
            >
              <Box
                borderLeftWidth="4px"
                borderColor={statusColor}
                pl={{ base: 3, md: 4 }}
              >
                <LeadDetailLidSection
                  lid={lid}
                  statuses={statuses}
                  canEdit={canEditLid}
                  saving={savingLid}
                  onSave={handleSaveLid}
                />
              </Box>

              <SimpleGrid
                columns={{ base: 1, sm: 2, lg: 4 }}
                spacing={4}
                mt={6}
                pt={6}
                borderTopWidth="1px"
                borderColor="border"
              >
                <MetaRow icon={User} label="Yaratuvchi" value={creatorName} />
                <MetaRow
                  icon={ShieldUser}
                  label="Biriktirilgan shaxs"
                  value={
                    lid.assignee?.full_name || "Biriktirilgan shaxs mavjud emas"
                  }
                />
                <MetaRow
                  icon={Clock}
                  label="Yaratilgan"
                  value={formatDateTime(lid.createdAt)}
                />
                <MetaRow
                  icon={Clock}
                  label="Yangilangan"
                  value={formatDateTime(lid.updatedAt)}
                />
              </SimpleGrid>
            </LeadDetailSection>

            {/* ── Qo'shimcha maydonlar + Kolonkalar boshqaruvi ── */}
            <Grid
              templateColumns={{
                base: "1fr",
                xl: canManageColumns ? "1fr minmax(280px, 320px)" : "1fr",
              }}
              gap={{ base: 4, md: 6 }}
              w="100%"
              alignItems="start"
            >
              <GridItem minW={0} w="100%">
                <LeadValueFieldsSection
                  columns={columnDefs}
                  values={valueForm}
                  dirty={valuesDirty}
                  readOnly={!canEditValues}
                  onChange={handleValueChange}
                  onSave={canEditValues ? handleSaveValues : undefined}
                  saving={savingValues}
                />
              </GridItem>

              {canManageColumns && (
                <GridItem minW={0} w="100%">
                  <Box position={{ base: "static", xl: "sticky" }} top={4}>
                    <LidColumnsManageSection
                      columns={columnDefs}
                      loading={fetching}
                      onRefresh={loadData}
                      canManage={canManageColumns}
                      canEditColumn={false}
                    />
                  </Box>
                </GridItem>
              )}
            </Grid>
          </VStack>
        )}
      </Box>
    </Box>
  );
}

// ─── MetaRow helper ────────────────────────────────────────────────────────────
function MetaRow({ icon, label, value }) {
  return (
    <HStack spacing={3} align="start" minW={0}>
      <Icon
        as={icon}
        boxSize={4}
        color="textSecondary"
        mt={0.5}
        flexShrink={0}
      />
      <Box minW={0}>
        <Text fontSize="xs" color="textSecondary" fontWeight="600">
          {label}
        </Text>
        <Text
          fontSize="sm"
          fontWeight="600"
          color="text"
          mt={0.5}
          wordBreak="break-word"
        >
          {value}
        </Text>
      </Box>
    </HStack>
  );
}