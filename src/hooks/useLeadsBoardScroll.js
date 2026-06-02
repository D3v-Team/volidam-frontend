import { useCallback, useEffect, useRef } from "react";
import {
    buildLeadsBoardFilterSig,
    leadsBoardScrollSessionKey,
    readLeadsBoardScrollSession,
    writeLeadsBoardScrollSession,
} from "../components/leads/leadsBoardScrollSession";
import {
    applyRestoredPageVerticalScroll,
    snapshotVerticalScrollToRef,
    verticalSnapshotForSessionWrite,
} from "../pages/ADtasks/_components/tasksBoardVerticalScroll";

export function useLeadsBoardScroll({ roleScope = "default", statusFilter, search, ready }) {
    const sessionKey = leadsBoardScrollSessionKey(roleScope);
    const filterSig = buildLeadsBoardFilterSig({ statusFilter, search });

    const mainScrollRef = useRef(null);
    const boardScrollRef = useRef(null);
    const sentinelRef = useRef(null);
    const scrollPersistTimerRef = useRef(null);
    const lastGoodVerticalScrollRef = useRef(null);
    const sessionHydratedRef = useRef(false);
    const restoreInProgressRef = useRef(false);
    const restoredSigRef = useRef("");

    const flushPersistScroll = useCallback(() => {
        if (typeof window === "undefined" || restoreInProgressRef.current) return;
        const vertical =
            lastGoodVerticalScrollRef.current ??
            verticalSnapshotForSessionWrite(lastGoodVerticalScrollRef, mainScrollRef);
        writeLeadsBoardScrollSession(sessionKey, {
            filterSig,
            ...(vertical ?? {}),
            boardScrollLeft: boardScrollRef.current?.scrollLeft ?? 0,
        });
    }, [filterSig, sessionKey]);

    const schedulePersistScroll = useCallback(() => {
        if (scrollPersistTimerRef.current != null) return;
        scrollPersistTimerRef.current = window.setTimeout(() => {
            scrollPersistTimerRef.current = null;
            flushPersistScroll();
        }, 200);
    }, [flushPersistScroll]);

    useEffect(() => {
        sessionHydratedRef.current = false;
        restoredSigRef.current = "";
        lastGoodVerticalScrollRef.current = null;
        const el = mainScrollRef.current;
        if (el) el.scrollTop = 0;
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
        if (!ready) return;
        if (restoredSigRef.current === filterSig) {
            sessionHydratedRef.current = true;
            return;
        }

        const saved = readLeadsBoardScrollSession(sessionKey);
        if (!saved || String(saved.filterSig ?? "") !== filterSig) {
            sessionHydratedRef.current = true;
            restoredSigRef.current = filterSig;
            return;
        }

        restoreInProgressRef.current = true;
        restoredSigRef.current = filterSig;

        const boardEl = boardScrollRef.current;
        if (boardEl && typeof saved.boardScrollLeft === "number") {
            boardEl.scrollLeft = saved.boardScrollLeft;
        }

            const cancelVertical = applyRestoredPageVerticalScroll(saved, {
            scrollRootRef: mainScrollRef,
            onComplete: () => {
                restoreInProgressRef.current = false;
                sessionHydratedRef.current = true;
                snapshotVerticalScrollToRef(lastGoodVerticalScrollRef, mainScrollRef);
            },
        });

        const restoreTimer = window.setTimeout(() => {
            if (!restoreInProgressRef.current && mainScrollRef.current) {
                const savedY = Number(saved.windowScrollY) || 0;
                mainScrollRef.current.scrollTop = savedY;
                restoreInProgressRef.current = false;
                sessionHydratedRef.current = true;
                snapshotVerticalScrollToRef(lastGoodVerticalScrollRef, mainScrollRef);
            }
        }, 100);

        return () => {
            cancelVertical?.();
            window.clearTimeout(restoreTimer);
            restoreInProgressRef.current = false;
        };
    }, [ready, filterSig, sessionKey]);

    return {
        mainScrollRef,
        boardScrollRef,
        sentinelRef,
        schedulePersistScroll,
        sessionHydratedRef,
        restoreInProgressRef,
        filterSig,
    };
}
