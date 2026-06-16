import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex, IconButton, HStack } from "@chakra-ui/react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { ChevronRight, ChevronLeft } from "lucide-react";
import KanbanColumn from "./KanbanColumn";
import TaskCard from "./TaskCard";
import { canEditOrDeleteTaskStatus } from "./taskHelpers";
import {
  companyKanbanColumnLayout,
  getLocationStatusId,
  getStatusColumnCount,
  isCancelledKanbanColumn,
  kanbanDraggableBoxStyle,
} from "./adTaskBoardShared";

const COMPANY_TASK_MIN_H = { base: "228px", md: "228px" };

function useStableKanbanHandlers({
  onRequestEdit,
  onRequestDelete,
  onAssign,
  setSelectedTaskIds,
}) {
  const ref = useRef({
    onRequestEdit,
    onRequestDelete,
    onAssign,
    setSelectedTaskIds,
  });
  ref.current = {
    onRequestEdit,
    onRequestDelete,
    onAssign,
    setSelectedTaskIds,
  };
  return {
    onRequestEdit: useCallback((r) => ref.current.onRequestEdit?.(r), []),
    onRequestDelete: useCallback((r) => ref.current.onRequestDelete?.(r), []),
    onAssign: useCallback((r) => ref.current.onAssign?.(r), []),
    onToggleSelected: useCallback((id, checked) => {
      ref.current.setSelectedTaskIds?.((prev) => {
        const next = new Set(prev);
        if (checked) next.add(id);
        else next.delete(id);
        return next;
      });
    }, []),
  };
}

const CompanyKanbanDraggable = memo(function CompanyKanbanDraggable({
  row,
  index,
  colCount,
  assignMode,
  isSelected,
  stableHandlers,
}) {
  const id = String(row?.id ?? "").trim();
  if (!id) return null;

  return (
    <Draggable draggableId={id} index={index} isDragDisabled={assignMode}>
      {(dragProvided, dragSnapshot) => (
        <Box
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
          data-broker-task-id={id}
          w="100%"
          minH={COMPANY_TASK_MIN_H}
          style={kanbanDraggableBoxStyle(dragProvided, dragSnapshot)}
          opacity={dragSnapshot.isDragging ? 0.85 : 1}
          transition={dragSnapshot.isDragging ? "none" : "opacity 0.2s ease"}
        >
          <TaskCard
            row={row}
            isDragging={dragSnapshot.isDragging}
            hideAssign={false}
            canEdit={false}
            selectionMode={assignMode}
            isSelected={isSelected}
            onToggleSelected={(checked) =>
              stableHandlers.onToggleSelected(id, checked)
            }
            onAssign={stableHandlers.onAssign}
            onRequestDelete={stableHandlers.onRequestDelete}
            density={colCount > 0 && colCount <= 2 ? "sparse" : "default"}
          />
        </Box>
      )}
    </Draggable>
  );
});

const CompanyKanbanColumn = memo(function CompanyKanbanColumn({
  col,
  list,
  colCount,
  colLayout,
  assignMode,
  selectedTaskIds,
  boardDragging,
  stableHandlers,
  onEditColumn,
  onDeleteColumn,
  setSelectedTaskIds,
  showColumnActions,
}) {
  const idsInCol = useMemo(
    () => list.map((r) => String(r?.id ?? "").trim()).filter(Boolean),
    [list],
  );
  const selectedInCol = idsInCol.filter((id) => selectedTaskIds.has(id));
  const colAllSelected =
    idsInCol.length > 0 && selectedInCol.length === idsInCol.length;
  const colIndeterminate =
    selectedInCol.length > 0 && selectedInCol.length < idsInCol.length;

  return (
    <Droppable droppableId={col.key}>
      {(provided, snapshot) => (
        <Box
          ref={provided.innerRef}
          {...provided.droppableProps}
          flex={colLayout.flex}
          minW={colLayout.minW}
          maxW={colLayout.maxW}
          w={colLayout.w}
          display="flex"
        >
          <KanbanColumn
            statusKey={col.dropValue}
            statusApiId={col.id}
            title={col.name || "—"}
            colorScheme={col.colorScheme}
            count={colCount}
            isActiveDrop={snapshot.isDraggingOver}
            showColumnActions={showColumnActions}
            onEditColumn={() => onEditColumn?.(col)}
            onDeleteColumn={() => onDeleteColumn?.(col)}
            plainTitle
            uniformTaskSpacing={false}
            disableChromeTransition={boardDragging}
            headerCheck={
              assignMode
                ? {
                    checked: colAllSelected,
                    indeterminate: colIndeterminate,
                    onChange: () => {
                      setSelectedTaskIds((prev) => {
                        const next = new Set(prev);
                        if (colAllSelected) {
                          for (const cid of idsInCol) {
                            next.delete(cid);
                          }
                        } else {
                          for (const cid of idsInCol) {
                            next.add(cid);
                          }
                        }
                        return next;
                      });
                    },
                  }
                : null
            }
          >
            {list.map((row, i) => {
              const id = String(row?.id ?? "").trim();
              return (
                <CompanyKanbanDraggable
                  key={id}
                  row={row}
                  index={i}
                  colCount={colCount}
                  assignMode={assignMode}
                  isSelected={selectedTaskIds.has(id)}
                  stableHandlers={stableHandlers}
                />
              );
            })}
            {provided.placeholder}
          </KanbanColumn>
        </Box>
      )}
    </Droppable>
  );
});

/**
 * Kompaniya kanban — TaskCard UI, pastga scroll bilan pagination, oddiy drag (virtual emas).
 */
