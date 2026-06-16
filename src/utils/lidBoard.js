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

function getColumnTotal(column) {
    const colPag = getColumnPagination(column);
    const raw =
        colPag?.total ??
        column?.total ??
        column?.totalCount ??
        column?.pagination?.totalCount;
    return raw != null ? Number(raw) : null;
}

export function extractLidsPagination(res, requestLimit = 20) {
    const root = res?.data ?? res;
    const inner =
        root?.data != null && typeof root.data === "object" && !Array.isArray(root.data)
            ? root.data
            : root;

    const limit = Number(
        root?.limit ??
            inner?.limit ??
            root?.pageSize ??
            inner?.pageSize ??
            requestLimit
    );
    const page = Number(
        root?.page ??
            inner?.page ??
            root?.currentPage ??
            inner?.current_page ??
            1
    );

    const rootTotalPages =
        root?.totalPages ??
        root?.total_pages ??
        root?.total_page ??
        inner?.totalPages ??
        inner?.total_pages ??
        inner?.total_page;

    if (rootTotalPages != null) {
        const rootTotal =
            root?.total ??
            root?.totalCount ??
            inner?.total ??
            inner?.totalCount ??
            0;
        return {
            items: [],
            page,
            limit,
            total: Number(rootTotal) || 0,
            totalPages: Math.max(1, Number(rootTotalPages)),
        };
    }

    const columns = inner?.columns ??
        (Array.isArray(root?.data) && root.data[0]?.status ? root.data : null) ??
        (Array.isArray(inner) && inner[0]?.status ? inner : null);

    if (Array.isArray(columns) && columns.length > 0) {
        let maxTotalPages = 1;
        let total = 0;

        for (const col of columns) {
            const colPag = getColumnPagination(col);
            const colLimit = Number(colPag?.limit ?? limit) || limit;
            const colTotal = getColumnTotal(col) ?? 0;
            total += colTotal;

            if (colPag?.totalPages != null) {
                maxTotalPages = Math.max(maxTotalPages, Number(colPag.totalPages));
            } else if (colTotal > 0) {
                maxTotalPages = Math.max(maxTotalPages, Math.ceil(colTotal / colLimit));
            }
        }

        if (total === 0) {
            const maxItems = Math.max(
                ...inner.columns.map((col) => (col?.items ?? col?.data ?? []).length),
                0
            );
            if (maxItems >= limit) {
                maxTotalPages = Math.max(maxTotalPages, page + 1);
            }
        }

        return { items: [], page, limit, total, totalPages: maxTotalPages };
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

export function parseLidsBoardResponse(res, statusList, search = "", requestLimit = 20) {
    const root = res?.data ?? res;
    const inner =
        root?.data != null && typeof root.data === "object" && !Array.isArray(root.data)
            ? root.data
            : root;
    const columns = inner?.columns ?? root?.columns ??
        // Agar data to'g'ridan array bo'lsa va status+items tuzilmasi bo'lsa — columns sifatida qabul qilamiz
        (Array.isArray(root?.data) && root.data[0]?.status ? root.data : null) ??
        (Array.isArray(inner) && inner[0]?.status ? inner : null);
    const pagination = extractLidsPagination(res, requestLimit);

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
            const columnTotal = getColumnTotal(col);
            const resolvedTotal =
                columnTotal != null
                    ? columnTotal
                    : filtered.length >= requestLimit
                      ? filtered.length + 1
                      : filtered.length;

            if (statusId) {
                grouped[statusId] = filtered;
                counts[statusId] = Math.max(0, Number(resolvedTotal) || 0);
            }
        }

        const allLids = Object.values(grouped).flat();
        return { grouped, counts, allLids, pagination };
    }

    let allLids = parseLidsListResponse(res);
    allLids = filterLidsBySearch(allLids, search);
    const grouped = groupLidsByStatus(allLids, statusList);
    const counts = {};

    // API total (filter qilingan umumiy son) ni statuslarga nisbatan taqsimlash
    // Agar bitta status bo'lsa — to'liq totalga ishonish mumkin
    // Bir nechta status bo'lsa — har bir statusda yuklangan items sonini ishlatamiz,
    // lekin pagination.total mavjud va yagona status bo'lsa uni ishlatamiz
    const apiTotal = pagination?.total ?? 0;
    const activeStatuses = statusList.filter(s => (grouped[s.id]?.length ?? 0) > 0);

    statusList.forEach((s) => {
        const loadedCount = grouped[s.id]?.length ?? 0;
        if (activeStatuses.length === 1 && activeStatuses[0]?.id === s.id && apiTotal > 0) {
            // Faqat bitta statusda natijalar bor — API totaliga ishon
            counts[s.id] = apiTotal;
        } else {
            counts[s.id] = loadedCount;
        }
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