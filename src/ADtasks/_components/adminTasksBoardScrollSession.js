/**
 * `/tasks` va `/tasks/company` — scroll, infinite-scroll sahifasi, anchor va filtrlar sessionStorage da.
 * Qo'shimcha maydonlar: `persistedType`, `persistedFilterCompanyRegion`, `persistedFilterAssigneeType`,
 * `persistedFilterAssigneeId` — UI tiklash; asosiy moslik `filterSig` orqali.
 */

const VERSION = "v2";

/** Restore loop — API `totalPages` ba'zan 1 bo‘lib qolsa ham sessiondagi sahifani yuklash */
export const KANBAN_SCROLL_RESTORE_MAX_PAGES = 200;

export function adminTasksBoardScrollSessionKey(mode) {
  return `broker:adminTasksKanban:${VERSION}:${mode === "company" ? "company" : "multi"}`;
}

export function buildAdminTasksBoardFilterSig({
  isCompanyType,
  type,
  filterCompanyRegion,
  filterAssigneeType,
  filterAssigneeId,
}) {
  return [
    isCompanyType ? "1" : "0",
    String(type ?? "").trim(),
    String(filterCompanyRegion ?? "").trim(),
    String(filterAssigneeType ?? "").trim(),
    String(filterAssigneeId ?? "").trim(),
  ].join("|");
}

export function readAdminTasksBoardScrollSession(key) {
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

export function writeAdminTasksBoardScrollSession(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ ...data, ts: Date.now() }));
  } catch {
    /* quota / private mode */
  }
}
