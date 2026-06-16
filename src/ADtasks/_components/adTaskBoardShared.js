/** ADtasks / ADcompanyTasks Kanban uchun umumiy yordamchilar */

/** Barcha rollar — bildirishnoma / boshqa turlar filterida */
export const ASSIGNEE_FILTER_ROLES = [
    { value: "admin", label: "Admin" },
    { value: "supplier", label: "Supplier" },
    { value: "operator", label: "Operator" },
    { value: "broker", label: "Broker" },
    { value: "lot_creator", label: "Lot creator" },
    { value: "developer", label: "Dasturchi" },
];

/**
 * Vazifa turi bo‘yicha filterda ko‘rinadigan bajaruvchi rollari.
 * `null` — barcha rollar (ASSIGNEE_FILTER_ROLES).
 */
export const ASSIGNEE_FILTER_ROLES_BY_TASK_TYPE = {
    developer: ["developer"],
    price_update: ["supplier"],
    reorder: ["supplier"],
    company: ["operator"],
    notification: null,
    other: null,
};

export function getAssigneeFilterRolesForTaskType(taskType) {
    const key = String(taskType ?? "").trim().toLowerCase();
    const allowed = ASSIGNEE_FILTER_ROLES_BY_TASK_TYPE[key];
    if (allowed == null) {
        return [...ASSIGNEE_FILTER_ROLES];
    }
    return ASSIGNEE_FILTER_ROLES.filter((r) => allowed.includes(r.value));
}

/** Bitta rol bo‘lsa (masalan, company → operator) — type select ko‘rsatilmaydi. */
export function getFixedAssigneeFilterRole(taskType) {
    const roles = getAssigneeFilterRolesForTaskType(taskType);
    return roles.length === 1 ? roles[0] : null;
}

export const COMPANY_REGIONS = [
    { id: 2, name: "Andijon viloyati" },
    { id: 3, name: "Buxoro viloyati" },
    { id: 4, name: "Jizzax viloyati" },
    { id: 5, name: "Qashqadaryo viloyati" },
    { id: 6, name: "Navoiy viloyati" },
    { id: 7, name: "Namangan viloyati" },
    { id: 8, name: "Samarqand viloyati" },
    { id: 10, name: "Sirdaryo viloyati" },
    { id: 5723, name: "Surxondaryo viloyati" },
    { id: 11, name: "Toshkent shahri" },
    { id: 12, name: "Toshkent viloyati" },
    { id: 13, name: "Farg'ona viloyati" },
    { id: 14, name: "Xorazm viloyati" },
    { id: 15, name: "Qoraqalpog'iston Respublikasi" },
];

/** Kompaniya kanban ustuni — kartalar keng (director bitta qatorda). */
export const COMPANY_KANBAN_COL_WIDTH = { base: "420px", lg: "400px" };
export const COMPANY_KANBAN_COL_MIN_WIDTH = { base: "360px", lg: "380px" };

/** Kompaniya doskasi: infinite scroll sahifa hajmi. */
export const COMPANY_KANBAN_PAGE_SIZE = 5;

/** @returns {{ flex: import("@chakra-ui/react").ResponsiveValue<string>, minW, maxW, w }} */
export function companyKanbanColumnLayout(useBoardHorizontalScroll) {
    const colW = COMPANY_KANBAN_COL_WIDTH;
    if (useBoardHorizontalScroll) {
        return {
            flex: { base: `0 0 ${colW.base}`, lg: `0 0 ${colW.lg}` },
            minW: colW,
            maxW: colW,
            w: colW,
        };
    }
    return {
        flex: "1 1 0",
        minW: COMPANY_KANBAN_COL_MIN_WIDTH,
        maxW: undefined,
        w: undefined,
    };
}

const DEFAULT_KANBAN_COL_WIDTH = { base: "300px", lg: "260px" };
const DEFAULT_KANBAN_COL_WIDTH_SCROLL = {
    base: "300px",
    lg: "calc((100% - 48px) / 4)",
};

