/** Kanban lid kartasi — viewport bo'yicha eng ko'rinadigan lidni aniqlash va tiklash */
/*
 * scroll ikiga bolinadi: 'top' va 'bottom'.
 * Agar saqlangan offset container yuqori yarmi bo'lsa, anchor yuqorida chiqadi.
 * Agar pastki yarmi bo'lsa, anchor pastda chiqadi.
 */

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

export function getViewportLeadAnchorId(scrollRootRef) {
    if (typeof document === "undefined") return "";
    try {
        const { top, bottom } = getScrollRootRect(scrollRootRef);
        if (bottom <= top) return "";
        const nodes = document.querySelectorAll(`[${LEAD_ANCHOR_ATTR}]`);
        let best = "";
        let bestTop = Infinity;

        for (const el of nodes) {
            const id = String(el.getAttribute(LEAD_ANCHOR_ATTR) ?? "").trim();
            if (!id) continue;
            const r = el.getBoundingClientRect();
            const visTop    = Math.max(top, r.top);
            const visBottom = Math.min(bottom, r.bottom);
            const visible   = visBottom - visTop;
            if (visible < 12) continue;
            // viewport ichida eng yuqorida turgan lid (r.top eng kichik)
            if (r.top < bestTop) {
                bestTop = r.top;
                best = id;
            }
        }
        return best;
    } catch {
        return "";
    }
}

/**
 * Anchor elementni scroll container ichida kerakli joyga chiqadi:
 * top yoki bottom, saqlangan scroll pozitsiyasiga qarab.
 *
 * @param {string} leadId
 * @param {{ scrollRootRef?: React.RefObject, onComplete?: () => void, scrollPosition?: "top"|"bottom" }} opts
 *        opts.scrollPosition="top" bo'lsa, anchor yuqoriga chiqadi, "bottom" bo'lsa pastga.
 * @returns {() => void} cancel
 */
export function scheduleLeadAnchorScroll(leadId, { scrollRootRef, onComplete, scrollPosition = "auto" } = {}) {
    const id = String(leadId ?? "").trim();
    if (!id || typeof window === "undefined") {
        onComplete?.();
        return () => {};
    }

    let cancelled = false;
    let frames = 0;
    const MAX = 120;

    // Decide anchor alignment if auto
    function decidePosition(root) {
        if (scrollPosition === "top" || scrollPosition === "bottom") return scrollPosition;
        // auto: container scrollTop < height/2 -> "top", aks holda "bottom"
        if (!root) return "top";
        return root.scrollTop < (root.scrollHeight - root.clientHeight) / 2 ? "top" : "bottom";
    }

    const scrollToEl = (el) => {
        const scrollRoot = scrollRootRef?.current;
        const align = decidePosition(scrollRoot);
        if (scrollRoot) {
            const rootRect = scrollRoot.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const currentScrollTop = scrollRoot.scrollTop;
            let targetScrollTop;
            if (align === "top") {
                // Elementning yuqori qismi container yuqorisiga chiqadi
                targetScrollTop = currentScrollTop + (elRect.top - rootRect.top);
            } else if (align === "bottom") {
                // Element pastki qismi container pastiga chiqadi
                targetScrollTop = currentScrollTop + (elRect.bottom - rootRect.bottom);
            } else {
                // fallback: center
                targetScrollTop =
                    currentScrollTop +
                    (elRect.top - rootRect.top) -
                    rootRect.height / 2 +
                    elRect.height / 2;
            }
            scrollRoot.scrollTop = Math.max(0, targetScrollTop);
        } else {
            let block = "center";
            if (scrollPosition === "top") block = "start";
            else if (scrollPosition === "bottom") block = "end";
            el.scrollIntoView({
                block,
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
            scrollToEl(el);
            requestAnimationFrame(() => {
                if (cancelled) return;
                const el2 = findLeadAnchorEl(id);
                if (el2) scrollToEl(el2);
                requestAnimationFrame(() => {
                    if (!cancelled) {
                        const el3 = findLeadAnchorEl(id);
                        if (el3) scrollToEl(el3);
                    }
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

// Saqlangan scroll qayerda bo'lganini aniqlash
function inferScrollAnchorPositionFromSaved(saved) {
    // Agar saved.windowScrollY yoki saved.scrollTop mavjud bo'lsa
    // (container scrollTop) ni solishtiramiz.
    const scrollTop = Number(saved?.windowScrollY ?? saved?.scrollTop ?? 0);
    const scrollHeight = Number(saved?.scrollHeight ?? 0);
    const clientHeight = Number(saved?.clientHeight ?? 0);
    // Agar malumot yetarli bo'lmasa "auto" (oldingi default)
    if (!scrollTop || !scrollHeight || !clientHeight) return "auto";
    // scrollTop < yarim => top, >= yarim => bottom
    return scrollTop < (scrollHeight - clientHeight) / 2 ? "top" : "bottom";
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
    // opts.scrollPosition berilgan bo'lsa uni ishlatamiz, aks holda saved dan aniqlaymiz
    const scrollPosition = opts.scrollPosition ?? inferScrollAnchorPositionFromSaved(saved);
    return scheduleLeadAnchorScroll(String(saved.anchorLidId).trim(), { ...opts, scrollPosition });
}