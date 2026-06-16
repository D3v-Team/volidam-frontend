import { memo } from "react";
import CompanyTasksKanbanBoard from "./CompanyTasksKanbanBoard";

/**
 * Sahifa qayta render bo‘lganda (badge, filter) kanban keraksiz yangilanmasin.
 */
const CompanyKanbanBlock = memo(function CompanyKanbanBlock({
    boardScrollRef,
    kanbanColumns,
    grouped,
    columnByKey,
    countByStatus,
    setRows,
    setCountByStatus,
    onPersistScroll,
    onDragSessionStart,
    onDragSessionEnd,
    onCancelDropRequest,
    assignMode,
    selectedTaskIds,
    setSelectedTaskIds,
    onRequestEdit,
    onRequestDelete,
    onAssign,
    onEditColumn,
    onDeleteColumn,
}) {
    return (
        <CompanyTasksKanbanBoard
            boardScrollRef={boardScrollRef}
            kanbanColumns={kanbanColumns}
            grouped={grouped}
            columnByKey={columnByKey}
            countByStatus={countByStatus}
            setRows={setRows}
            setCountByStatus={setCountByStatus}
            onPersistScroll={onPersistScroll}
            onDragSessionStart={onDragSessionStart}
            onDragSessionEnd={onDragSessionEnd}
            onCancelDropRequest={onCancelDropRequest}
            assignMode={assignMode}
            selectedTaskIds={selectedTaskIds}
            setSelectedTaskIds={setSelectedTaskIds}
            onRequestEdit={onRequestEdit}
            onRequestDelete={onRequestDelete}
            onAssign={onAssign}
            onEditColumn={onEditColumn}
            onDeleteColumn={onDeleteColumn}
        />
    );
});

export default CompanyKanbanBlock;
