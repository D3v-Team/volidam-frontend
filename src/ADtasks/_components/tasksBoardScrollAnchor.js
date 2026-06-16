/** Kanban kartasi — viewport bo‘yicha eng ko‘rinadigan vazifani aniqlash va tiklash */

export const BROKER_TASK_ANCHOR_ATTR = "data-broker-task-id";

export function findBrokerTaskAnchorEl(taskId) {
    const tid = String(taskId ?? "").trim();
    if (!tid || typeof document === "undefined") return null;
    const nodes = document.querySelectorAll(`[${BROKER_TASK_ANCHOR_ATTR}]`);
    for (const el of nodes) {
        const v = el.getAttribute(BROKER_TASK_ANCHOR_ATTR);
        if (v != null && String(v).trim() === tid) return el;
    }
    return null;
}

/**
 * Hozirgi viewportda eng ko‘p ko‘rinadigan (markazga yaqin) vazifa id.
 */
export function getViewportBrokerTaskAnchorId() {
    if (typeof document === "undefined" || typeof window === "undefined") return "";
    try {
        const nodes = document.querySelectorAll(`[${BROKER_TASK_ANCHOR_ATTR}]`);
        const vh = window.innerHeight || 0;
        if (vh <= 0) return "";
        const vCenter = vh / 2;
        let best = "";
        let bestScore = -Infinity;
        for (const el of nodes) {
            const id = String(el.getAttribute(BROKER_TASK_ANCHOR_ATTR) ?? "").trim();
            if (!id) continue;
            const r = el.getBoundingClientRect();
            const visTop = Math.max(0, r.top);
            const visBottom = Math.min(vh, r.bottom);
            const visible = visBottom - visTop;
            if (visible < 12) continue;
            const cy = (r.top + r.bottom) / 2;
            const score = visible * 1000 - Math.abs(cy - vCenter);
            if (score > bestScore) {
                bestScore = score;
                best = id;
            }
        }
        return best;
    } catch {
        return "";
    }
}

/**
 * DOMda paydo bo‘lguncha (yoki chegara) kutib, vazifa kartasini markazga yaqinlashtiradi.
 * @returns {() => void} cancel
 */
export function scheduleBrokerTaskAnchorScroll(taskId) {
    const tid = String(taskId ?? "").trim();
    if (!tid || typeof window === "undefined") return () => {};

    let cancelled = false;
    let frames = 0;
    const MAX = 100;

    const nudge = () => {
        const el = findBrokerTaskAnchorEl(tid);
        if (el) {
            el.scrollIntoView({
                block: "center",
                inline: "nearest",
                behavior: "instant",
            });
        }
    };

    const tick = () => {
        if (cancelled) return;
        frames += 1;
        const el = findBrokerTaskAnchorEl(tid);
        if (el) {
            nudge();
            requestAnimationFrame(() => {
                if (cancelled) return;
                nudge();
                requestAnimationFrame(() => {
                    if (!cancelled) nudge();
                });
            });
            return;
        }
        if (frames < MAX) requestAnimationFrame(tick);
    };

    requestAnimationFrame(() => {
        requestAnimationFrame(tick);
    });

    return () => {
        cancelled = true;
    };
}

/** Tiklangan scrollY / scrollFraction bo‘lsa `scrollIntoView` uni buzmasin. */
export function shouldRunBrokerTaskAnchorAfterScrollRestore(saved) {
    const anchor = String(saved?.anchorTaskId ?? "").trim();
    if (!anchor) return false;
    if (saved?.nearBottom) return false;
    const sf = Number(saved.scrollFraction);
    const hasSf = Number.isFinite(sf) && sf >= 0 && sf <= 1;
    const sy = Number(saved.windowScrollY) || 0;
    if (hasSf) return sf < 0.02;
    return sy < 16;
}

/** @returns {() => void} cancel */
export function scheduleBrokerTaskAnchorIfNeeded(saved) {
    if (!shouldRunBrokerTaskAnchorAfterScrollRestore(saved)) return () => {};
    return scheduleBrokerTaskAnchorScroll(String(saved.anchorTaskId).trim());
}