/** Bildirishnoma / boshqa va h.k. — standart ustun kengligi. */
export function defaultKanbanColumnLayout(useBoardHorizontalScroll) {
    if (useBoardHorizontalScroll) {
        return {
            flex: {
                base: `0 0 ${DEFAULT_KANBAN_COL_WIDTH.base}`,
                lg: `0 0 ${DEFAULT_KANBAN_COL_WIDTH_SCROLL.lg}`,
            },
            minW: DEFAULT_KANBAN_COL_WIDTH,
            maxW: DEFAULT_KANBAN_COL_WIDTH_SCROLL,
            w: DEFAULT_KANBAN_COL_WIDTH_SCROLL,
        };
    }
    return {
        flex: "1 1 0",
        minW: DEFAULT_KANBAN_COL_WIDTH.lg,
        maxW: undefined,
        w: undefined,
    };
}

/** API: `countByStatus` — status UUID → soni (filtrlangan ro‘yxat bo‘yicha). */
export function extractCountByStatus(res) {
    const root = res?.data;
    const inner = root?.data != null ? root.data : root;
    const raw =
        root?.countByStatus ??
        root?.count_by_status ??
        inner?.countByStatus ??
        inner?.count_by_status ??
        null;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
        const id = String(k ?? "").trim();
        if (!id) continue;
        const n = Number(v);
        out[id] = Number.isFinite(n) ? Math.max(0, n) : 0;
    }
    return out;
}

/** Ustun badge soni: API `countByStatus` bo‘yicha; yo‘q bo‘lsa `fallback`. */
export function getStatusColumnCount(countByStatus, statusId, fallback = 0) {
    const id = String(statusId ?? "").trim();
    if (!id) return fallback;
    const map =
        countByStatus && typeof countByStatus === "object" && !Array.isArray(countByStatus)
            ? countByStatus
            : null;
    if (!map || !Object.keys(map).length) return fallback;
    const n = Number(map[id]);
    return Number.isFinite(n) ? n : 0;
}

/** Drop: butun ustun tartibini darhol yangilash (bitta `order` emas). */
export function applyKanbanDragToRows({
    rows,
    grouped,
    source,
    destination,
    columnByKey,
    getTaskId = (r) => String(r?.id ?? "").trim(),
}) {
    const sourceKey = source?.droppableId;
    const destKey = destination?.droppableId;
    if (!sourceKey || !destKey) return rows;

    const sourceList = [...(grouped[sourceKey] ?? [])];
    const [moved] = sourceList.splice(source.index, 1);
    if (!moved) return rows;

    const destList =
        sourceKey === destKey ? sourceList : [...(grouped[destKey] ?? [])];
    destList.splice(destination.index, 0, moved);

    const patchCol = (col) => {
        const colSid = String(col?.id ?? "").trim();
        const colLabel = String(col?.dropValue ?? col?.name ?? "").trim();
        if (!colSid || !UUID_RE.test(colSid)) return {};
        return { status_id: colSid, status: colLabel };
    };

    const updatesById = new Map();
    const assignOrders = (list, col) => {
        const patch = patchCol(col);
        list.forEach((task, idx) => {
            const id = getTaskId(task);
            if (!id) return;
            updatesById.set(id, {
                ...(updatesById.get(id) ?? task),
                ...patch,
                order: idx + 1,
            });
        });
    };

    if (sourceKey === destKey) {
        assignOrders(destList, columnByKey.get(destKey));
    } else {
        assignOrders(sourceList, columnByKey.get(sourceKey));
        assignOrders(destList, columnByKey.get(destKey));
    }

    return (rows ?? []).map((r) => {
        const id = getTaskId(r);
        if (!id || !updatesById.has(id)) return r;
        return { ...r, ...updatesById.get(id) };
    });
}

