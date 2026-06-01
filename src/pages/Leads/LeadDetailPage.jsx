import {
  Box,
  Button,
  Text,
  VStack,
  SimpleGrid,
  Skeleton,
  HStack,
  Flex,
  Icon,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, User, Clock, ShieldUser } from "lucide-react";
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
import { isAdmin, isOperator, isSuperAdmin } from "../../utils/roles";
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
  const role = user?.role;
 const canManageColumns = isSuperAdmin(role);

const canEditLid =
  isSuperAdmin(role) ||
  lid?.assigned_id === user?.id ||
  lid?.assignee?.id === user?.id;

const canEditValues = canEditLid;

  const listPath = getLeadsBasePath(pathname);


  const [statuses, setStatuses] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [columnDefs, setColumnDefs] = useState([]);
  const [valueForm, setValueForm] = useState({});
  const [savedSnapshot, setSavedSnapshot] = useState({});
  const [savingLid, setSavingLid] = useState(false);
  const [savingValues, setSavingValues] = useState(false);

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
        normalizeStatusFromApi,
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

  const valuesDirty = useMemo(() => {
    return columnDefs.some(
      (c) => (valueForm[c.id] ?? "") !== (savedSnapshot[c.id] ?? ""),
    );
  }, [columnDefs, valueForm, savedSnapshot]);

  const handleValueChange = (columnId, next) => {
    setValueForm((prev) => ({ ...prev, [columnId]: next }));
  };

  const handleSaveLid = async ({
    fio,
    telefon_raqam,
    status_id,
    ota_ona_fio,
  }) => {
    if (!lid?.id) return;
    setSavingLid(true);
    try {
      const values = buildLidValuesPayload(columnDefs, valueForm);
      await apiLids.update(lid.id, {
        fio,
        telefon_raqam,
        ota_ona_fio,
        values,
      });
      const currentStatus = lid.status_id || lid.status?.id || "";
      if (status_id && status_id !== currentStatus) {
        await apiLids.updateStatus(lid.id, status_id);
      }
      await loadData();
      toastService.success("Lid yangilandi");
    } catch (err) {
      toastService.error(getApiErrorMessage(err) || "Saqlanmadi");
    } finally {
      setSavingLid(false);
    }
  };

  const handleSaveValues = async () => {
    if (!lid?.id) return;
    setSavingValues(true);
    try {
      const values = buildLidValuesPayload(columnDefs, valueForm);
      await apiLids.update(lid.id, {
        fio: lid.fio,
        telefon_raqam: lid.telefon_raqam,
        ota_ona_fio: lid.ota_ona_fio,

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

  const statusColor = lid?.status?.color || "#e91e63";
  const creatorName = lid?.created_by_name || lid?.creator?.full_name || "—";

  const isPanel =
    pathname.startsWith("/admin") || pathname.startsWith("/operator");

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
                  value={lid.assignee.full_name || "—"}
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

              {canManageColumns ? (
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
              ) : null}
            </Grid>
          </VStack>
        )}
      </Box>
    </Box>
  );
}

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