function CompanyTasksKanbanBoard({
  boardScrollRef,
  kanbanColumns,
  grouped,
  columnByKey,
  countByStatus,
  setRows,
  setCountByStatus,
  onPersistScroll,
  onDropToApi,
  onCancelDropRequest,
  assignMode,
  selectedTaskIds,
  setSelectedTaskIds,
  onRequestEdit,
  onRequestDelete,
  onAssign,
  onEditColumn,
  onDeleteColumn,
  onDragSessionStart,
  onDragSessionEnd,
}) {
  const stableHandlers = useStableKanbanHandlers({
    onRequestEdit,
    onRequestDelete,
    onAssign,
    setSelectedTaskIds,
  });

  const useBoardHorizontalScroll = kanbanColumns.length > 4;
  const isDraggingRef = useRef(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [boardDragging, setBoardDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const syncScrollMeta = useCallback(() => {
    if (isDraggingRef.current) return;
    const el = boardScrollRef?.current;
    if (!el) {
      setCanScrollRight(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollRight(max > 4 && el.scrollLeft < max - 4);
    setCanScrollLeft(el.scrollLeft > 4);
    onPersistScroll?.();
  }, [boardScrollRef, onPersistScroll]);

  useEffect(() => {
    syncScrollMeta();
  }, [kanbanColumns.length, syncScrollMeta]);

  const onDragStart = useCallback(() => {
    isDraggingRef.current = true;
    setBoardDragging(true);
    onDragSessionStart?.();
  }, [onDragSessionStart]);

  const handleDragEnd = useCallback(
    (result) => {
      isDraggingRef.current = false;
      setBoardDragging(false);
      onDragSessionEnd?.();
      syncScrollMeta();

      const { source, destination } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId) {
        return;
      }

      const sourceList = grouped[source.droppableId] ?? [];
      const movedRow = sourceList[source.index];
      if (!movedRow) return;

      const targetColumn = columnByKey.get(destination.droppableId);
      if (!targetColumn) return;

      const sourceColumn = columnByKey.get(source.droppableId);
      const sid = String(targetColumn?.id ?? "").trim();
      const prevSid = getLocationStatusId(movedRow);
      const movingAcross = Boolean(sid && prevSid && prevSid !== sid);
      const movedId = String(movedRow?.id ?? "").trim();

      if (movingAcross && movedId) {
        const isCancel =
          isCancelledKanbanColumn(targetColumn) &&
          sourceColumn &&
          !isCancelledKanbanColumn(sourceColumn);
        onCancelDropRequest?.({
          task: movedRow,
          statusApiId: sid,
          statusName: targetColumn.name || targetColumn.dropValue,
          targetIndex: destination.index,
          variant: isCancel ? "cancel" : "status",
        });
        return;
      }
    },
    [
      columnByKey,
      grouped,
      onCancelDropRequest,
      onDragSessionEnd,
      syncScrollMeta,
    ],
  );

  return (
    <Box position="relative">
      {useBoardHorizontalScroll && (canScrollRight || canScrollLeft) ? (
        <HStack>
          {/* <Box position="absolute" left={2} top={-63} zIndex={2}>
            {canScrollLeft ? (
              <IconButton
                aria-label="Chapga scroll"
                icon={<ChevronLeft size={22} />}
                size="md"
                colorScheme="blue"
                borderRadius="xl"
                onClick={() => {
                  const el = boardScrollRef?.current;
                  if (!el) return;
                  el.scrollBy({ left: -320, behavior: "smooth" });
                }}
              />
            ) : null}
          </Box> */}

          {/* <Box position="absolute" right={2} top={-63} zIndex={2} >
            {canScrollRight ? (
              <IconButton
                aria-label="O'ngga scroll"
                icon={<ChevronRight size={22} />}
                size="md"
                colorScheme="blue"
                borderRadius="xl"
                onClick={() => {
                  const el = boardScrollRef?.current;
                  if (!el) return;
                  el.scrollBy({ left: 320, behavior: "smooth" });
                }}
              />
            ) : null}
          </Box> */}
        </HStack>
      ) : null}

      <DragDropContext
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
        autoScrollerOptions={{ disabled: useBoardHorizontalScroll }}
      >
        <Box
          ref={boardScrollRef}
          overflowX={useBoardHorizontalScroll ? "auto" : "visible"}
          overflowY="hidden"
          pb={2}
          w="100%"
          sx={
            useBoardHorizontalScroll ? { scrollbarGutter: "stable" } : undefined
          }
          onScroll={syncScrollMeta}
          onWheel={(e) => {
            if (!useBoardHorizontalScroll) return;
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
            minW={useBoardHorizontalScroll ? "min-content" : undefined}
            w={useBoardHorizontalScroll ? undefined : "100%"}
            pb={1}
          >
            {kanbanColumns.map((col) => {
              const list = grouped[col.key] ?? [];
              const colCount = getStatusColumnCount(
                countByStatus,
                col.id,
                list.length,
              );
              const colLayout = companyKanbanColumnLayout(
                useBoardHorizontalScroll,
              );
              const showColumnActions = canEditOrDeleteTaskStatus(
                "company",
                col,
              );

              return (
                <CompanyKanbanColumn
                  key={col.key}
                  col={col}
                  list={list}
                  colCount={colCount}
                  colLayout={colLayout}
                  assignMode={assignMode}
                  selectedTaskIds={selectedTaskIds}
                  boardDragging={boardDragging}
                  stableHandlers={stableHandlers}
                  onEditColumn={onEditColumn}
                  onDeleteColumn={onDeleteColumn}
                  setSelectedTaskIds={setSelectedTaskIds}
                  showColumnActions={showColumnActions}
                />
              );
            })}
          </Flex>
        </Box>
      </DragDropContext>
    </Box>
  );
}

export default memo(CompanyTasksKanbanBoard);
