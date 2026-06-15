const VERSION = "v2";

/** Restore — API totalPages noto'g'ri bo'lsa ham sessiondagi sahifani yuklash */
export const LEADS_KANBAN_SCROLL_RESTORE_MAX_PAGES = 200;

export function leadsBoardScrollSessionKey(roleScope = "default") {
    return `volidam:leadsKanban:${VERSION}:${roleScope}`;
}

export function buildLeadsBoardFilterSig({
    statusFilter = "",
    search = "",
    assignedId = "",
    role = "",
} = {}) {
    return [
        String(statusFilter ?? "").trim(),
        String(search ?? "").trim(),
        String(assignedId ?? "").trim(),
        String(role ?? "").trim(),
    ].join("|");
}

export function readLeadsBoardScrollSession(key) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const o = JSON.parse(raw);
        return o && typeof o === "object" ? o : null;
    } catch {
        return null;
    }
}

export function writeLeadsBoardScrollSession(key, data) {
    try {
        sessionStorage.setItem(key, JSON.stringify({ ...data, ts: Date.now() }));
    } catch {
        /* quota */
    }
}