export function kanbanDraggableBoxStyle(provided, snapshot) {
    const base = provided.draggableProps.style ?? {};
    return {
        ...base,
        width: snapshot.isDragging ? base.width : "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
    };
}

/** Virtual droppable: ro‘yxatdagi element ko‘rinmas, faqat clone harakatlanadi. */
export function kanbanVirtualDragItemStyle(provided, snapshot) {
    const base = kanbanDraggableBoxStyle(provided, snapshot);
    if (!snapshot.isDragging) return base;
    return {
        ...base,
        opacity: 0,
        pointerEvents: "none",
        transition: "none",
    };
}

/** Virtual droppable `renderClone` uchun. */
export function kanbanDragCloneStyle(provided) {
    const base = provided.draggableProps.style ?? {};
    return {
        ...base,
        boxSizing: "border-box",
        maxWidth: "100%",
    };
}

/**
 * GET /locations/location-by-status — `{ columns: [{ status_id, status_name, total, data }] }`.
 * @returns {null | { items: object[], pagination: object, countByStatus: Record<string, number> }}
 */
function flattenLocationsByStatusColumns(res) {
    const root = res?.data;
    const inner =
        root?.data != null && typeof root.data === "object" && !Array.isArray(root.data)
            ? root.data
            : root;

    const columns =
        (Array.isArray(inner?.columns) && inner.columns) ||
        (Array.isArray(root?.columns) && root.columns) ||
        (Array.isArray(inner) && inner) ||
        (Array.isArray(root) && root) ||
        null;

    if (!columns?.length) return null;

    const items = [];
    const countByStatus = {};
    for (const col of columns) {
        const statusId = String(
            col?.status_id ?? col?.statusId ?? col?.id ?? ""
        ).trim();
        const total = Number(col?.total);
        if (statusId) {
            countByStatus[statusId] = Number.isFinite(total)
                ? Math.max(0, total)
                : Array.isArray(col?.data)
                  ? col.data.length
                  : 0;
        }
        if (Array.isArray(col?.data)) {
            for (const loc of col.data) {
                if (loc && typeof loc === "object") items.push(loc);
            }
        }
    }

    const page = Math.max(1, Number(inner?.page ?? root?.page) || 1);
    const limit = Math.max(1, Number(inner?.limit ?? root?.limit) || COMPANY_KANBAN_PAGE_SIZE);
    const totalPagesRaw =
        inner?.total_pages ??
        inner?.totalPages ??
        root?.total_pages ??
        root?.totalPages ??
        null;
    let totalPages = Number(totalPagesRaw);
    if (!Number.isFinite(totalPages) || totalPages < 1) {
        const explicitHasMore =
            inner?.has_more ??
            inner?.hasMore ??
            root?.has_more ??
            root?.hasMore;
        if (explicitHasMore != null) {
            totalPages = explicitHasMore ? page + 1 : page;
        } else {
            totalPages = items.length >= limit ? page + 1 : page;
        }
    }
    const total =
        Number(inner?.total ?? root?.total) ||
        Object.values(countByStatus).reduce((a, b) => a + (Number(b) || 0), 0) ||
        items.length;

    return {
        items,
        pagination: {
            current_page: page,
            currentPage: page,
            total_pages: totalPages,
            totalPages,
            total,
            total_count: total,
            totalCount: total,
            limit,
        },
        countByStatus,
    };
}

export function normalizeLocationsByStatusResponse(res) {
    const fromColumns = flattenLocationsByStatusColumns(res);
    if (fromColumns) return fromColumns;
    return normalizeListResponse(res);
}

export function getLocationStatusId(loc) {
    return String(
        loc?.location_status_id ??
            loc?.status_id ??
            loc?.location_status?.id ??
            loc?.status?.id ??
            ""
    ).trim();
}

