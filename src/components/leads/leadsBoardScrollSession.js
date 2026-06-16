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

/**
 * Session saqlangan filter qiymatlarini qaytaradi.
 * filterSig mos kelmasa yoki yo'q bo'lsa — default qaytaradi.
 */
export function getInitialLeadsBoardFilters(roleScope = "default") {
    const defaults = () => ({ search: "", filterRole: "", filterAssignedId: "" });
    try {
        const raw = readLeadsBoardScrollSession(leadsBoardScrollSessionKey(roleScope));
        if (!raw || typeof raw !== "object") return defaults();
        const search = String(raw.persistedSearch ?? "").trim();
        const filterRole = String(raw.persistedRole ?? "").trim();
        const filterAssignedId = String(raw.persistedAssignedId ?? "").trim();
        // filterSig bilan tekshiramiz
        const expectedSig = buildLeadsBoardFilterSig({ search, assignedId: filterAssignedId, role: filterRole });
        if (String(raw.filterSig ?? "").trim() !== expectedSig) return defaults();
        return { search, filterRole, filterAssignedId };
    } catch {
        return defaults();
    }
}

/**
 * Scroll sessionni o'qish. 
 * scrollTop, scrollHeight, clientHeight dan 
 * "scrollPosition": "top" yoki "bottom" maydonini ham hosil qilamiz (agar mumkin bo'lsa).
 */
export function readLeadsBoardScrollSession(key) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o || typeof o !== "object") return null;

        // scrollTop, scrollHeight, clientHeight orqali scroll qaysi qismda saqlanganini aniqlash
        let scrollPosition = "auto";
        const scrollTop = Number(o.windowScrollY ?? o.scrollTop ?? 0);
        const scrollHeight = Number(o.scrollHeight ?? 0);
        const clientHeight = Number(o.clientHeight ?? 0);

        if (scrollTop && scrollHeight && clientHeight) {
            // container ni yarmi
            // scrollTop < yarim => "top", >= yarim => "bottom"
            if (scrollTop < (scrollHeight - clientHeight) / 2) {
                scrollPosition = "top";
            } else {
                scrollPosition = "bottom";
            }
        }

        // scrollPosition ni natijaga qo'shib beramiz
        return {
            ...o,
            scrollPosition,
        };
    } catch {
        return null;
    }
}

/**
 * Scroll sessionni yozish.
 * scrollTop, scrollHeight, clientHeight lar bilan birga yoziladi, 
 * scrollPosition maydoni "top" yoki "bottom" bo'lishi uchun kutilayotgan joyga scroll tiklash osonroq bo'ladi.
 */
export function writeLeadsBoardScrollSession(key, data) {
    try {
        let extra = {};
        // scrollTop, scrollHeight, clientHeight bo'lsa, scrollPosition ni hisoblab saqlash
        const scrollTop = Number(data?.windowScrollY ?? data?.scrollTop ?? 0);
        const scrollHeight = Number(data?.scrollHeight ?? 0);
        const clientHeight = Number(data?.clientHeight ?? 0);

        if (scrollTop && scrollHeight && clientHeight) {
            if (scrollTop < (scrollHeight - clientHeight) / 2) {
                extra.scrollPosition = "top";
            } else {
                extra.scrollPosition = "bottom";
            }
        }
        sessionStorage.setItem(
            key,
            JSON.stringify({ ...data, ...extra, ts: Date.now() })
        );
    } catch {
        /* quota */
    }
}
