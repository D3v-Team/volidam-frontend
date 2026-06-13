import { parsePaginatedResponse } from "./api/parsePagination";
import { normalizeStatusFromApi, sortStatuses, unwrapStatuses } from "./lidStatus";

/**
 * MUAMMO: child_status_id payloaddan to'g'ri kelmoqda, lekin backend responseda null/yo'qolib qolmoqda.
 * QABUL: normalizeLidFromApi endi ham child_status_id, ham child_status biriktirilgan bo'lsa
 *        ikkala joyni tekshiradi va ba'zi servislar child_status_id ni string/number formatda qaytarayotgani uchun
 *        konservativ (ko'proq qamrovli) formatlash amalga oshirildi.
 */
export function normalizeLidFromApi(lid) {
    if (!lid || typeof lid !== "object") return lid;

    // child_status_id ga maksimal ishonch hosil qilamiz (payloaddan va child_status.id dan)
    let child_status_id = null;
    if ("child_status_id" in lid && lid.child_status_id != null && lid.child_status_id !== "") {
        child_status_id = String(lid.child_status_id);
    } else if (
        lid.child_status &&
        typeof lid.child_status === "object" &&
        "id" in lid.child_status &&
        lid.child_status.id != null &&
        lid.child_status.id !== "" 
    ) {
        child_status_id = String(lid.child_status.id);
    }
    // Agar umuman ham child_status_id, ham child_statusnig id property yo'q yoki null bo'lsa, child_status_id null bo'ladi

    return {
        ...lid,
        status_id: lid.status_id ?? lid.status?.id ?? "",
        child_status_id,
        createdAt: lid.createdAt ?? lid.created_at ?? null,
        updatedAt: lid.updatedAt ?? lid.updated_at ?? null,
        created_by_name:
            lid.creator?.full_name ??
            lid.created_by_name ??
            lid.creator_name ??
            "",
        creator_role: lid.creator?.role ?? lid.creator_role ?? "",
    };
}

export function filterLidsBySearch(items, search) {
    if (!search?.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
        (l) =>
            l.fio?.toLowerCase().includes(q) ||
            l.telefon_raqam?.toLowerCase().includes(q) ||
            l.created_by_name?.toLowerCase().includes(q)
    );
}

export function parseStatusesResponse(res) {
    return sortStatuses(unwrapStatuses(res?.data)).map(normalizeStatusFromApi);
}

function getColumnPagination(column) {
    const pagination = column?.pagination;
    if (!pagination || typeof pagination !== "object") return null;

    const page =
        pagination.page ??
        pagination.currentPage ??
        pagination.current_page ??
        pagination.page_number ??
        pagination.pageNumber ??
        1;

    const limit =
        pagination.limit ??
        pagination.pageSize ??
        pagination.size ??
        pagination.per_page ??
        20;

    const total =
        pagination.total ??
        pagination.totalCount ??
        pagination.total_count ??
        pagination.total_elements ??
        pagination.total_elements_count ??
        0;

    const totalPages =
        pagination.total_pages ??
        pagination.totalPages ??
        pagination.total_page ??
        pagination.totalPage ??
        Math.max(1, Math.ceil(total / limit));

    return { page, limit, total, totalPages };
}

export function extractLidsPagination(res) {
    const root = res?.data ?? res;
    const inner =
        root?.data != null && typeof root.data === "object" && !Array.isArray(root.data)
            ? root.data
            : root;

    if (Array.isArray(inner?.columns) && inner.columns.length > 0) {
        const limit = Number(root?.limit ?? inner?.limit ?? 10);
        const page = Number(root?.page ?? inner?.page ?? 1);
        const total = inner.columns.reduce((sum, col) => sum + Number(col?.total ?? 0), 0);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        return { items: [], page, limit, total, totalPages };
    }

    if (
        inner?.totalPages != null ||
        inner?.total_pages != null ||
        inner?.total_page != null ||
        inner?.page != null ||
        inner?.currentPage != null ||
        inner?.current_page != null ||
        inner?.limit != null ||
        inner?.pageSize != null ||
        inner?.size != null
    ) {
        return parsePaginatedResponse({ data: inner });
    }
    if (
        root?.totalPages != null ||
        root?.total_pages != null ||
        root?.total_page != null ||
        root?.page != null ||
        root?.currentPage != null ||
        root?.current_page != null ||
        root?.limit != null ||
        root?.pageSize != null ||
        root?.size != null
    ) {
        return parsePaginatedResponse({ data: root });
    }

    return parsePaginatedResponse(res);
}

