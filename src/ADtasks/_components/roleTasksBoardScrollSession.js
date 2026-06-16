/** Operator / Supplier / Dev kanban — scroll + sahifa sessionStorage */

const VERSION = "v1";

/** Restore — API `totalPages` noto‘g‘ri bo‘lsa ham sessiondagi sahifani yuklash */
export const KANBAN_SCROLL_RESTORE_MAX_PAGES = 200;

export function roleTasksBoardSessionKey(role, mode) {
    const m = mode === "company" ? "company" : "multi";
    return `broker:roleTasksKanban:${VERSION}:${String(role)}:${m}`;
}

export function buildOperatorTasksFilterSig({ activeTaskType, addressRegion }) {
    return [
        String(activeTaskType ?? "").trim(),
        String(addressRegion ?? "").trim(),
    ].join("|");
}

const OPERATOR_MULTI_TASK_TYPES = ["notification", "other"];

/** Operator kanban — sessiondan tab / manzil filtrini tiklash. */
export function getInitialOperatorBoardFilterState(mode) {
    const isCompanyPage = mode === "company";
    const defaults = () => ({
        type: isCompanyPage ? "company" : "notification",
        addressRegion: "",
    });
    const key = roleTasksBoardSessionKey("operator", isCompanyPage ? "company" : "multi");
    const raw = readRoleTasksBoardScrollSession(key);
    if (!raw || typeof raw !== "object") return defaults();

    const savedSig = String(raw.filterSig ?? "").trim();
    if (savedSig) {
        const parts = savedSig.split("|");
        const taskType = (parts[0] ?? "").trim();
        const region = (parts[1] ?? "").trim();
        if (isCompanyPage) {
            if (taskType !== "company") return defaults();
            const sig = buildOperatorTasksFilterSig({
                activeTaskType: "company",
                addressRegion: region,
            });
            if (sig !== savedSig) return defaults();
            return { type: "company", addressRegion: region };
        }
        if (taskType === "company") return defaults();
        if (!OPERATOR_MULTI_TASK_TYPES.includes(taskType)) return defaults();
        const sig = buildOperatorTasksFilterSig({
            activeTaskType: taskType,
            addressRegion: "",
        });
        if (sig !== savedSig) return defaults();
        return { type: taskType, addressRegion: "" };
    }

    const persistedRegion = String(raw.persistedAddressRegion ?? "").trim();
    if (isCompanyPage) {
        return { type: "company", addressRegion: persistedRegion };
    }
    const persistedType = String(raw.persistedType ?? "").trim();
    const type = OPERATOR_MULTI_TASK_TYPES.includes(persistedType)
        ? persistedType
        : "notification";
    return { type, addressRegion: "" };
}

export function mergeRoleTasksBoardScrollSession(key, patch) {
    const prev = readRoleTasksBoardScrollSession(key) ?? {};
    writeRoleTasksBoardScrollSession(key, { ...prev, ...patch });
}

export function buildSupplierTasksFilterSig({ type }) {
    return String(type ?? "").trim();
}

export function buildDevTasksFilterSig({ type }) {
    return String(type ?? "").trim();
}

export function readRoleTasksBoardScrollSession(key) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o || typeof o !== "object") return null;
        return o;
    } catch {
        return null;
    }
}

export function writeRoleTasksBoardScrollSession(key, data) {
    try {
        sessionStorage.setItem(key, JSON.stringify({ ...data, ts: Date.now() }));
    } catch {
        /* quota / private mode */
    }
}
