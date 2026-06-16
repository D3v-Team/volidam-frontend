import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalCloseButton, Button, VStack, HStack, Text, Select, Input, Box, useColorModeValue, Flex, Icon, InputGroup, InputLeftElement, Badge, Textarea } from "@chakra-ui/react";
import AppSpinner from "../../../components/ui/AppSpinner";

import {
  Plus,
  Search,
  DollarSign,
  ClipboardList,
  MapPin,
  Package,
  Bell,
  Building2,
  Code2,
  MoreHorizontal,
} from "lucide-react";
import { useToast } from "../../../hooks/useToast";
import { apiStock } from "../../../utils/Controllers/apiStock";
import { apiTasks } from "../../../utils/Controllers/apiTasks";
import { apiLocationsNote } from "../../../utils/Controllers/apiLocationNotes";
import PaginationBar from "../../../components/common/PaginationBar";
import { apiUsers } from "../../../utils/Controllers/Users";
import { apiManagers } from "../../../utils/Controllers/Managers";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_ALLOWED_TASK_TYPES = [
  "reorder",
  "price_update",
  "notification",
  "developer",
  "other",
];

/** Brauzer `datetime-local` uchun mahalliy vaqt (YYYY-MM-DDTHH:mm). */
function toDatetimeLocalValue(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

function defaultDueDatetimeLocalForTaskType(taskType) {
  const t = String(taskType ?? "")
    .trim()
    .toLowerCase();
  if (
    t === "notification" ||
    t === "company" ||
    t === "developer" ||
    t === "other"
  ) {
    return toDatetimeLocalValue(new Date(Date.now() + 30 * 60 * 1000));
  }
  if (t === "reorder" || t === "price_update") {
    return toDatetimeLocalValue(new Date());
  }
  return "";
}

function isUuid(v) {
  if (v == null) return false;
  const s = typeof v === "string" ? v.trim() : String(v).trim();
  return UUID_RE.test(s);
}

function hasId(v) {
  if (v == null) return false;
  return String(v).trim() !== "";
}

function pickUuid(...cands) {
  for (const c of cands) {
    if (c == null) continue;
    const s = typeof c === "string" ? c.trim() : String(c);
    if (isUuid(s)) return s;
  }
  return "";
}

function factoryFromStock(stock) {
  if (!stock) return "";
  const d = pickUuid(
    stock.location?.parent?.id,
    stock.factory_id,
    stock.product?.factory_id,
    stock.product?.factory?.id,
  );
  if (d) return d;
  let n = stock.location;
  const seen = new Set();
  while (n && !seen.has(n)) {
    seen.add(n);
    const type = String(n.type || n.location_type || "").toLowerCase();
    if (type === "factory") {
      const id = pickUuid(n.id);
      if (id) return id;
    }
    n = n.parent;
  }
  return pickUuid(
    stock.location?.factory_id,
    stock.location?.parent_id,
    stock.product?.location?.parent?.id,
  );
}

function warehouseFromStock(stock) {
  return pickUuid(stock?.location_id, stock?.location?.id);
}

function categoryLabel(stock, lineItem) {
  const p = stock?.product || {};
  const o = lineItem || {};
  const v =
    p.category?.name ||
    p.local_category?.name ||
    p.category_name ||
    o.category_name ||
    o.product_category_name ||
    "";
  return String(v).trim() || "Kategoriyasiz";
}

const MAX_PAGES = 25;

async function enrichStockFromBroker(stock, lineItem) {
  const name =
    stock?.product?.name?.trim() || lineItem?.product_name?.trim() || "";
  const id = stock?.id != null ? String(stock.id) : "";
  if (!name || !id) return null;
  let page = 1;
  let total = 1;
  try {
    do {
      const res = await apiStock.GetStock({ name, page });
      const rows = res?.data?.data ?? [];
      const m = rows.find((r) => r && String(r.id) === id);
      if (m) {
        return {
          ...stock,
          ...m,
          product: { ...(stock?.product || {}), ...(m.product || {}) },
          location: m.location ?? stock.location,
        };
      }
      total = res?.data?.pagination?.totalPages ?? 1;
      page += 1;
    } while (page <= total && page <= MAX_PAGES);
  } catch (e) {
    console.error(e);
  }
  return null;
}

function hiddenIdsFromStock(stock) {
  if (!stock) {
    return { factory_id: "", warehouse_id: "", stock_id: "" };
  }
  const fid = factoryFromStock(stock);
  const wid = warehouseFromStock(stock);
  const sid = stock.id != null ? String(stock.id).trim() : "";
  return { factory_id: fid, warehouse_id: wid, stock_id: sid };
}

function formatApiErr(err) {
  const m = err?.response?.data?.message;
  if (Array.isArray(m)) return m.join(". ");
  if (typeof m === "string") return m;
  return null;
}

function normalizeUsersResponse(res) {
  const root = res?.data;
  const inner = root?.data != null ? root.data : root;
  const items =
    (Array.isArray(inner?.records) && inner.records) ||
    (Array.isArray(inner?.items) && inner.items) ||
    (Array.isArray(inner) && inner) ||
    (Array.isArray(root?.records) && root.records) ||
    [];
  const pagination =
    inner?.pagination || root?.pagination || inner?.meta || root?.meta || {};
  return { items, pagination };
}

function formatPrice(price) {
  const n = parseFloat(price);
  if (Number.isNaN(n)) return "—";
  return `${n.toLocaleString("uz-UZ")} UZS`;
}

/**
 * Bildirishnoma `details` ichiga qo‘shiladi: location_id, location_name, location_type
 * (factory | kompaniya | customer).
 */
export default function CreateTaskModal({
  isOpen,
  onClose,
  onCreated,
  initialNotifNote = "",
  initialTaskTypeFromParent = "",
  lockAssignee = false,
  lockedAssigneeId = "",
  lockedAssigneeType = "supplier",
  allowedTaskTypes = DEFAULT_ALLOWED_TASK_TYPES,
  notificationLocationMeta = null,
}) {
  const toast = useToast();
  const allowedTypes = useMemo(() => {
    const base =
      Array.isArray(allowedTaskTypes) && allowedTaskTypes.length > 0
        ? allowedTaskTypes
        : DEFAULT_ALLOWED_TASK_TYPES;
    // normalize to string list
    return base.map((x) => String(x));
  }, [allowedTaskTypes]);
  const allowedTypesKey = useMemo(() => allowedTypes.join("|"), [allowedTypes]);
  const [taskType, setTaskType] = useState("reorder");
  const [searchTerm, setSearchTerm] = useState("");
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedStock, setSelectedStock] = useState(null);
  const manualSelected = !!selectedStock?.__manual;
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [notifNote, setNotifNote] = useState("");
  // const [assigneeRole, setAssigneeRole] = useState("supplier");
  const [assigneeId, setAssigneeId] = useState("");
  const [assignees, setAssignees] = useState([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assigneesPage, setAssigneesPage] = useState(1);
  const [assigneesTotalPages, setAssigneesTotalPages] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [statusOptionsForCreate, setStatusOptionsForCreate] = useState([]);
  const [createStatus, setCreateStatus] = useState("");

  const usesStockPicker = taskType === "reorder" || taskType === "price_update";
  const isSimpleTaskForm =
    taskType === "notification" ||
    taskType === "company" ||
    taskType === "developer" ||
    taskType === "other";

  const restrictAssigneeToSupplier =
    !lockAssignee && (taskType === "reorder" || taskType === "price_update");
  const restrictAssigneeToDeveloper = !lockAssignee && taskType === "developer";

  const changeTaskType = useCallback((next) => {
    setTaskType(next);
    setDueDate(defaultDueDatetimeLocalForTaskType(next));
  }, []);

  const panelBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const cardBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const footerBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const headerBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const heroBg = useColorModeValue(
    "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 50%, #ddd6fe 100%)",
    "linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(99,102,241,0.25) 100%)",
  );
  const listItemBg = useColorModeValue("white", "whiteAlpha.100");
  const selectedRing = useColorModeValue("blue.400", "blue.300");
  const headerIconBg = useColorModeValue("white", "whiteAlpha.200");

  const lineItemForStock = useCallback(
    (s) =>
      s ? { product_name: s.product?.name || "", category_name: "" } : null,
    [],
  );

  const fetchStock = useCallback(
    async (page = 1, search = "") => {
      try {
        setLoading(true);
        const response = await apiStock.GetStock({ name: search, page });
        if (response?.data?.data) {
          setStockData(response.data.data);
          setCurrentPage(response.data.pagination?.currentPage || 1);
          setTotalPages(response.data.pagination?.totalPages || 1);
          setTotalCount(response.data.pagination?.totalCount || 0);
        } else {
          setStockData([]);
        }
      } catch (error) {
        console.error(error);
        toast({
          title: "Xatolik",
          description: "Stokni yuklashda muammo",
          status: "error",
          duration: 4000,
          isClosable: true,
           position: "top",
        });
        setStockData([]);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (!isOpen) return;
    const fromParent = String(initialTaskTypeFromParent || "").trim();
    const initType =
      fromParent && allowedTypes.includes(fromParent)
        ? fromParent
        : String(allowedTypes[0] ?? "reorder");
    setTaskType(initType);
    setSearchTerm("");
    setStockData([]);
    setCurrentPage(1);
    setTotalPages(1);
    setTotalCount(0);
    setSelectedStock(null);
    setPriority("normal");
    setDueDate(defaultDueDatetimeLocalForTaskType(initType));
    setNotifNote(String(initialNotifNote || "").trim());
    setAssigneeId(lockAssignee ? String(lockedAssigneeId || "").trim() : "");
    setAssignees([]);
    setAssigneesPage(1);
    setAssigneesTotalPages(1);
  }, [
    isOpen,
    lockAssignee,
    lockedAssigneeId,
    lockedAssigneeType,
    allowedTypesKey,
    initialNotifNote,
    initialTaskTypeFromParent,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (!allowedTypes.includes(String(taskType))) {
      const fix = String(allowedTypes[0] ?? "reorder");
      setTaskType(fix);
      setDueDate(defaultDueDatetimeLocalForTaskType(fix));
    }
  }, [allowedTypesKey, isOpen, taskType]);

  // useEffect(() => {
  //     if (!isOpen) return;
  //     if (!restrictAssigneeToSupplier) return;
  //     if (assigneeRole !== "supplier") {
  //         setAssigneeRole("supplier");
  //         setAssigneeId("");
  //         setAssigneesPage(1);
  //     }
  // }, [assigneeRole, isOpen, restrictAssigneeToSupplier]);

  // useEffect(() => {
  //     if (!isOpen) return;
  //     if (!restrictAssigneeToDeveloper) return;
  //     if (assigneeRole !== "developer") {
  //         setAssigneeRole("developer");
  //         setAssigneeId("");
  //         setAssigneesPage(1);
  //     }
  // }, [assigneeRole, isOpen, restrictAssigneeToDeveloper]);

  // useEffect(() => {
  //     if (!isOpen) return;
  //     if (lockAssignee) return;
  //     if (taskType !== "notification") return;
  //     if (assigneeRole !== "admin") return;
  //     setAssigneeRole("supplier");
  //     setAssigneeId("");
  //     setAssigneesPage(1);
  // }, [assigneeRole, isOpen, lockAssignee, taskType]);

  // // Admin assign option removed: normalize any persisted state
  // useEffect(() => {
  //     if (!isOpen) return;
  //     if (lockAssignee) return;
  //     if (assigneeRole !== "admin") return;
  //     setAssigneeRole("supplier");
  //     setAssigneeId("");
  //     setAssigneesPage(1);
  // }, [assigneeRole, isOpen, lockAssignee]);

  useEffect(() => {
    if (!isOpen) return;
    if (
      ![
        "notification",
        "reorder",
        "price_update",
        "company",
        "developer",
        "other",
      ].includes(String(taskType))
    )
      return;
    if (lockAssignee) return;
    let cancelled = false;
    (async () => {
      setAssigneesLoading(true);
      try {
        const role = taskType === "developer" ? "developer" : "supplier";

        const res = await apiUsers.GetUserRole(role);

        const { items, pagination } = normalizeUsersResponse(res);
        const safeItems = Array.isArray(items) ? items : [];
        if (!cancelled) {
          setAssignees(safeItems);
          const tot =
            pagination?.totalPages ??
            pagination?.total_pages ??
            pagination?.total_pages_count ??
            pagination?.total ??
            1;
          setAssigneesTotalPages(Number(tot) > 0 ? Number(tot) : 1);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setAssignees([]);
          setAssigneesTotalPages(1);
        }
      } finally {
        if (!cancelled) setAssigneesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, taskType, assigneesPage, lockAssignee]);

  const handleSearch = () => {
    fetchStock(1, searchTerm.trim());
  };

  useEffect(() => {
    if (!isOpen || !selectedStock?.id) return;
    const fid = factoryFromStock(selectedStock);
    const wid = warehouseFromStock(selectedStock);
    if (fid && wid) return;
    const stockSnapshot = selectedStock;
    let cancelled = false;
    (async () => {
      const merged = await enrichStockFromBroker(
        stockSnapshot,
        lineItemForStock(stockSnapshot),
      );
      if (cancelled || !merged) return;
      setSelectedStock(merged);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yangi stok tanlanganda bir marta boyitish
  }, [isOpen, selectedStock?.id, lineItemForStock]);

  const submit = async () => {
    if (!allowedTypes.includes(String(taskType))) {
      toast({
        title: "Type",
        description: "Bu turdagi vazifani yaratish mumkin emas",
        status: "warning",
        duration: 4000,
        isClosable: true,
         position: "top",
      });
      return;
    }
    if (
      taskType === "notification" ||
      taskType === "company" ||
      taskType === "developer" ||
      taskType === "other"
    ) {
      if (!notifNote.trim()) {
        toast({
          title: "Ma'lumot",
          description:
            taskType === "notification"
              ? "Bildirishnoma matnini kiriting"
              : "Izoh / matn kiriting",
          status: "warning",
          duration: 4000,
          isClosable: true,
           position: "top",
        });
        return;
      }
      const effectiveRole = lockAssignee
        ? lockedAssigneeType
        : taskType === "developer"
          ? "developer"
          : "supplier";
      const effectiveAssigneeId = lockAssignee ? lockedAssigneeId : assigneeId;

      if (!effectiveRole) {
        toast({
          title: "Role",
          description: "Role (assignee type) tanlang",
          status: "warning",
          duration: 4000,
          isClosable: true,
           position: "top",
        });
        return;
      }
      const idOk = lockAssignee
        ? hasId(effectiveAssigneeId)
        : isUuid(effectiveAssigneeId);
      if (!idOk) {
        toast({
          title: "Bajaruvchi",
          description: "Mas'ul shaxsni tanlang",
          status: "warning",
          duration: 4000,
          isClosable: true,
           position: "top",
        });
        return;
      }
      const details = { note: notifNote.trim() };
      if (
        notificationLocationMeta &&
        typeof notificationLocationMeta === "object"
      ) {
        const lid = String(notificationLocationMeta.location_id ?? "").trim();
        const lname = String(
          notificationLocationMeta.location_name ?? "",
        ).trim();
        const ltype = String(
          notificationLocationMeta.location_type ?? "",
        ).trim();
        if (lid) details.location_id = lid;
        if (lname) details.location_name = lname;
        if (ltype) details.location_type = ltype;
      }

      const typePayload =
        taskType === "notification" ? "notification" : taskType;

      const payload = {
        assignee_id: String(effectiveAssigneeId).trim(),
        assignee_type: String(effectiveRole).trim(),
        type: typePayload,
        priority,
        source: "manual",
        details,
      };

      if (dueDate) {
        const d = new Date(dueDate);
        if (!Number.isNaN(d.getTime())) payload.due_date = d.toISOString();
      }
      setSubmitting(true);
      try {
        await apiTasks.create(payload);
        // If notification is created from a location chat, mirror it into that chat notes.
        try {
          const lid = String(details?.location_id ?? "").trim();
          const note = String(details?.note ?? "").trim();
          if (lid && note) {
            await apiLocationsNote.Post({ location_id: lid, note });
          }
        } catch (e3) {
          console.error(e3);
        }
        toast({
          title: "Yuborildi",
          description: "Vazifa yaratildi",
          status: "success",
          duration: 3000,
          isClosable: true,
            position: "top",

        });
        onCreated?.();
        onClose();
      } catch (e) {
        // Backward-compat fallback: some backends still expect `type: notfic`
        const msg = e?.response?.data?.message;
        const typeErr = (
          Array.isArray(msg) ? msg.join(" ") : String(msg || "")
        ).includes("type faqat");
        if (typeErr && taskType === "notification") {
          try {
            await apiTasks.create({ ...payload, type: "notfic" });
            try {
              const lid = String(details?.location_id ?? "").trim();
              const note = String(details?.note ?? "").trim();
              if (lid && note) {
                await apiLocationsNote.Post({ location_id: lid, note });
              }
            } catch (e3) {
              console.error(e3);
            }
            toast({
              title: "Yuborildi",
              description: "Vazifa yaratildi",
              status: "success",
              duration: 3000,
              isClosable: true,
               position: "top",
            });
            onCreated?.();
            onClose();
            return;
          } catch (e2) {
            console.error(e2);
            toast({
              title: "Xatolik",
              description: formatApiErr(e2) || "So'rov xatosi",
              status: "error",
              duration: 6000,
              isClosable: true,
               position: "top",
            });
            return;
          } finally {
            setSubmitting(false);
          }
        }

        console.error(e);
        toast({
          title: "Xatolik",
          description: formatApiErr(e) || "So'rov xatosi",
          status: "error",
          duration: 6000,
          isClosable: true,
           position: "top",
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!selectedStock) {
      const typed = String(searchTerm || "").trim();
      // "Mahsulot topish" taskida mahsulot topilmasa, foydalanuvchi kiritgan qiymatni yuborishga ruxsat
      if (!(taskType === "reorder" && typed)) {
        toast({
          title: "Tanlang",
          description: "Avval ro'yxatdan stok tanlang",
          status: "warning",
          duration: 4000,
          isClosable: true,
           position: "top",
        });
        return;
      }
    }

    const effectiveRole = lockAssignee ? lockedAssigneeType : "supplier";
    const effectiveAssigneeId = lockAssignee ? lockedAssigneeId : assigneeId;

    if (!effectiveRole) {
      toast({
        title: "Role",
        description: "Role (assignee type) tanlang",
        status: "warning",
        duration: 4000,
        isClosable: true,
         position: "top",
      });
      return;
    }
    const idOk = lockAssignee
      ? hasId(effectiveAssigneeId)
      : isUuid(effectiveAssigneeId);
    if (!idOk) {
      toast({
        title: "Bajaruvchi",
        description: "Assignee tanlang",
        status: "warning",
        duration: 4000,
        isClosable: true,
         position: "top",
      });
      return;
    }

    if (taskType === "notfic" && !notifNote.trim()) {
      toast({
        title: "Ma'lumot",
        description: "Bildirishnoma matnini kiriting",
        status: "warning",
        duration: 4000,
        isClosable: true,
         position: "top",
      });
      return;
    }

    // reorder + mahsulot topilmagan holatda manual "stock" yaratib yuboramiz
    let stock =
      selectedStock ||
      (taskType === "reorder" && String(searchTerm || "").trim()
        ? {
            id: `manual:${String(searchTerm || "").trim()}`,
            __manual: true,
            product: { name: String(searchTerm || "").trim() },
          }
        : null);
    let ids = hiddenIdsFromStock(stock);
    if (
      stock &&
      !stock?.__manual &&
      (!isUuid(ids.factory_id) ||
        !isUuid(ids.warehouse_id) ||
        !isUuid(ids.stock_id))
    ) {
      const merged = await enrichStockFromBroker(
        stock,
        lineItemForStock(stock),
      );
      if (merged) {
        stock = merged;
        setSelectedStock(merged);
        ids = hiddenIdsFromStock(merged);
      }
    }

    let productName = (stock?.product?.name || "").trim();
    let categoryName = categoryLabel(stock, lineItemForStock(stock));

    // Agar mahsulot topilmasa, "Mahsulot topish (reorder)" uchun input qiymatini yuboramiz.
    if (!productName) {
      const typed = String(searchTerm || "").trim();
      if (taskType === "reorder" && typed) {
        productName = typed;
        categoryName = categoryName || "";
        // stock yo'q bo'lishi mumkin, shuning uchun factory/warehouse/stock id majburiy emas
        ids = { factory_id: "", warehouse_id: "", stock_id: "" };
      } else {
        toast({
          title: "Ma'lumot",
          description: "Mahsulot nomi topilmadi",
          status: "warning",
          duration: 4000,
          isClosable: true,
           position: "top",
        });
        return;
      }
    }
    // Price update uchun stock id'lar majburiy
    if (taskType === "price_update") {
      if (!isUuid(ids.factory_id)) {
        toast({
          title: "Zavod",
          description:
            "factory_id aniqlanmadi. Boshqa stok tanlang yoki keyinroq urinib ko'ring.",
          status: "warning",
          duration: 5000,
          isClosable: true,
           position: "top",
        });
        return;
      }
      if (!isUuid(ids.warehouse_id) || !isUuid(ids.stock_id)) {
        toast({
          title: "Ma'lumot",
          description: "warehouse_id yoki stock_id noto'g'ri",
          status: "warning",
          duration: 4000,
          isClosable: true,
           position: "top",
        });
        return;
      }
    }

    const typeValue = taskType === "price_update" ? "price_update" : "reorder";

    const details = {
      product_name: productName,
      category_name: categoryName,
    };

    if (isUuid(ids.factory_id)) details.factory_id = ids.factory_id;
    if (isUuid(ids.warehouse_id)) details.warehouse_id = ids.warehouse_id;
    if (isUuid(ids.stock_id)) details.stock_id = ids.stock_id;

    const body = {
      assignee_id: String(effectiveAssigneeId).trim(),
      assignee_type: String(effectiveRole).trim(),
      type: typeValue,
      priority,
      source: "manual",
      details,
    };

    if (taskType === "reorder") {
      if (dueDate) {
        const d = new Date(dueDate);
        if (!Number.isNaN(d.getTime())) body.due_date = d.toISOString();
        else body.due_date = new Date().toISOString();
      } else {
        body.due_date = new Date().toISOString();
      }
    } else if (taskType === "price_update") {
      if (dueDate) {
        const d = new Date(dueDate);
        if (!Number.isNaN(d.getTime())) body.due_date = d.toISOString();
        else body.due_date = new Date().toISOString();
      } else {
        body.due_date = new Date().toISOString();
      }
    }

    setSubmitting(true);
    try {
      await apiTasks.create(body);
      toast({
        title: "Yuborildi",
        description: "Vazifa yaratildi",
        status: "success",
        duration: 3000,
        isClosable: true,
         position: "top",
      });
      onCreated?.();
      onClose();
    } catch (e) {
      console.error(e);
      toast({
        title: "Xatolik",
        description: formatApiErr(e) || "So'rov xatosi",
        status: "error",
        duration: 6000,
        isClosable: true,
         position: "top",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      scrollBehavior="inside"
      isCentered
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(6px)" />
      <ModalContent
        borderRadius="2xl"
        overflow="hidden"
        boxShadow="2xl"
        maxH="90vh"
        bg="surface"
      >
        <Box
          px={6}
          py={5}
          borderBottomWidth="1px"
          borderColor={headerBorder}
          bgImage={heroBg}
        >
          <HStack justify="space-between" pr={10} align="start">
            <HStack spacing={3}>
              <Box>
                <Text fontWeight="bold" fontSize="lg">
                  Yangi vazifa
                </Text>
                <Text fontSize="sm" color="gray.400" mt={0.5}>
                  {usesStockPicker
                    ? "Stokdan mahsulot tanlang va yuboring"
                    : "Mas’ul shaxs va tafsilotlarni kiriting"}
                </Text>
              </Box>
            </HStack>
          </HStack>
          <ModalCloseButton top={4} />
        </Box>

        <ModalBody px={6} py={5}>
          <VStack align="stretch" spacing={5}>
            <Flex gap={3} wrap="wrap">
              {allowedTypes.includes("company") ? (
                <Button
                  flex="1"
                  minW="140px"
                  size="md"
                  leftIcon={<Icon as={Building2} boxSize={4} />}
                  variant={taskType === "company" ? "solid" : "outline"}
                  colorScheme="cyan"
                  borderRadius="xl"
                  onClick={() => changeTaskType("company")}
                >
                  Kompaniya
                </Button>
              ) : null}
              {allowedTypes.includes("notification") ? (
                <Button
                  flex="1"
                  minW="140px"
                  size="md"
                  leftIcon={<Icon as={Bell} boxSize={4} />}
                  variant={taskType === "notification" ? "solid" : "outline"}
                  colorScheme="blue"
                  borderRadius="xl"
                  onClick={() => changeTaskType("notification")}
                >
                  Bildirishnoma
                </Button>
              ) : null}
              {allowedTypes.includes("price_update") ? (
                <Button
                  flex="1"
                  minW="140px"
                  size="md"
                  leftIcon={<Icon as={DollarSign} boxSize={4} />}
                  variant={taskType === "price_update" ? "solid" : "outline"}
                  colorScheme="orange"
                  borderRadius="xl"
                  onClick={() => changeTaskType("price_update")}
                >
                  Narx yangilash
                </Button>
              ) : null}
              {allowedTypes.includes("reorder") ? (
                <Button
                  flex="1"
                  minW="140px"
                  size="md"
                  leftIcon={<Icon as={ClipboardList} boxSize={4} />}
                  variant={taskType === "reorder" ? "solid" : "outline"}
                  colorScheme="purple"
                  borderRadius="xl"
                  onClick={() => changeTaskType("reorder")}
                >
                  Mahsulot topish
                </Button>
              ) : null}
              {allowedTypes.includes("developer") ? (
                <Button
                  flex="1"
                  minW="140px"
                  size="md"
                  leftIcon={<Icon as={Code2} boxSize={4} />}
                  variant={taskType === "developer" ? "solid" : "outline"}
                  colorScheme="teal"
                  borderRadius="xl"
                  onClick={() => changeTaskType("developer")}
                >
                  Dasturiy ta&apos;minot
                </Button>
              ) : null}
              {allowedTypes.includes("other") ? (
                <Button
                  flex="1"
                  minW="140px"
                  size="md"
                  leftIcon={<Icon as={MoreHorizontal} boxSize={4} />}
                  variant={taskType === "other" ? "solid" : "outline"}
                  colorScheme="gray"
                  borderRadius="xl"
                  onClick={() => changeTaskType("other")}
                >
                  Boshqa
                </Button>
              ) : null}
            </Flex>

            {usesStockPicker ? (
              <Box
                p={4}
                borderRadius="xl"
                bg={panelBg}
                borderWidth="1px"
                borderColor={cardBorder}
              >
                <Text fontSize="sm" fontWeight="bold" mb={3}>
                  Qidiruv
                </Text>
                <HStack spacing={2}>
                  <InputGroup size="md" flex={1}>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={Search} color="gray.400" boxSize={4} />
                    </InputLeftElement>
                    <Input
                      pl={10}
                      borderRadius="lg"
                      placeholder="Mahsulot nomi bo'yicha qidirish..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </InputGroup>
                  <Button
                    colorScheme="blue"
                    borderRadius="lg"
                    onClick={handleSearch}
                    isLoading={loading}
                  >
                    Qidirish
                  </Button>
                </HStack>
              </Box>
            ) : null}

            {isSimpleTaskForm ? (
              <Box
                p={4}
                borderRadius="xl"
                bg={panelBg}
                borderWidth="1px"
                borderColor={cardBorder}
              >
                <HStack spacing={2} mb={2}>
                  <Icon
                    as={
                      taskType === "notification"
                        ? Bell
                        : taskType === "company"
                          ? Building2
                          : taskType === "developer"
                            ? Code2
                            : MoreHorizontal
                    }
                    boxSize={4}
                    color={
                      taskType === "notification"
                        ? "blue.500"
                        : taskType === "company"
                          ? "cyan.600"
                          : taskType === "developer"
                            ? "teal.600"
                            : "gray.600"
                    }
                  />
                  <Text fontSize="sm" fontWeight="bold">
                    {taskType === "notification"
                      ? "Bildirishnoma matni"
                      : taskType === "company"
                        ? "Kompaniya vazifasi"
                        : taskType === "developer"
                          ? "Dasturiy ta'minot vazifasi"
                          : "Izoh / vazifa matni"}
                  </Text>
                </HStack>
                {!lockAssignee ? (
                  <>
                    <Flex gap={3} wrap="nowrap" mb={3} align="flex-start">
                      {/* <Box flex="1" minW="170px">
                                                <Text
                                                    fontSize="sm"
                                                    fontWeight="semibold"
                                                    mb={1}
                                                >
                                                    Role (assignee type)
                                                </Text>
                                            </Box> */}
                      <Box flex="1" minW="170px">
                        <Text fontSize="sm" fontWeight="semibold" mb={1}>
                          Muddat (ixtiyoriy)
                        </Text>
                        <Input
                          type="datetime-local"
                          size="md"
                          borderRadius="lg"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                        />
                      </Box>
                      <Box flex="1" minW="220px">
                        <Text fontSize="sm" fontWeight="semibold" mb={1}>
                          Bajaruvchi (assignee)
                        </Text>
                        <Select
                          value={assigneeId}
                          onChange={(e) => setAssigneeId(e.target.value)}
                          borderRadius="lg"
                          isDisabled={assigneesLoading}
                        >
                          <option value="">Tanlang...</option>
                          {assignees.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name || u.username || u.phone || u.id}
                            </option>
                          ))}
                        </Select>
                        {assigneesLoading ? (
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            Yuklanmoqda...
                          </Text>
                        ) : null}
                      </Box>
                    </Flex>
                    {assigneesTotalPages > 1 ? (
                      <PaginationBar
                        mt={1}
                        page={assigneesPage}
                        totalPages={assigneesTotalPages}
                        loading={assigneesLoading}
                        onPageChange={(p) => setAssigneesPage(p)}
                      />
                    ) : null}
                  </>
                ) : null}
                <Textarea
                  value={notifNote}
                  onChange={(e) => setNotifNote(e.target.value)}
                  placeholder="+998901234567 ga qo'ng'iroq qilish kerak"
                  borderRadius="lg"
                  rows={4}
                  bg={useColorModeValue("white", "gray.900")}
                />
              </Box>
            ) : null}

            {usesStockPicker && !loading && stockData.length > 0 && (
              <Text fontSize="sm" color="gray.600">
                {totalCount} ta natija · sahifa {currentPage} / {totalPages}
              </Text>
            )}

            {usesStockPicker && loading ? (
              <Flex justify="center" py={10}>
                <AppSpinner />
              </Flex>
            ) : usesStockPicker && stockData.length === 0 ? (
              <Box
                textAlign="center"
                py={10}
                borderRadius="xl"
                borderWidth="1px"
                borderStyle="dashed"
                borderColor={cardBorder}
              >
                <Icon
                  as={Package}
                  boxSize={10}
                  color="gray.300"
                  mx="auto"
                  mb={2}
                />
                <Text color="gray.500">
                  Qidiruvni bosing yoki boshqa so&apos;z yozing
                </Text>
                {taskType === "reorder" && String(searchTerm || "").trim() ? (
                  <Button
                    mt={4}
                    colorScheme="blue"
                    borderRadius="xl"
                    onClick={() => {
                      const typed = String(searchTerm || "").trim();
                      if (!typed) return;
                      setSelectedStock({
                        id: `manual:${typed}`,
                        __manual: true,
                        product: { name: typed },
                      });
                      toast({
                        title: "Tanlandi",
                        description:
                          "Mahsulot topilmadi, kiritilgan nom bilan yuboriladi",
                        status: "info",
                        duration: 2500,
                        isClosable: true,
                         position: "top",
                      });
                    }}
                  >
                    Qo&apos;shish
                  </Button>
                ) : null}
              </Box>
            ) : usesStockPicker ? (
              <VStack
                align="stretch"
                spacing={3}
                maxH="280px"
                overflowY="auto"
                pr={1}
              >
                {stockData.map((stock) => {
                  const isSel =
                    selectedStock &&
                    String(selectedStock.id) === String(stock.id);
                  const price =
                    stock.sale_price_type?.[0]?.sale_price ||
                    stock.purchase_price;
                  return (
                    <Box
                      key={stock.id}
                      p={4}
                      borderRadius="xl"
                      borderWidth="2px"
                      borderColor={isSel ? selectedRing : cardBorder}
                      bg={isSel ? panelBg : listItemBg}
                      cursor="pointer"
                      transition="all 0.2s"
                      _hover={{ shadow: "md" }}
                      onClick={() => setSelectedStock(stock)}
                    >
                      <Flex
                        justify="space-between"
                        align="start"
                        gap={3}
                        wrap="wrap"
                      >
                        <Box minW={0}>
                          <Text fontWeight="semibold" noOfLines={2}>
                            {stock.product?.name}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            Partiya: {stock.batch}
                          </Text>
                          <HStack mt={2} spacing={2}>
                            <Badge colorScheme="blue">
                              {parseFloat(stock.quantity).toLocaleString()}{" "}
                              {stock.product?.unit}
                            </Badge>
                            <Badge variant="outline" maxW="200px">
                              <HStack spacing={1}>
                                <Icon as={MapPin} boxSize={3} />
                                <Text isTruncated fontSize="xs">
                                  {stock.location?.parent?.name ||
                                    stock.location?.address?.slice(0, 28)}
                                </Text>
                              </HStack>
                            </Badge>
                          </HStack>
                        </Box>
                        <Text fontWeight="bold" fontSize="md" color="blue.600">
                          {formatPrice(price)}
                        </Text>
                      </Flex>
                    </Box>
                  );
                })}
              </VStack>
            ) : null}

            {usesStockPicker ? (
              <PaginationBar
                mt={3}
                page={currentPage}
                totalPages={totalPages}
                loading={loading}
                onPageChange={(p) => fetchStock(p, searchTerm.trim())}
              />
            ) : null}

            <Flex wrap="wrap" gap={4} align="flex-end">
              {!lockAssignee &&
              (taskType === "reorder" || taskType === "price_update") ? (
                <>
                  <Box flex="1" minW="260px">
                    <Text fontSize="sm" fontWeight="semibold" mb={1}>
                      Bajaruvchi (assignee)
                    </Text>
                    <Select
                      size="md"
                      borderRadius="lg"
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      isDisabled={assigneesLoading}
                    >
                      <option value="">Tanlang...</option>
                      {assignees.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name || u.username || u.phone || u.id}
                        </option>
                      ))}
                    </Select>
                    {assigneesLoading ? (
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        Yuklanmoqda...
                      </Text>
                    ) : null}
                    {assigneesTotalPages > 1 ? (
                      <PaginationBar
                        mt={1}
                        page={assigneesPage}
                        totalPages={assigneesTotalPages}
                        loading={assigneesLoading}
                        onPageChange={(p) => setAssigneesPage(p)}
                      />
                    ) : null}
                  </Box>
                </>
              ) : null}
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={1}>
                  Muhimlik
                </Text>
                <Select
                  size="md"
                  borderRadius="lg"
                  maxW="220px"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="low">Past</option>
                  <option value="normal">Oddiy</option>
                  <option value="high">Yuqori</option>
                  <option value="urgent">Shoshilinch</option>
                </Select>
              </Box>
              {taskType === "price_update" || taskType === "reorder" ? (
                <Box flex="1" minW="200px">
                  <Text fontSize="sm" fontWeight="semibold" mb={1}>
                    Muddat (ixtiyoriy)
                  </Text>
                  <Input
                    type="datetime-local"
                    size="md"
                    borderRadius="lg"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </Box>
              ) : null}
            </Flex>
          </VStack>
        </ModalBody>

        <ModalFooter
          bg={footerBg}
          borderTopWidth="1px"
          borderColor={headerBorder}
          gap={3}
          py={4}
          px={6}
        >
          <Button variant="ghost" onClick={onClose} isDisabled={submitting}>
            Bekor qilish
          </Button>
          <Button
            colorScheme={taskType === "price_update" ? "orange" : "purple"}
            onClick={submit}
            isLoading={submitting}
            px={8}
            borderRadius="xl"
            leftIcon={<Icon as={Plus} boxSize={4} />}
          >
            Yaratish
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