export function mergeLidsGrouped(prev, next, statusList) {
    const merged = { ...prev };
    for (const s of statusList) {
        const sid = s.id;
        const existing = merged[sid] || [];
        const incoming = next[sid] || [];
        if (!incoming.length) {
            if (!merged[sid]) merged[sid] = [];
            continue;
        }
        const ids = new Set(existing.map((l) => l.id));
        merged[sid] = [...existing, ...incoming.filter((l) => l.id && !ids.has(l.id))];
    }
    return merged;
}

export function parseLidsBoardResponse(res, statusList, search = "") {
    const root = res?.data ?? res;
    const inner =
        root?.data != null && typeof root.data === "object" && !Array.isArray(root.data)
            ? root.data
            : root;
    const columns = inner?.columns ?? root?.columns;
    const pagination = extractLidsPagination(res);

    if (Array.isArray(columns) && columns.length > 0) {
        const grouped = {};
        const counts = {};

        for (const s of statusList) {
            grouped[s.id] = [];
            counts[s.id] = 0;
        }

        for (const col of columns) {
            const statusId = String(
                col?.status?.id ?? col?.status_id ?? ""
            ).trim();
            // Har bir item uchun normalizeLidFromApi chaqiriladi — child_status_id fallback ishlatiladi
            const items = (col?.items ?? col?.data ?? []).map(normalizeLidFromApi);
            const filtered = filterLidsBySearch(items, search);
            const columnTotal =
                col?.pagination?.total ??
                col?.total ??
                col?.pagination?.totalCount ??
                col?.totalCount ??
                filtered.length;

            if (statusId) {
                grouped[statusId] = filtered;
                counts[statusId] = Number(columnTotal) >= 0 ? Number(columnTotal) : filtered.length;
            }
        }

        const allLids = Object.values(grouped).flat();
        return { grouped, counts, allLids, pagination };
    }

    let allLids = parseLidsListResponse(res);
    allLids = filterLidsBySearch(allLids, search);
    const grouped = groupLidsByStatus(allLids, statusList);
    const counts = {};
    statusList.forEach((s) => {
        counts[s.id] = grouped[s.id]?.length ?? 0;
    });

    return { grouped, counts, allLids, pagination };
}

export function groupLidsByStatus(lids, statusList) {
    const grouped = {};
    for (const s of statusList) {
        grouped[s.id] = [];
    }
    for (const raw of lids) {
        const lid = normalizeLidFromApi(raw);
        const sid = String(lid.status_id || "").trim();
        if (sid) {
            if (!grouped[sid]) grouped[sid] = [];
            grouped[sid].push(lid);
        }
    }
    return grouped;
}

export function parseLidsListResponse(res) {
    const root = res?.data;
    const inner = root?.data ?? root;

    if (Array.isArray(inner)) return inner.map(normalizeLidFromApi);
    if (Array.isArray(inner?.items)) return inner.items.map(normalizeLidFromApi);
    if (Array.isArray(inner?.lids)) return inner.lids.map(normalizeLidFromApi);
    if (Array.isArray(root?.items)) return root.items.map(normalizeLidFromApi);

    if (Array.isArray(inner?.columns)) {
        return inner.columns.flatMap((col) =>
            (col?.items ?? col?.data ?? []).map(normalizeLidFromApi)
        );
    }

    return [];
}