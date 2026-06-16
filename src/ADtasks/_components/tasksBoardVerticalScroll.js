/**
 * Vertikal scroll tiklash.
 * — `/companies` kabi: ixtiyoriy `scrollRootRef` (masalan `h="100vh" overflowY="auto"`) ichidagi `scrollTop`.
 * — Ref yo‘q bo‘lsa: `document` / `window` (eski kanbanlar).
 * SPA: route almashtirishda `snapshotVerticalScrollToRef` bilan oxirgi holatni refda ushlang.
 */

function getScrollRootEl(scrollRootRef) {
    const el = scrollRootRef?.current;
    return el instanceof HTMLElement ? el : null;
}

export function getPageVerticalScrollSnapshot(scrollRootRef) {
    if (typeof window === "undefined") {
        return {
            windowScrollY: 0,
            docScrollHeight: 0,
            viewportHeight: 0,
            nearBottom: false,
            scrollFraction: 0,
        };
    }
    const root = getScrollRootEl(scrollRootRef);
    if (root) {
        const scrollTop = root.scrollTop ?? 0;
        const scrollHeight = Number(root.scrollHeight) || 0;
        const viewportHeight = Number(root.clientHeight) || 0;
        const threshold = 96;
        const nearBottom =
            scrollHeight > viewportHeight + 40 &&
            scrollTop + viewportHeight >= scrollHeight - threshold;
        const maxScroll0 = Math.max(0, scrollHeight - viewportHeight);
        const scrollFraction =
            maxScroll0 > 8 ? scrollTop / maxScroll0 : nearBottom ? 1 : 0;
        return {
            windowScrollY: scrollTop,
            docScrollHeight: scrollHeight,
            viewportHeight,
            nearBottom,
            scrollFraction,
        };
    }
    const se = document.scrollingElement || document.documentElement;
    const scrollTop = window.pageYOffset ?? se.scrollTop ?? 0;
    const scrollHeight = Number(se?.scrollHeight) || 0;
    const viewportHeight = window.innerHeight || 0;
    const threshold = 96;
    const nearBottom =
        scrollHeight > viewportHeight + 40 &&
        scrollTop + viewportHeight >= scrollHeight - threshold;
    const maxScroll0 = Math.max(0, scrollHeight - viewportHeight);
    const scrollFraction =
        maxScroll0 > 8 ? scrollTop / maxScroll0 : nearBottom ? 1 : 0;
    return {
        windowScrollY: scrollTop,
        docScrollHeight: scrollHeight,
        viewportHeight,
        nearBottom,
        scrollFraction,
    };
}

/** @param {import('react').MutableRefObject<unknown>} mirrorRef */
export function snapshotVerticalScrollToRef(mirrorRef, scrollRootRef) {
    if (typeof window === "undefined" || !mirrorRef) return null;
    const s = getPageVerticalScrollSnapshot(scrollRootRef);
    mirrorRef.current = s;
    return s;
}

/** @param {import('react').MutableRefObject<unknown>} mirrorRef */
export function verticalSnapshotForSessionWrite(mirrorRef, scrollRootRef) {
    if (mirrorRef && mirrorRef.current != null) return mirrorRef.current;
    return getPageVerticalScrollSnapshot(scrollRootRef);
}

/**
 * @param {{ windowScrollY?: number, nearBottom?: boolean, docScrollHeight?: number, scrollFraction?: number }} saved
 * @param {{ scrollRootRef?: import('react').RefObject<HTMLElement | null>; onApplied?: () => void; onComplete?: () => void }} [opts]
 * @returns {() => void} cancel
 */
export function applyRestoredPageVerticalScroll(saved, opts = {}) {
    const { scrollRootRef, onApplied, onComplete } = opts;
    if (typeof window === "undefined") return () => {};

    const targetY = Math.max(0, Number(saved.windowScrollY) || 0);
    const nearBottom = Boolean(saved.nearBottom);
    const savedDocH = Number(saved.docScrollHeight) || 0;
    const savedFrac = Number(saved.scrollFraction);
    const hasFraction =
        Number.isFinite(savedFrac) && savedFrac >= 0 && savedFrac <= 1;

    let cancelled = false;
    let attempts = 0;
    const MAX = 56;
    let stableBottom = 0;
    let prevMaxScroll = -1;
    let completed = false;

    const finish = () => {
        if (completed || cancelled) return;
        completed = true;
        if (typeof onComplete === "function") {
            try {
                onComplete();
            } catch {
                /* noop */
            }
        }
    };

    const tick = () => {
        if (cancelled) return;
        const root = getScrollRootEl(scrollRootRef);
        let sh;
        let vh;
        let maxScroll;
        if (root) {
            sh = Number(root.scrollHeight) || 0;
            vh = Number(root.clientHeight) || 0;
            maxScroll = Math.max(0, sh - vh);
        } else {
            const se = document.scrollingElement || document.documentElement;
            sh = Number(se?.scrollHeight) || 0;
            vh = window.innerHeight || 0;
            maxScroll = Math.max(0, sh - vh);
        }
        let y;
        if (nearBottom) {
            y = maxScroll;
        } else if (hasFraction && maxScroll > 4) {
            y = Math.min(Math.max(0, savedFrac * maxScroll), maxScroll);
        } else {
            y = Math.min(Math.max(0, targetY), maxScroll);
        }

        if (root) {
            root.scrollTop = y;
        } else {
            const se = document.scrollingElement || document.documentElement;
            window.scrollTo(0, y);
            se.scrollTop = y;
        }

        if (typeof onApplied === "function") {
            try {
                onApplied();
            } catch {
                /* noop */
            }
        }

        attempts += 1;
        if (attempts >= MAX) {
            finish();
            return;
        }

        if (nearBottom) {
            const same = Math.abs(maxScroll - prevMaxScroll) <= 1;
            prevMaxScroll = maxScroll;
            if (same) stableBottom += 1;
            else stableBottom = 0;
            if (stableBottom < 2) {
                requestAnimationFrame(tick);
            } else {
                finish();
            }
            return;
        }

        if (!hasFraction && targetY > maxScroll + 4) {
            requestAnimationFrame(tick);
            return;
        }

        if (savedDocH > 0 && sh + 32 < savedDocH && attempts < MAX - 6) {
            requestAnimationFrame(tick);
            return;
        }

        finish();
    };

    requestAnimationFrame(() => {
        requestAnimationFrame(tick);
    });

    return () => {
        cancelled = true;
    };
}
