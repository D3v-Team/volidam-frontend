import { parsePaginatedResponse } from "./api/parsePagination";
import { normalizeStatusFromApi, sortStatuses, unwrapStatuses } from "./lidStatus";

export function normalizeLidFromApi(lid) {
    if (!lid || typeof lid !== "object") return lid;
    return {
        ...lid,
        status_id: lid.status_id ?? lid.status?.id ?? "",
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

export function extractLidsPagination(res) {
    const root = res?.data ?? res;
    const inner =
        root?.data != null && typeof root.data === "object" && !Array.isArray(root.data)
            ? root.data
            : root;
    if (inner?.totalPages != null || inner?.page != null) {
        return parsePaginatedResponse({ data: inner });
    }
    if (root?.totalPages != null || root?.page != null) {
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

/** GET /lids — `{ columns: [{ status, total, items }] }` yoki oddiy ro'yxat */
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
            const items = (col?.items ?? []).map(normalizeLidFromApi);
            const filtered = filterLidsBySearch(items, search);

            if (statusId) {
                grouped[statusId] = filtered;
                counts[statusId] =
                    Number(col?.total) >= 0 ? Number(col.total) : filtered.length;
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
            (col?.items ?? []).map(normalizeLidFromApi)
        );
    }

    return [];
}
