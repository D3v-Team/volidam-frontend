import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Flex, IconButton } from "@chakra-ui/react";
import { ChevronRight } from "lucide-react";
import KanbanColumn from "./KanbanColumn";
import { leadsKanbanColumnLayout } from "./leadStyles";

// New: Sentinel for infinite scroll on board
export default function LeadsKanbanBoard({
  boardScrollRef,
  statuses,
  lidsByStatus,
  counts,
  loading,
  canManageStatuses,
  canManageChildStatuses = false,
  maxVisibleColumns = 4,
  isDragOverStatusId,
  onDragOverStatusId,
  onDragLeaveStatus,
  onDropLid,
  onOpenLid,
  onDeleteLid,
  onEditStatus,
  onDeleteStatus,
  onAddChildStatus,
  onAddCategory,
  onPersistScroll,
  isFiltered = false,
  showFilteredChildren = false,
  assignMode,
  selectedLeadIds,
  setSelectedLeadIds,
  // --- New props for per column data ---
  columnStates = {},
  onLoadMore,
  // New props for board-level pagination:
  boardHasMore,
  boardLoading,
  onBoardLoadMore
}) {
  const useHorizontalScroll = statuses.length > maxVisibleColumns;
  const [canScrollRight, setCanScrollRight] = useState(false);

  const sentinelRef = useRef(null);

  const syncScrollMeta = useCallback(() => {
    const el = boardScrollRef?.current;
    if (!el) {
      setCanScrollRight(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollRight(max > 4 && el.scrollLeft < max - 4);
    onPersistScroll?.();
  }, [boardScrollRef, onPersistScroll]);

  useEffect(() => {
    syncScrollMeta();
  }, [statuses.length, maxVisibleColumns, syncScrollMeta]);

  // Infinite scroll for page-level (when user reaches board bottom)
  useEffect(() => {
    // If handler or ref missing, skip
    if (!onBoardLoadMore || !sentinelRef.current) return;

    const el = sentinelRef.current;

    // If nothing to load (hasMore false), do not trigger
    if (!boardHasMore) return;

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && boardHasMore && !boardLoading) {
          onBoardLoadMore();
        }
      },
      { root: null, rootMargin: "0px 0px 200px 0px", threshold: 0 }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [boardHasMore, boardLoading, onBoardLoadMore]);

  const colLayout = leadsKanbanColumnLayout(useHorizontalScroll);

  return (
    <Box position="relative" w="100%" maxW="100%" minW={0}>
      {/* ── O'ngga scroll tugmasi ── */}
      {useHorizontalScroll && canScrollRight ? (
        <IconButton
          aria-label="O'ngga scroll"
          icon={<ChevronRight size={22} />}
          size="md"
          colorScheme="pink"
          borderRadius="xl"
          position="absolute"
          right={2}
          top={-12}
          zIndex={2}
          onClick={() => {
            const el = boardScrollRef?.current;
            if (!el) return;
            el.scrollBy({ left: 320, behavior: "smooth" });
          }}
        />
      ) : null}

      {/* ── Faqat gorizontal scroll — vertikal BLOKLANMAYDI ── */}
      <Box
        ref={boardScrollRef}
        overflowX={useHorizontalScroll ? "auto" : "hidden"}
        // overflowY="hidden" — OLIB TASHLANDI, sentinel ko'rinishi uchun
        pb={2}
        w="100%"
        maxW="100%"
        minW={0}
        sx={
          useHorizontalScroll
            ? {
                scrollbarGutter: "stable",
                "&::-webkit-scrollbar": { height: "8px" },
                "&::-webkit-scrollbar-thumb": {
                  bg: "rgba(71, 85, 105, 0.4)",
                  borderRadius: "full",
                },
              }
            : undefined
        }
        onScroll={syncScrollMeta}
        onWheel={(e) => {
          if (!useHorizontalScroll) return;
          if (!e.shiftKey) return;
          const el = boardScrollRef?.current;
          if (!el) return;
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }}
      >
        <Flex
          gap={4}
          align="stretch"
          justify="flex-start"
          minW={useHorizontalScroll ? "min-content" : 0}
          w="100%"
          maxW="100%"
          pb={1}
        >
          {statuses.map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              lids={lidsByStatus[status.id] || []}
              count={counts[status.id] || 0}
              loading={loading}
              colLayout={colLayout}
              canManageStatuses={canManageStatuses}
              canManageChildStatuses={canManageChildStatuses}
              isDragOver={isDragOverStatusId === status.id}
              onDragOver={onDragOverStatusId}
              onDragLeave={onDragLeaveStatus}
              onDropLid={onDropLid}
              onOpenLid={onOpenLid}
              onDeleteLid={onDeleteLid}
              onEditStatus={onEditStatus}
              onDeleteStatus={onDeleteStatus}
              onAddChildStatus={onAddChildStatus}
              onAddCategory={onAddCategory}
              isFiltered={isFiltered}
              showFilteredChildren={showFilteredChildren}
              assignMode={assignMode}
              selectedLeadIds={selectedLeadIds}
              setSelectedLeadIds={setSelectedLeadIds}
              hasMore={columnStates[status.id]?.hasMore ?? false}
              columnLoading={columnStates[status.id]?.loading ?? false}
              onLoadMore={() => onLoadMore?.(status.id)}
            />
          ))}
        </Flex>
        {/* Sentinel at the end for board-level/infinite pagination */}
        {boardHasMore && (
          <div
            ref={sentinelRef}
            style={{
              width: "100%",
              height: 32,
              // Optionally show spinner
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {boardLoading && (
              <span style={{ color: "#888", fontSize: 14 }}>Yuklanmoqda...</span>
            )}
          </div>
        )}
      </Box>
    </Box>
  );
}