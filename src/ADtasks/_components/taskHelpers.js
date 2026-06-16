import { formatDateTimeTashkent } from "../../../utils/date/tashkent";
import { Package, Users, User, Building2 } from "lucide-react";

export const TASK_TYPE_UZ = {
    company: "Kompaniya",
    reorder: "Mahsulot topish",
    price_update: "Narx yangilash",
    notification: "Bildirishnoma",
    notfic: "Bildirishnoma",
    developer: "Dasturiy ta'minot",
    other: "Boshqa",
};

/** ADtasks type tab tartibi: Barchasi yo‘q — birinchi `company`. */
export const AD_TASK_TYPES_ORDER = [
    "company",
    "notification",
    "price_update",
    "reorder",
    "developer",
    "other",
];

export const TASK_STATUS_UZ = {
    pending: "Kutilmoqda",
    in_progress: "Bajarilmoqda",
    done: "Bajarildi",
    cancelled: "Bekor qilindi",
    new: "Yangi",
    open: "Ochiq",
    closed: "Yopiq",
    failed: "Muvaffaqiyatsiz",
};

export const TASK_PRIORITY_UZ = {
    low: "Past",
    normal: "Oddiy",
    medium: "O‘rtacha",
    high: "Yuqori",
    urgent: "Shoshilinch",
};

export function formatWhen(iso) {
    return formatDateTimeTashkent(iso);
}

export function taskTypeLabel(raw) {
    if (raw == null || String(raw).trim() === "") return "—";
    const k = String(raw).trim().toLowerCase();
    return TASK_TYPE_UZ[k] ?? String(raw);
}

export function taskStatusLabel(raw) {
    if (raw == null || String(raw).trim() === "") return "—";
    // API ba'zan status'ni object qilib yuboradi: { id, name, ... }
    if (raw && typeof raw === "object") {
        const n = raw?.name ?? raw?.status;
        if (n != null && String(n).trim() !== "") {
            const k2 = String(n).trim().toLowerCase();
            return TASK_STATUS_UZ[k2] ?? String(n);
        }
        return "—";
    }
    const k = String(raw).trim().toLowerCase();
    return TASK_STATUS_UZ[k] ?? String(raw);
}

export function taskPriorityLabel(raw) {
    if (raw == null || String(raw).trim() === "") return "—";
    const k = String(raw).trim().toLowerCase();
    return TASK_PRIORITY_UZ[k] ?? String(raw);
}

function normAclStatusToken(name) {
    return String(name ?? "")
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, " ")
        .replace(/[ʼ'`ʻ]/g, "'");
}

/**
 * Standart quvur holatlari (Kutilmoqda, Jarayonda, …) — `company` dan tashqari
 * turlarda tahrirlash/o‘chirish mumkin emas.
 */
const PROTECTED_PIPELINE_STATUS_TOKENS = new Set([
    "pending",
    "in_progress",
    "done",
    "cancelled",
    "completed",
    "kutilmoqda",
    "jarayonda",
    "bajarilmoqda",
    "bajarildi",
    "bekor qilindi",
    "bekorqilindi",
]);

export function isProtectedPipelineStatusName(name) {
    const n = normAclStatusToken(name);
    if (!n) return false;
    const collapsed = n.replace(/\s/g, "");
    if (PROTECTED_PIPELINE_STATUS_TOKENS.has(n)) return true;
    if (PROTECTED_PIPELINE_STATUS_TOKENS.has(collapsed)) return true;
    return false;
}

/** Status ustunini tahrirlash/o‘chirish mumkinmi (API `id` bo‘lishi shart). */
export function canEditOrDeleteTaskStatus(taskType, column) {
    if (!column?.id) return false;
    const tt = String(taskType ?? "")
        .trim()
        .toLowerCase();
    if (tt === "company") return true;
    if (isProtectedPipelineStatusName(column.name)) return false;
    return true;
}

export function priorityRank(row) {
    const p = String(row?.priority ?? row?.task?.priority ?? "normal").trim().toLowerCase();
    if (p === "urgent") return 3;
    if (p === "high") return 2;
    if (p === "normal") return 1;
    if (p === "low") return 0;
    return 1;
}

export const ASSIGNEE_TYPE_CONFIG = {
    supplier: {
        label: "Ta'minotchi",
        icon: Package,
        color: "teal",
    },
    staff: {
        label: "Xodim",
        icon: Users,
        color: "blue",
    },
    operator: {
        label: "Operator",
        icon: User,
        color: "purple",
    },
    broker: {
        label: "Broker",
        icon: Building2,
        color: "orange",
    },
};

export function assigneeTypeDisplay(raw) {
    if (raw == null || String(raw).trim() === "") {
        return { label: "—", icon: null, color: "gray" };
    }
    const k = String(raw).trim().toLowerCase();
    const c = ASSIGNEE_TYPE_CONFIG[k];
    if (c) return c;
    return {
        label: String(raw),
        icon: null,
        color: "gray",
    };
}

export function assigneeFullNameDisplay(row) {
    const raw = row?.assignee?.full_name;
    if (raw == null || String(raw).trim() === "") return "Bo'sh";
    return String(raw).trim();
}

export function isTaskSourceAuto(row) {
    return String(row?.source ?? "").trim().toLowerCase() === "auto";
}

export const DETAIL_FIELD_LABELS = {
    product_name: "Mahsulot",
    category_name: "Kategoriya",
    stock_id: "Zaxira (stock) ID",
    factory_id: "Zavod ID",
    warehouse_id: "Ombor ID",
    address: "Manzil",
    phone: "Telefon",
    director_name: "Direktor",
    inn: "INN",
    rating: "Reyting",
    rating_grade: "Reyting bahosi",
};

export const TASK_DETAIL_LAYOUT_KEYS = new Set([
    "product_name",
    "note",
    "izoh",
    "location_id",
    "location_name",
    "location_type",
    "address",
    "phone",
    "director_name",
    "inn",
    "rating",
    "rating_grade",
]);

export function locationTypeLabelUz(raw) {
    const t = String(raw ?? "").trim().toLowerCase();
    if (t === "factory") return "Zavod";
    if (t === "kompaniya" || t === "company") return "Qurilish kompaniyasi";
    if (t === "customer") return "Mijoz";
    if (!raw) return "";
    return String(raw);
}

export function locationTypeColorScheme(raw) {
    const t = String(raw ?? "").trim().toLowerCase();
    if (t === "factory") return "blue";
    if (t === "kompaniya" || t === "company") return "purple";
    if (t === "customer") return "teal";
    return "gray";
}

export function adminPathForTaskLocation(locationType, locationId) {
    const id = String(locationId ?? "").trim();
    if (!id) return null;
    const enc = encodeURIComponent(id);
    const t = String(locationType ?? "").trim().toLowerCase();
    if (t === "factory") return `/factories/${enc}`;
    if (t === "kompaniya" || t === "company") return `/company-detail/${enc}`;
    if (t === "customer") return `/customers/${enc}`;
    return null;
}
