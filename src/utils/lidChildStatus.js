import { sortStatuses } from "./lidStatus";

export const DAY_TYPES = {
    TOQ: "toq",
    JUFT: "juft",
};

export const PRIMARY_STATUS_BY_ROLE = {
    admin: "KELDI",
    operator: "KELADI",
};

export function unwrapChildStatuses(payload) {
    if (Array.isArray(payload)) return payload;
    const root = payload?.data ?? payload;
    if (Array.isArray(root)) return root;
    if (Array.isArray(root?.records)) return root.records;
    return root?.items ?? root?.child_statuses ?? root?.data ?? [];
}

export function sortChildStatuses(list) {
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function parseChildStatusesResponse(res) {
    return sortChildStatuses(unwrapChildStatuses(res?.data));
}

export function groupChildStatusesByParent(children) {
    const map = {};
    for (const child of children) {
        const pid = String(child.status_id || "").trim();
        if (!pid) continue;
        if (!map[pid]) map[pid] = [];
        map[pid].push(child);
    }
    for (const pid of Object.keys(map)) {
        map[pid] = sortChildStatuses(map[pid]);
    }
    return map;
}

export function normalizeStatusName(name) {
    return String(name ?? "").trim().toUpperCase();
}

/** Rol filtri: admin → faqat KELDI, operator → faqat KELADI */
export function filterParentStatusesForRole(statuses, roleFilter) {
    const list = sortStatuses(statuses);
    if (!roleFilter) return list;

    const primary = PRIMARY_STATUS_BY_ROLE[roleFilter];
    if (!primary) return list;

    const matched = list.filter(
        (s) => normalizeStatusName(s.name) === primary
    );
    return matched.length ? matched : list;
}

/**
 * Builds board columns where each parent status is ONE column.
 * Child statuses are embedded inside the column as `children` array.
 *
 * Filter mode (statusFilter set): returns only that parent status column,
 * with only its children visible (leads shown under child groups).
 */
export function buildBoardColumns(
    parentStatuses,
    childStatuses,
    dayType,
    statusFilter = ""
) {
    const parents = statusFilter
        ? parentStatuses.filter((s) => s.id === statusFilter)
        : parentStatuses;

    const childrenByParent = groupChildStatusesByParent(childStatuses);
    const columns = [];

    for (const parent of parents) {
        const children = (childrenByParent[parent.id] || []).filter(
            (c) => c.type === dayType
        );

        columns.push({
            id: parent.id,
            name: parent.name,
            color: parent.color || "#378ADD",
            order: parent.order ?? 0,
            isChild: false,
            isFiltered: Boolean(statusFilter),
            parentStatusId: parent.id,
            type: dayType,
            // Embedded child statuses for this parent
            children: children.map((child) => ({
                id: child.id,
                name: child.name,
                color: child.color || parent.color || "#378ADD",
                order: child.order ?? 0,
                isChild: true,
                parentStatusId: parent.id,
                parentStatusName: parent.name,
                type: dayType,
                childData: child,
            })),
        });
    }

    return columns.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function buildChildStatusPayload(form) {
    return {
        status_id: form.status_id,
        name: form.name.trim(),
        color: form.color,
        order: Number(form.order),
        type: form.type,
    };
}