/** Location → TaskCard/kanban qatori. */
export function locationToKanbanRow(loc) {
    const id = String(loc?.id ?? "").trim();
    const statusId = getLocationStatusId(loc);
    const statusName =
        loc?.location_status?.name ??
        loc?.status?.name ??
        loc?.location_status_name ??
        loc?.status_name ??
        "";
    return {
        ...loc,
        id,
        type: "company",
        status_id: statusId,
        task_status_id: statusId,
        status: statusName,
        assignee_id: loc?.assignee_id,
        assignee_type: loc?.assignee_type ?? "operator",
        assignee: loc?.assignee,
        details: {
            location_id: id,
            location_name: String(loc?.name ?? "").trim(),
            location_type: "company",
            address: String(loc?.address ?? "").trim(),
            phone: String(loc?.phone ?? "").trim(),
            director_name: String(
                loc?.director_name ?? loc?.directorName ?? ""
            ).trim(),
            inn: String(loc?.inn ?? loc?.INN ?? "").trim(),
            rating:
                loc?.rating != null && loc?.rating !== ""
                    ? Number(loc.rating)
                    : null,
            rating_grade: String(loc?.rating_grade ?? loc?.ratingGrade ?? "").trim(),
            note: String(loc?.note ?? "").trim(),
        },
    };
}

/** Kompaniya kanban: faqat status o‘zgaradi (order yo‘q). */
export function applyLocationStatusDragToRows({ rows, movedId, targetStatusId, targetStatusName }) {
    const sid = String(targetStatusId ?? "").trim();
    const mid = String(movedId ?? "").trim();
    if (!mid || !sid) return rows ?? [];
    return (rows ?? []).map((r) => {
        const id = String(r?.id ?? "").trim();
        if (id !== mid) return r;
        return {
            ...r,
            status_id: sid,
            task_status_id: sid,
            location_status_id: sid,
            status: targetStatusName ?? r?.status,
        };
    });
}

/** Drag: status o‘zgarganda countlarni optimistik yangilash. */
export function shiftCountByStatus(prev, fromStatusId, toStatusId) {
    const from = String(fromStatusId ?? "").trim();
    const to = String(toStatusId ?? "").trim();
    if (!from || !to || from === to) return prev ?? {};
    const base = { ...(prev ?? {}) };
    base[from] = Math.max(0, (Number(base[from]) || 0) - 1);
    base[to] = (Number(base[to]) || 0) + 1;
    return base;
}

export function normalizeListResponse(res) {
    const root = res?.data;
    const inner = root?.data != null ? root.data : root;
    const items =
        (Array.isArray(inner?.records) && inner.records) ||
        (Array.isArray(inner?.items) && inner.items) ||
        (Array.isArray(inner) && inner) ||
        (Array.isArray(root?.records) && root.records) ||
        [];
    const pagination =
        inner?.pagination ||
        root?.pagination ||
        inner?.meta ||
        root?.meta ||
        {};
    return { items, pagination, countByStatus: extractCountByStatus(res) };
}

export function normalizeUsersResponse(res) {
    const root = res?.data;
    const inner = root?.data != null ? root.data : root;
    const items =
        (Array.isArray(inner?.records) && inner.records) ||
        (Array.isArray(inner?.items) && inner.items) ||
        (Array.isArray(inner) && inner) ||
        (Array.isArray(root?.records) && root.records) ||
        [];
    const pagination =
        inner?.pagination ||
        root?.pagination ||
        inner?.meta ||
        root?.meta ||
        {};
    return { items, pagination };
}

export function normStatusToken(v) {
    return String(v ?? "")
        .trim()
        .toLowerCase();
}

