import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

/**
 * columnsConfig: Array of { id, label }
 * visibleColumns: Array of column ids, in order to display
 * setVisibleColumns: setter for parent state
 */
export default function ColumnPickerModal({
  open,
  onClose,
  columnsConfig,
  visibleColumns,
  setVisibleColumns,
}) {
  // Defensive handling
  const safeConfig = Array.isArray(columnsConfig) ? columnsConfig : [];
  const safeVisibleColumns = Array.isArray(visibleColumns) ? visibleColumns : [];

  // Columns state: order and visibility
  const [orderedColumns, setOrderedColumns] = useState(safeVisibleColumns);

  // Initialize on open or visibleColumns change
  useEffect(() => {
    if (open) setOrderedColumns(safeVisibleColumns);
    // eslint-disable-next-line
  }, [open, visibleColumns]);

  // Save selected columns (order & visibility)
  function handleSave() {
    setVisibleColumns(orderedColumns);
    onClose();
  }

  // Show/hide column toggle
  function handleToggle(colId) {
    setOrderedColumns(cols =>
      cols.includes(colId)
        ? cols.filter(c => c !== colId)
        : [...cols, colId]
    );
  }

  // Drag/drop reordering
  function onDragEnd(result) {
    if (!result.destination) return;
    const items = Array.from(orderedColumns);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    setOrderedColumns(items);
  }

  // Two lists: selected (ordered), then unselected (in config order)
  const selected = safeConfig.filter(col => orderedColumns.includes(col.id));
  const unselected = safeConfig.filter(col => !orderedColumns.includes(col.id));
  const allForGrid = [...selected, ...unselected];
  const mid = Math.ceil(allForGrid.length / 2);
  const gridFields = [allForGrid.slice(0, mid), allForGrid.slice(mid)];

  return (
    <Dialog open={!!open} onClose={onClose} className="fixed z-40 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen bg-black bg-opacity-40">
        <Dialog.Panel className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-neutral-800 p-8">
          <Dialog.Title className="text-xl font-bold mb-4 text-blue-700 dark:text-blue-200 text-center">
            Manage Columns
          </Dialog.Title>
          <div className="mb-4 text-gray-700 dark:text-gray-200 text-sm text-center">
            Drag to reorder visible columns (left). Uncheck to hide.<br />
            <span className="text-blue-700 dark:text-blue-200">
              Columns & order always match your dashboard config!
            </span>
          </div>
          <div className="overflow-y-auto max-h-80 border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="columns-list">
                {provided => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="grid grid-cols-2 gap-x-6 gap-y-2"
                  >
                    {gridFields.map((fieldGroup, colIdx) => (
                      <div key={colIdx}>
                        {fieldGroup.map((col, idx) => (
                          <Draggable
                            key={col.id}
                            draggableId={col.id}
                            index={orderedColumns.indexOf(col.id) !== -1 ? orderedColumns.indexOf(col.id) : mid + idx}
                            isDragDisabled={colIdx > 0 || !orderedColumns.includes(col.id)}
                          >
                            {drag => (
                              <div
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                className={`flex items-center rounded-xl px-2 py-2 mb-2
                                  ${orderedColumns.includes(col.id)
                                    ? "bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700"
                                    : "bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-800"}
                                  transition-shadow`}
                                tabIndex={-1}
                              >
                                {orderedColumns.includes(col.id) && colIdx === 0 ? (
                                  <span {...drag.dragHandleProps}
                                    className="cursor-move mr-2 text-blue-500 dark:text-blue-300"
                                    title="Drag to reorder"
                                  >☰</span>
                                ) : (
                                  <span className="w-5 mr-2" />
                                )}
                                <input
                                  type="checkbox"
                                  checked={orderedColumns.includes(col.id)}
                                  onChange={() => handleToggle(col.id)}
                                  className="mr-2 accent-blue-600"
                                  id={`colpick-${col.id}`}
                                />
                                <label
                                  htmlFor={`colpick-${col.id}`}
                                  className="truncate cursor-pointer flex-1 text-gray-800 dark:text-gray-100"
                                  title={col.label || col.id}
                                >
                                  {col.label || col.id}
                                </label>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 font-semibold"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow hover:scale-105 transition font-semibold"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}