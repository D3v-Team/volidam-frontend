import { useCallback, useEffect, useRef } from "react";
import {
    buildLeadsBoardFilterSig,
    leadsBoardScrollSessionKey,
    writeLeadsBoardScrollSession,
} from "../components/leads/leadsBoardScrollSession";
import {
    getViewportLeadAnchorId,
} from "../components/leads/leadsBoardScrollAnchor";
import {
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
    const pageRef = useRef(page);
    const filterSigRef = useRef(filterSig);
    const prevFilterSigRef = useRef(null);
    const explicitAnchorRef = useRef("");

    const restoreInProgress = restoreInProgressRef ?? restoreInProgressLocalRef;

    useEffect(() => { pageRef.current = page; }, [page]);
    useEffect(() => { filterSigRef.current = filterSig; }, [filterSig]);
    useEffect(() => { sessionHydratedRef.current = sessionHydrated; }, [sessionHydrated]);

    const userScrolledRef = useRef(false);

    const flushPersistScroll = useCallback(
        (anchorLidId) => {
            if (typeof window === "undefined" || restoreInProgress.current) return;
            const vertical =
                lastGoodVerticalScrollRef.current ??
                verticalSnapshotForSessionWrite(lastGoodVerticalScrollRef, mainScrollRef);
            const anchor =
                String(anchorLidId ?? explicitAnchorRef.current ?? "").trim() ||
                getViewportLeadAnchorId(mainScrollRef);

            const sy   = Number(vertical?.windowScrollY) || 0;
            const sf   = Number(vertical?.scrollFraction);
            const hasSf = Number.isFinite(sf) && sf >= 0 && sf <= 1;
            const isBottom  = Boolean(vertical?.nearBottom) || (hasSf && sf > 0.95);
            const isNearTop = userScrolledRef.current && !isBottom && sy < 64 && (!hasSf || sf < 0.05);

            writeLeadsBoardScrollSession(sessionKey, {
                filterSig:       filterSigRef.current,
                windowScrollY:   isNearTop ? 0 : sy,
                scrollFraction:  isNearTop ? 0 : isBottom ? 1 : (hasSf ? sf : 0),
                nearBottom:      isNearTop ? false : vertical?.nearBottom,
                docScrollHeight: vertical?.docScrollHeight,
                viewportHeight:  vertical?.viewportHeight,
                scrollHeight:    vertical?.docScrollHeight,
                clientHeight:    vertical?.viewportHeight,
                boardScrollLeft: boardScrollRef.current?.scrollLeft ?? 0,
                maxLoadedPage:   isNearTop ? 1 : pageRef.current,
                anchorLidId:     isNearTop ? "" : anchor,
            });
            if (anchorLidId && !isNearTop) explicitAnchorRef.current = String(anchorLidId);
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

    // Filter o'zgarganda scroll tepaga reset
    useEffect(() => {
        if (prevFilterSigRef.current === filterSig) return;
        prevFilterSigRef.current = filterSig;
        explicitAnchorRef.current = "";
        lastGoodVerticalScrollRef.current = null;
        userScrolledRef.current = false;
        const el = mainScrollRef.current;
        if (el) el.scrollTop = 0;
        if (boardScrollRef.current) boardScrollRef.current.scrollLeft = 0;
    }, [filterSig]);

    // Scroll hodisalari
    useEffect(() => {
        const el = mainScrollRef.current;
        if (!el) return;
        const onScroll = () => {
            userScrolledRef.current = true;
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

    // Page/filter o'zgarganda persist
    useEffect(() => {
        if (restoreInProgress.current) return;
        if (!sessionHydrated && page <= 1) return;
        flushPersistScroll();
    }, [page, filterSig, sessionHydrated, flushPersistScroll, restoreInProgress]);

    // Tab yopilganda / unmount da persist
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
            if (document.visibilityState !== "hidden") return;
            persist();
        };
        document.addEventListener("visibilitychange", onHidden);
        return () => {
            document.removeEventListener("visibilitychange", onHidden);
            persist();
        };
    }, [sessionKey, flushPersistScroll]);

    return {
        mainScrollRef,
        boardScrollRef,
        sentinelRef,
        schedulePersistScroll,
        sessionHydratedRef,
        restoreInProgressRef: restoreInProgress,
        // scrollRestoring har doim false — restore logikasi olib tashlandi
        scrollRestoring: false,
        filterSig,
        persistNow,
    };
}