export function hexToChakraScheme(hex) {
    if (!hex || typeof hex !== "string") return "blue";
    const h = hex.trim().toLowerCase();
    if (h.includes("green") || /^#2[e8]/.test(h)) return "green";
    if (h.includes("red") || /^#e/.test(h)) return "red";
    if (h.includes("orange") || /^#f5/.test(h)) return "orange";
    if (h.includes("purple") || /^#7c/.test(h)) return "purple";
    if (h.includes("yellow") || /^#f/.test(h)) return "yellow";
    return "blue";
}

export function buildKanbanColumns(rawList) {
    const list = Array.isArray(rawList) ? [...rawList] : [];
    list.sort(
        (a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0)
    );
    return list.map((s, idx) => {
        const name = String(s?.name ?? "").trim();
        const id = s?.id != null ? String(s.id).trim() : "";
        const key = id || `col-${idx}-${normStatusToken(name) || "status"}`;
        const color = String(s?.color ?? "").trim();
        return {
            key,
            id: id || null,
            name,
            dropValue: name,
            color,
            colorScheme: hexToChakraScheme(color),
            order: s?.order ?? idx,
        };
    });
}

export function taskBelongsInColumn(task, col) {
    const colId = col?.id != null ? String(col.id).trim() : "";
    const taskSid =
        task?.status_id != null
            ? String(task.status_id).trim()
            : task?.task_status_id != null
              ? String(task.task_status_id).trim()
              : "";
    if (colId && taskSid && colId === taskSid) return true;

    const raw = task?.status ?? task?.task_status ?? "";
    const t = String(raw).trim();
    const tn = normStatusToken(t);
    if (!tn) return false;
    if (col?.name && normStatusToken(col.name) === tn) return true;
    if (col?.id != null && normStatusToken(col.id) === tn) return true;
    if (col?.name && t === String(col.name).trim()) return true;
    return false;
}

/** Kanban ustuni "Bekor qilindi" / cancelled */
export function isCancelledKanbanColumn(col) {
    const parts = [col?.name, col?.dropValue].map((x) => normStatusToken(x));
    for (const p of parts) {
        if (!p) continue;
        if (p === "cancelled" || p === "canceled") return true;
        if (p.includes("bekor")) return true;
        if (p.includes("otkaz")) return true;
    }
    return false;
}

export function pickDetailsNoteFromTask(task) {
    const row = task ?? {};
    const d1 = row.details && typeof row.details === "object" ? row.details : null;
    const d2 =
        row.task?.details && typeof row.task.details === "object"
            ? row.task.details
            : null;
    const d = d1 || d2 || {};
    const n = d.note != null ? String(d.note).trim() : "";
    const z = d.izoh != null ? String(d.izoh).trim() : "";
    if (n) return n;
    if (z) return z;
    return "";
}

export function buildNoteWithCancelReason(existingNote, cancelReason) {
    const e = String(existingNote ?? "").trim();
    const r = String(cancelReason ?? "").trim();
    const suffix = `Bekor qilingan sabab : ${r}`;
    if (!e) return suffix;
    return `${e.replace(/\s+$/, "")}\n\n${suffix}`;
}

/** `details` ga yangilangan izoh (note va izoh bir xil) */
export function mergeDetailsWithCancelledReason(task, cancelReason) {
    const row = task ?? {};
    const base =
        row.details && typeof row.details === "object" ? { ...row.details } : {};
    const newNote = buildNoteWithCancelReason(
        pickDetailsNoteFromTask(row),
        cancelReason
    );
    base.note = newNote;
    base.izoh = newNote;
    return base;
}

/** Bekor qilish modali sarlavhasi uchun qisqa matn */
export function pickTaskLabelForCancelModal(row) {
    const t = String(row?.type ?? "").trim().toLowerCase();
    const d = row.details && typeof row.details === "object" ? row.details : {};
    if (t === "company") {
        return String(
            d.location_name || d.address || d.note || d.izoh || row?.id || ""
        ).trim();
    }
    if (t === "developer" || t === "notification" || t === "notfic") {
        return String(pickDetailsNoteFromTask(row) || row?.id || "").trim();
    }
    return String(
        d.product_name || d.note || d.izoh || row?.id || ""
    ).trim();
}

export const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
