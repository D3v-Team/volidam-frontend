import { useCallback, useEffect, useState } from "react";
import { Box, Flex, IconButton } from "@chakra-ui/react";
import { ChevronRight } from "lucide-react";
import KanbanColumn from "./KanbanColumn";
import { leadsKanbanColumnLayout } from "./leadStyles";

export default function LeadsKanbanBoard({
  boardScrollRef,
  sentinelRef,
  statuses,
  lidsByStatus,
  counts,
  loading,
  canManageStatuses,
  maxVisibleColumns = 4,
  isDragOverStatusId,
  onDragOverStatusId,
  onDragLeaveStatus,
  onDropLid,
  onOpenLid,
  onDeleteLid,
  onEditStatus,
  onDeleteStatus,
  onPersistScroll,
  assignMode,
  selectedLeadIds,
  setSelectedLeadIds,
}) {
  const useHorizontalScroll = statuses.length > maxVisibleColumns;
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  const colLayout = leadsKanbanColumnLayout(useHorizontalScroll);

  return (
    <Box position="relative" w="100%" maxW="100%" minW={0} overflow="hidden">
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

      <Box
        ref={boardScrollRef}
        overflowX={useHorizontalScroll ? "auto" : "hidden"}
        overflowY="hidden"
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
              isDragOver={isDragOverStatusId === status.id}
              onDragOver={onDragOverStatusId}
              onDragLeave={onDragLeaveStatus}
              onDropLid={onDropLid}
              onOpenLid={onOpenLid}
              onDeleteLid={onDeleteLid}
              onEditStatus={onEditStatus}
              onDeleteStatus={onDeleteStatus}
              assignMode={assignMode}
              selectedLeadIds={selectedLeadIds}
              setSelectedLeadIds={setSelectedLeadIds}
            />
          ))}
        </Flex>
      </Box>
      <Box ref={sentinelRef} h="40px" w="full" />
    </Box>
  );
}
