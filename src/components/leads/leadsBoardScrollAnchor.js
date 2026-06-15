/** Kanban lid kartasi — viewport bo‘yicha eng ko‘rinadigan lidni aniqlash va tiklash */

export const LEAD_ANCHOR_ATTR = "data-lead-id";

export function findLeadAnchorEl(leadId) {
    const id = String(leadId ?? "").trim();
    if (!id || typeof document === "undefined") return null;
    const nodes = document.querySelectorAll(`[${LEAD_ANCHOR_ATTR}]`);
    for (const el of nodes) {
        const v = el.getAttribute(LEAD_ANCHOR_ATTR);
        if (v != null && String(v).trim() === id) return el;
    }
    return null;
}

function getScrollRootRect(scrollRootRef) {
    if (typeof window === "undefined") {
        return { top: 0, bottom: 0, height: 0 };
    }
    const root = scrollRootRef?.current;
    if (root) {
        const r = root.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: r.height };
    }
    const vh = window.innerHeight || 0;
    return { top: 0, bottom: vh, height: vh };
}

/**
 * Scroll container ichida eng ko‘p ko‘rinadigan lid id.
 */
export function getViewportLeadAnchorId(scrollRootRef) {
    if (typeof document === "undefined") return "";
    try {
        const { top, bottom } = getScrollRootRect(scrollRootRef);
        if (bottom <= top) return "";
        const vCenter = (top + bottom) / 2;
        const nodes = document.querySelectorAll(`[${LEAD_ANCHOR_ATTR}]`);
        let best = "";
        let bestScore = -Infinity;

        for (const el of nodes) {
            const id = String(el.getAttribute(LEAD_ANCHOR_ATTR) ?? "").trim();
            if (!id) continue;
            const r = el.getBoundingClientRect();
            const visTop = Math.max(top, r.top);
            const visBottom = Math.min(bottom, r.bottom);
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
 * DOMda paydo bo‘lguncha kutib, lid kartasini markazga yaqinlashtiradi.
 * @returns {() => void} cancel
 */
export function scheduleLeadAnchorScroll(leadId, { onComplete } = {}) {
    const id = String(leadId ?? "").trim();
    if (!id || typeof window === "undefined") {
        onComplete?.();
        return () => {};
    }

    let cancelled = false;
    let frames = 0;
    const MAX = 120;

    const nudge = () => {
        const el = findLeadAnchorEl(id);
        if (el) {
            el.scrollIntoView({
                block: "center",
                inline: "nearest",
                behavior: "instant",
            });
        }
    };

    const finish = () => {
        if (!cancelled) onComplete?.();
    };

    const tick = () => {
        if (cancelled) return;
        frames += 1;
        const el = findLeadAnchorEl(id);
        if (el) {
            nudge();
            requestAnimationFrame(() => {
                if (cancelled) return;
                nudge();
                requestAnimationFrame(() => {
                    if (!cancelled) nudge();
                    finish();
                });
            });
            return;
        }
        if (frames < MAX) requestAnimationFrame(tick);
        else finish();
    };

    requestAnimationFrame(() => {
        requestAnimationFrame(tick);
    });

    return () => {
        cancelled = true;
    };
}

export function shouldRunLeadAnchorAfterScrollRestore(saved) {
    const anchor = String(saved?.anchorLidId ?? "").trim();
    return Boolean(anchor);
}

/** @returns {() => void} cancel */
export function scheduleLeadAnchorIfNeeded(saved, opts = {}) {
    if (!shouldRunLeadAnchorAfterScrollRestore(saved)) {
        opts.onComplete?.();
        return () => {};
    }
    return scheduleLeadAnchorScroll(String(saved.anchorLidId).trim(), opts);
}
