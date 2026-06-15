import { useCallback, useEffect, useRef, useState } from "react";
import {
    buildLeadsBoardFilterSig,
    leadsBoardScrollSessionKey,
    readLeadsBoardScrollSession,
    writeLeadsBoardScrollSession,
} from "../components/leads/leadsBoardScrollSession";
import {
    getViewportLeadAnchorId,
    scheduleLeadAnchorIfNeeded,
} from "../components/leads/leadsBoardScrollAnchor";
import {
    applyRestoredPageVerticalScroll,
    snapshotVerticalScrollToRef,
    verticalSnapshotForSessionWrite,
} from "../pages/ADtasks/_components/tasksBoardVerticalScroll";

export function useLeadsBoardScroll({
    roleScope = "default",
    statusFilter,
    search,
    assignedId = "",
    role = "",
    page = 1,
    ready,
    sessionHydrated = false,
    restoreInProgressRef,
    filterSig: filterSigProp,
}) {
    const sessionKey = leadsBoardScrollSessionKey(roleScope);
    const filterSig =
        filterSigProp ??
        buildLeadsBoardFilterSig({ statusFilter, search, assignedId, role });

    const mainScrollRef = useRef(null);
    const boardScrollRef = useRef(null);
    const sentinelRef = useRef(null);
    const scrollPersistTimerRef = useRef(null);
    const lastGoodVerticalScrollRef = useRef(null);
    const sessionHydratedRef = useRef(false);
    const restoreInProgressLocalRef = useRef(false);
    const restoredSigRef = useRef("");
    const pageRef = useRef(page);
    const filterSigRef = useRef(filterSig);
    const prevFilterSigRef = useRef(null);
    const explicitAnchorRef = useRef("");

    const [scrollRestoring, setScrollRestoring] = useState(false);

    const restoreInProgress = restoreInProgressRef ?? restoreInProgressLocalRef;

    useEffect(() => {
        pageRef.current = page;
    }, [page]);

    useEffect(() => {
        filterSigRef.current = filterSig;
    }, [filterSig]);

    useEffect(() => {
        sessionHydratedRef.current = sessionHydrated;
    }, [sessionHydrated]);

    const flushPersistScroll = useCallback(
        (anchorLidId) => {
            if (typeof window === "undefined" || restoreInProgress.current) return;
            const vertical =
                lastGoodVerticalScrollRef.current ??
                verticalSnapshotForSessionWrite(lastGoodVerticalScrollRef, mainScrollRef);
            const anchor =
                String(anchorLidId ?? explicitAnchorRef.current ?? "").trim() ||
                getViewportLeadAnchorId(mainScrollRef);
            writeLeadsBoardScrollSession(sessionKey, {
                filterSig: filterSigRef.current,
                ...(vertical ?? {}),
                boardScrollLeft: boardScrollRef.current?.scrollLeft ?? 0,
                maxLoadedPage: pageRef.current,
                anchorLidId: anchor,
            });
            if (anchorLidId) explicitAnchorRef.current = String(anchorLidId);
        },
        [sessionKey, restoreInProgress]
    );

    const persistNow = useCallback(
        (anchorLidId) => {
            if (scrollPersistTimerRef.current != null) {
                clearTimeout(scrollPersistTimerRef.current);
                scrollPersistTimerRef.current = null;
            }
            if (anchorLidId) explicitAnchorRef.current = String(anchorLidId);
            snapshotVerticalScrollToRef(lastGoodVerticalScrollRef, mainScrollRef);
            flushPersistScroll(anchorLidId);
        },
        [flushPersistScroll]
    );

    const schedulePersistScroll = useCallback(() => {
        if (scrollPersistTimerRef.current != null) return;
        scrollPersistTimerRef.current = window.setTimeout(() => {
            scrollPersistTimerRef.current = null;
            flushPersistScroll();
        }, 200);
    }, [flushPersistScroll]);

    // Faqat filter haqiqatan o'zgarganda scroll reset
    useEffect(() => {
        if (prevFilterSigRef.current === filterSig) return;
        prevFilterSigRef.current = filterSig;
        restoredSigRef.current = "";
        explicitAnchorRef.current = "";
        lastGoodVerticalScrollRef.current = null;
        const el = mainScrollRef.current;
        if (el) el.scrollTop = 0;
        if (boardScrollRef.current) boardScrollRef.current.scrollLeft = 0;
    }, [filterSig]);

    useEffect(() => {
        const el = mainScrollRef.current;
        if (!el) return;
        const onScroll = () => {
            snapshotVerticalScrollToRef(lastGoodVerticalScrollRef, mainScrollRef);
            schedulePersistScroll();
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, [schedulePersistScroll]);

    useEffect(() => {
        const el = boardScrollRef.current;
        if (!el) return;
        const onScroll = () => schedulePersistScroll();
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, [schedulePersistScroll]);

    useEffect(() => {
        if (restoreInProgress.current) return;
        if (!sessionHydrated && page <= 1) return;
        flushPersistScroll();
    }, [page, filterSig, sessionHydrated, flushPersistScroll, restoreInProgress]);

    useEffect(() => {
        const persist = () => {
            if (scrollPersistTimerRef.current != null) {
                clearTimeout(scrollPersistTimerRef.current);
                scrollPersistTimerRef.current = null;
            }
            if (pageRef.current > 1 || sessionHydratedRef.current) {
                flushPersistScroll();
            }
        };

        const onHidden = () => {
            if (typeof document === "undefined" || document.visibilityState !== "hidden") return;
            persist();
        };

        document.addEventListener("visibilitychange", onHidden);
        return () => {
            document.removeEventListener("visibilitychange", onHidden);
            persist();
        };
    }, [sessionKey, flushPersistScroll]);

    // Scroll / anchor tiklash — barcha sahifalar yuklangandan keyin
    useEffect(() => {
        if (!ready || !sessionHydrated) return;
        if (restoredSigRef.current === filterSig) return;

        const saved = readLeadsBoardScrollSession(sessionKey);
        if (!saved || String(saved.filterSig ?? "") !== filterSig) {
            restoredSigRef.current = filterSig;
            return;
        }

        const anchorLidId = String(saved.anchorLidId ?? "").trim();
        const savedY = Number(saved.windowScrollY) || 0;
        const savedBoardLeft = Number(saved.boardScrollLeft) || 0;
        const hasScroll = savedY > 0 || saved.nearBottom;
        const hasAnchor = Boolean(anchorLidId);

        if (!hasScroll && !hasAnchor && savedBoardLeft <= 0) {
            restoredSigRef.current = filterSig;
            return;
        }

        restoreInProgress.current = true;
        setScrollRestoring(true);
        restoredSigRef.current = filterSig;

        const boardEl = boardScrollRef.current;
        let cancelAnchor = () => {};
        let cancelVertical = () => {};

        const finishRestore = () => {
            restoreInProgress.current = false;
            setScrollRestoring(false);
            snapshotVerticalScrollToRef(lastGoodVerticalScrollRef, mainScrollRef);
            if (boardEl && savedBoardLeft > 0) {
                boardEl.scrollLeft = savedBoardLeft;
            }
            flushPersistScroll();
        };

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (hasAnchor) {
                    cancelAnchor = scheduleLeadAnchorIfNeeded(saved, {
                        onComplete: finishRestore,
                    });
                    return;
                }

                if (boardEl && savedBoardLeft > 0) {
                    boardEl.scrollLeft = savedBoardLeft;
                }

                cancelVertical = applyRestoredPageVerticalScroll(saved, {
                    scrollRootRef: mainScrollRef,
                    onApplied: () => {
                        if (boardEl && savedBoardLeft > 0) {
                            boardEl.scrollLeft = savedBoardLeft;
                        }
                    },
                    onComplete: finishRestore,
                });
            });
        });

        const restoreTimer = window.setTimeout(() => {
            if (restoreInProgress.current) finishRestore();
        }, 3000);

        return () => {
            cancelAnchor?.();
            cancelVertical?.();
            window.clearTimeout(restoreTimer);
            restoreInProgress.current = false;
            setScrollRestoring(false);
        };
    }, [ready, sessionHydrated, filterSig, sessionKey, flushPersistScroll, restoreInProgress]);

    return {
        mainScrollRef,
        boardScrollRef,
        sentinelRef,
        schedulePersistScroll,
        sessionHydratedRef,
        restoreInProgressRef: restoreInProgress,
        scrollRestoring,
        filterSig,
        persistNow,
    };
};
