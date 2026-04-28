"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDndContext,
  useDroppable,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createColumn,
  createTask,
  deleteColumn,
  deleteTask,
  persistColumnOrder,
  persistTaskPositions,
  renameColumn,
  updateTask,
} from "./actions";
import { useRouter } from "next/navigation";
import type { Column, Task } from "./types";

type BoardData = {
  columns: Column[];
  tasks: Task[];
};

type TasksByColumn = Record<string, Task[]>;
const LABEL_COLORS = ["red", "blue", "green", "yellow"] as const;
type LabelColor = (typeof LABEL_COLORS)[number];
const LABEL_CLASS: Record<LabelColor, string> = {
  red: "bg-rose-500",
  blue: "bg-rose-400",
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
};

function groupTasks(tasks: Task[]): TasksByColumn {
  const out: TasksByColumn = {};
  for (const t of tasks) {
    (out[t.column_id] ??= []).push(t);
  }
  for (const colId of Object.keys(out)) {
    out[colId].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  return out;
}

function reorderOrders<T extends { id: string }>(items: T[]) {
  return items.map((it, idx) => ({ ...it, order: idx }));
}

function normalizeLabels(labels?: string[] | null): LabelColor[] {
  if (!labels) return [];
  return labels.filter((l): l is LabelColor => (LABEL_COLORS as readonly string[]).includes(l));
}

function formatDueDate(raw?: string | null) {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isPastDue(raw?: string | null) {
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}

function toDateInputValue(raw?: string | null) {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBelowOverMidline(event: DragOverEvent | DragEndEvent) {
  const translated = event.active.rect.current.translated;
  const overRect = event.over?.rect;
  if (!translated || !overRect) return false;
  const activeMidY = translated.top + translated.height / 2;
  const overMidY = overRect.top + overRect.height / 2;
  return activeMidY > overMidY;
}

function getPointerY(event: DragOverEvent | DragEndEvent): number | null {
  const src = event.activatorEvent;
  if (src && "clientY" in src && typeof src.clientY === "number") {
    return src.clientY;
  }
  const translated = event.active.rect.current.translated;
  if (!translated) return null;
  return translated.top + translated.height / 2;
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    id: String(task.id),
    column_id: String(task.column_id),
  };
}

function normalizeTasks(tasks: Task[]): Task[] {
  return tasks.map(normalizeTask);
}

function sameColumnOrder(a: Column[], b: Column[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (String(a[i].id) !== String(b[i].id)) return false;
    if ((a[i].order ?? 0) !== (b[i].order ?? 0)) return false;
  }
  return true;
}

function TaskCardVisual({ task, isOverlay }: { task: Task; isOverlay?: boolean }) {
  const creatorName = task.created_by_name?.trim() || "Anonymous";
  const hasCreatorImage = Boolean(task.created_by_image);
  const labels = normalizeLabels(task.labels);
  const dueDateText = formatDueDate(task.due_date);
  const dueDatePast = isPastDue(task.due_date);
  return (
    <div
      className={[
        "relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition",
        isOverlay ? "shadow-lg ring-1 ring-slate-200" : "hover:shadow-md hover:ring-1 hover:ring-rose-200 hover:border-rose-300",
      ].join(" ")}
    >
      {labels.length > 0 ? (
        <div className="mb-2 flex items-center gap-1">
          {labels.map((label) => (
            <span key={label} className={`h-1.5 w-6 rounded-full ${LABEL_CLASS[label]}`} />
          ))}
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pb-8">
          <div className="text-sm font-medium text-zinc-900 truncate">
            {String(task.content ?? "") || "(empty)"}
          </div>
          {task.description ? (
            <div className="mt-1 text-xs text-zinc-600 line-clamp-2">{task.description}</div>
          ) : null}
        </div>
      </div>
      {task.description ? (
        <span className="absolute bottom-2 left-2 text-zinc-400" title="Has description">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <path d="M8 2h8l4 4v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
            <path d="M14 2v4h4" />
          </svg>
        </span>
      ) : null}
      <div className="absolute bottom-2 right-2 flex max-w-[70%] items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-2 py-0.5 text-[10px] font-medium text-zinc-600 shadow-sm">
        {hasCreatorImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={task.created_by_image as string} alt={creatorName} className="h-5 w-5 rounded-full" />
        ) : (
          <span className="h-5 w-5 rounded-full bg-zinc-200" />
        )}
        <span className="truncate">{creatorName}</span>
        {dueDateText ? (
          <span className={`ml-1 inline-flex items-center gap-1 ${dueDatePast ? "text-red-500" : "text-zinc-500"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>{dueDateText}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SortableTaskCard({
  task,
  onChanged,
  onOpenTask,
  isAnyDragging,
  isDropSettling,
}: {
  task: Task;
  onChanged: () => void;
  onOpenTask: (task: Task) => void;
  isAnyDragging: boolean;
  isDropSettling: boolean;
}) {
  const sortableId = `task:${task.id}`;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: sortableId });

  const baseTransform = CSS.Transform.toString(transform);
  const style: React.CSSProperties = {
    transform: isDragging ? `${baseTransform} rotate(2deg) scale(1.03)` : baseTransform,
    transition: isDragging || isDropSettling ? "none" : transition,
    // Keep the "placeholder" visible while the overlay follows the cursor.
    opacity: isDragging ? 0.25 : 1,
  };

  const creatorName = task.created_by_name?.trim() || "Anonymous";
  const hasCreatorImage = Boolean(task.created_by_image);
  const labels = normalizeLabels(task.labels);
  const dueDateText = formatDueDate(task.due_date);
  const dueDatePast = isPastDue(task.due_date);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-rose-200 hover:border-rose-300 cursor-pointer"
      onClick={() => {
        // Prevent accidental modal-open when a drag just occurred.
        if (isAnyDragging || isDragging) return;
        onOpenTask(task);
      }}
    >
      {labels.length > 0 ? (
        <div className="mb-2 flex items-center gap-1">
          {labels.map((label) => (
            <span key={label} className={`h-1.5 w-6 rounded-full ${LABEL_CLASS[label]}`} />
          ))}
        </div>
      ) : null}
      {task.description ? (
        <span className="absolute bottom-2 left-2 text-zinc-400" title="Has description">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <path d="M8 2h8l4 4v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
            <path d="M14 2v4h4" />
          </svg>
        </span>
      ) : null}
      <div className="absolute bottom-2 right-2 flex max-w-[70%] items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-2 py-0.5 text-[10px] font-medium text-zinc-600 shadow-sm">
        {hasCreatorImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={task.created_by_image as string} alt={creatorName} className="h-5 w-5 rounded-full" />
        ) : (
          <span className="h-5 w-5 rounded-full bg-zinc-200" />
        )}
        <span className="truncate">{creatorName}</span>
        {dueDateText ? (
          <span className={`ml-1 inline-flex items-center gap-1 ${dueDatePast ? "text-red-500" : "text-zinc-500"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>{dueDateText}</span>
          </span>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pb-8">
          <div className="text-sm font-medium text-zinc-900 truncate">
            {String(task.content ?? "") || "(empty)"}
          </div>
          {task.description ? (
            <div className="mt-1 text-xs text-zinc-600 line-clamp-2">
              {task.description}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            ref={setActivatorNodeRef}
            type="button"
            className={[
              "rounded-md px-2 py-1 transition",
              "cursor-grab hover:bg-rose-50",
              "text-slate-400 hover:text-rose-500",
              isDragging ? "cursor-grabbing bg-rose-50 text-rose-500" : "",
            ].join(" ")}
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            title="Drag task"
            data-drag-handle="true"
            aria-label="Drag task"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
            >
              <circle cx="7" cy="7" r="1.4" />
              <circle cx="12" cy="7" r="1.4" />
              <circle cx="17" cy="7" r="1.4" />
              <circle cx="7" cy="12" r="1.4" />
              <circle cx="12" cy="12" r="1.4" />
              <circle cx="17" cy="12" r="1.4" />
              <circle cx="7" cy="17" r="1.4" />
              <circle cx="12" cy="17" r="1.4" />
              <circle cx="17" cy="17" r="1.4" />
            </svg>
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTask(task);
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            onClick={async (e) => {
              e.stopPropagation();
              if (!window.confirm("Delete this task?")) return;
              await deleteTask(task.id);
              onChanged();
            }}
          >
            Del
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableColumnCard({
  column,
  tasks,
  taskIds,
  onAddTask,
  onRenameColumn,
  onDeleteColumn,
  onChanged,
  onOpenTask,
  isAnyDragging,
  isDropSettling,
}: {
  column: Column;
  tasks: Task[];
  taskIds: string[];
  onAddTask: (columnId: string, content: string) => Promise<void>;
  onRenameColumn: (columnId: string, title: string) => Promise<void>;
  onDeleteColumn: (columnId: string) => void;
  onChanged: () => void;
  onOpenTask: (task: Task) => void;
  isAnyDragging: boolean;
  isDropSettling: boolean;
}) {
  const { over } = useDndContext();
  const sortableId = `col:${column.id}`;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: sortableId });

  const dropId = `col-drop:${column.id}`;
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: dropId });

  // Also highlight the column when hovering over a task inside it.
  const isOverThisColumnViaTask =
    typeof over?.id === "string" &&
    over.id.startsWith("task:") &&
    tasks.some((t) => `task:${t.id}` === over.id);

  const isHighlighted = isOver || isOverThisColumnViaTask;
  const [isAddingTask, setIsAddingTask] = React.useState(false);
  const [newTaskContent, setNewTaskContent] = React.useState("");
  const [isRenamingColumn, setIsRenamingColumn] = React.useState(false);
  const [renameTitle, setRenameTitle] = React.useState(column.title);
  const [isSubmittingInline, setIsSubmittingInline] = React.useState(false);
  const newTaskInputRef = React.useRef<HTMLInputElement | null>(null);
  const renameInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setRenameTitle(column.title);
  }, [column.title]);

  React.useEffect(() => {
    if (!isAddingTask) return;
    const t = window.setTimeout(() => newTaskInputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [isAddingTask]);

  React.useEffect(() => {
    if (!isRenamingColumn) return;
    const t = window.setTimeout(() => renameInputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [isRenamingColumn]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-slate-200 bg-rose-50 p-4 shadow-sm"
      data-column-id={column.id}
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button
            ref={setActivatorNodeRef}
            type="button"
            className={[
              "rounded-md px-1.5 py-1 transition",
              "cursor-grab hover:bg-rose-50",
              "text-slate-400 hover:text-rose-500",
              isDragging ? "cursor-grabbing bg-rose-50 text-rose-500" : "",
            ].join(" ")}
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            title="Drag column"
            aria-label="Drag column"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
            >
              <circle cx="7" cy="7" r="1.4" />
              <circle cx="12" cy="7" r="1.4" />
              <circle cx="17" cy="7" r="1.4" />
              <circle cx="7" cy="12" r="1.4" />
              <circle cx="12" cy="12" r="1.4" />
              <circle cx="17" cy="12" r="1.4" />
              <circle cx="7" cy="17" r="1.4" />
              <circle cx="12" cy="17" r="1.4" />
              <circle cx="17" cy="17" r="1.4" />
            </svg>
          </button>
          <h2
            className="select-none truncate text-sm font-semibold text-slate-900"
            onDoubleClick={() => setIsRenamingColumn(true)}
          >
            {column.title}
          </h2>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-white/70"
            onClick={() => setIsRenamingColumn(true)}
          >
            Rename
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            onClick={() => onDeleteColumn(column.id)}
          >
            Delete
          </button>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 border border-slate-200">
          {tasks.length}
        </span>
      </header>

      {isRenamingColumn ? (
        <div className="mb-3 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 transition-all duration-200">
          <input
            ref={renameInputRef}
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Escape") {
                setIsRenamingColumn(false);
                setRenameTitle(column.title);
              }
              if (e.key === "Enter") {
                e.preventDefault();
                const trimmed = renameTitle.trim();
                if (!trimmed) return;
                setIsSubmittingInline(true);
                try {
                  await onRenameColumn(column.id, trimmed);
                  setIsRenamingColumn(false);
                } finally {
                  setIsSubmittingInline(false);
                }
              }
            }}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setIsRenamingColumn(false);
                setRenameTitle(column.title);
              }}
              disabled={isSubmittingInline}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              onClick={async () => {
                const trimmed = renameTitle.trim();
                if (!trimmed) return;
                setIsSubmittingInline(true);
                try {
                  await onRenameColumn(column.id, trimmed);
                  setIsRenamingColumn(false);
                } finally {
                  setIsSubmittingInline(false);
                }
              }}
              disabled={isSubmittingInline || !renameTitle.trim()}
            >
              Save
            </button>
          </div>
        </div>
      ) : null}

      <div
        ref={setDropRef}
        className={[
          "min-h-[320px] rounded-xl border border-dashed border-slate-200 bg-white/70 p-2",
          isHighlighted ? "ring-1 ring-rose-200 bg-white" : "",
        ].join(" ")}
      >
        <SortableContext id={`tasks:${column.id}`} items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {tasks.map((t) => (
              <SortableTaskCard
                key={t.id}
                task={t}
                onChanged={onChanged}
                onOpenTask={onOpenTask}
                isAnyDragging={isAnyDragging}
                isDropSettling={isDropSettling}
              />
            ))}
            {isAddingTask ? (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200">
                <input
                  ref={newTaskInputRef}
                  value={newTaskContent}
                  onChange={(e) => setNewTaskContent(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Escape") {
                      setIsAddingTask(false);
                      setNewTaskContent("");
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const trimmed = newTaskContent.trim();
                      if (!trimmed) return;
                      setIsSubmittingInline(true);
                      try {
                        await onAddTask(column.id, trimmed);
                        setNewTaskContent("");
                        setIsAddingTask(false);
                      } finally {
                        setIsSubmittingInline(false);
                      }
                    }
                  }}
                  placeholder="Write a task..."
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setIsAddingTask(false);
                      setNewTaskContent("");
                    }}
                    disabled={isSubmittingInline}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    onClick={async () => {
                      const trimmed = newTaskContent.trim();
                      if (!trimmed) return;
                      setIsSubmittingInline(true);
                      try {
                        await onAddTask(column.id, trimmed);
                        setNewTaskContent("");
                        setIsAddingTask(false);
                      } finally {
                        setIsSubmittingInline(false);
                      }
                    }}
                    disabled={isSubmittingInline || !newTaskContent.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="w-full rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                onClick={() => setIsAddingTask(true)}
                type="button"
              >
                + Add task
              </button>
            )}
          </div>
        </SortableContext>
      </div>
    </section>
  );
}

export function Board({ initial, boardId }: { initial: BoardData; boardId: string }) {
  const router = useRouter();
  const [, startTransition] = React.useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeTaskOriginColumnId, setActiveTaskOriginColumnId] = React.useState<string | null>(
    null
  );
  const [isMounted, setIsMounted] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editDueDate, setEditDueDate] = React.useState("");
  const [editLabels, setEditLabels] = React.useState<LabelColor[]>([]);
  const [isSavingTask, setIsSavingTask] = React.useState(false);
  const [isAddingColumn, setIsAddingColumn] = React.useState(false);
  const [newColumnTitle, setNewColumnTitle] = React.useState("");
  const [isSubmittingColumn, setIsSubmittingColumn] = React.useState(false);
  const [isDropSettling, setIsDropSettling] = React.useState(false);
  const [isPersistingPositions, setIsPersistingPositions] = React.useState(false);
  const dropSettleTimerRef = React.useRef<number | null>(null);
  const newColumnInputRef = React.useRef<HTMLInputElement | null>(null);

  const [columns, setColumns] = React.useState<Column[]>(
    [...initial.columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );
  const [tasksByColumn, setTasksByColumn] = React.useState<TasksByColumn>(() =>
    groupTasks(normalizeTasks(initial.tasks))
  );
  const refreshBoard = React.useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition]);

  const atomicRefresh = React.useCallback(() => {
    const nextUrl = `${window.location.pathname}?v=${Date.now()}`;
    router.push(nextUrl);
    router.refresh();
  }, [router]);

  // Keep only columns in sync with server data.
  // Task sync from props is intentionally disabled to avoid drag rollback races.
  React.useEffect(() => {
    const sorted = [...initial.columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setColumns((prev) => (sameColumnOrder(prev, sorted) ? prev : sorted));
    // setTasksByColumn(groupTasks(normalizeTasks(initial.tasks)));
  }, [initial.columns]);

  React.useEffect(() => {
    if (!activeId) return;
    document.body.classList.add("taskflow-dragging");
    return () => document.body.classList.remove("taskflow-dragging");
  }, [activeId]);

  React.useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (dropSettleTimerRef.current != null) {
        window.clearTimeout(dropSettleTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    console.log("tasksByColumn changed", tasksByColumn);
  }, [tasksByColumn]);

  React.useEffect(() => {
    if (!isAddingColumn) return;
    const t = window.setTimeout(() => newColumnInputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [isAddingColumn]);

  React.useEffect(() => {
    if (!isPersistingPositions) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isPersistingPositions]);

  const columnIds = React.useMemo(() => columns.map((c) => `col:${c.id}`), [columns]);

  const tasksIdsForColumn = React.useCallback(
    (columnId: string) => (tasksByColumn[columnId] ?? []).map((t) => `task:${t.id}`),
    [tasksByColumn]
  );

  const onAddTask = async (columnId: string, content: string) => {
    if (!content.trim()) return;
    const created = normalizeTask((await createTask({
      column_id: columnId,
      content: content.trim(),
    })) as Task);

    // Optimistically update UI immediately.
    setTasksByColumn((prev) => {
      const nextList = [...(prev[columnId] ?? []), created].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      return { ...prev, [columnId]: nextList };
    });

    // Also re-fetch to ensure server/source-of-truth consistency.
    refreshBoard();
  };

  const openTaskModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.content ?? "");
    setEditDescription(task.description ?? "");
    setEditDueDate(toDateInputValue(task.due_date));
    setEditLabels(normalizeLabels(task.labels));
  };

  const closeTaskModal = () => {
    setEditingTask(null);
    setEditTitle("");
    setEditDescription("");
    setEditDueDate("");
    setEditLabels([]);
    setIsSavingTask(false);
  };

  const onSaveTask = async () => {
    if (!editingTask) return;
    const content = editTitle.trim();
    if (!content) return;
    setIsSavingTask(true);
    const dueDateValue = editDueDate ? `${editDueDate}T00:00:00.000Z` : null;
    await updateTask(editingTask.id, {
      content,
      description: editDescription.trim() || null,
      due_date: dueDateValue,
      labels: editLabels,
    });
    setTasksByColumn((prev) => {
      const next: TasksByColumn = {};
      for (const [colId, list] of Object.entries(prev)) {
        next[colId] = list.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                content,
                description: editDescription.trim() || null,
                due_date: dueDateValue,
                labels: editLabels,
              }
            : t
        );
      }
      return next;
    });
    closeTaskModal();
    refreshBoard();
  };

  const onAddColumn = async (title: string) => {
    if (!title.trim()) return;
    const created = (await createColumn({ board_id: boardId, title: title.trim() })) as Column;
    setColumns((prev) =>
      [...prev, created].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    );
    setNewColumnTitle("");
    setIsAddingColumn(false);
    refreshBoard();
  };

  const onRenameColumn = async (columnId: string, title: string) => {
    if (!title.trim()) return;
    await renameColumn(columnId, title.trim());
    refreshBoard();
  };

  const onDeleteColumn = async (columnId: string) => {
    if (!window.confirm("Delete this column? (This may also remove its tasks depending on your DB)"))
      return;
    await deleteColumn(columnId);
    refreshBoard();
  };

  const onDragStart = (event: DragStartEvent) => {
    const a = String(event.active.id);
    setActiveId(a);
    if (a.startsWith("task:")) {
      const taskId = a.slice(5);
      let origin: string | null = null;
      for (const col of columns) {
        if ((tasksByColumn[col.id] ?? []).some((t) => String(t.id) === taskId)) {
          origin = col.id;
          break;
        }
      }
      setActiveTaskOriginColumnId(origin);
    } else {
      setActiveTaskOriginColumnId(null);
    }
  };

  const onDragCancel = (_event: DragCancelEvent) => {
    setActiveId(null);
    setActiveTaskOriginColumnId(null);
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const a = String(active.id);
    const o = String(over.id);
    if (!a.startsWith("task:")) return;

    const activeTaskId = a.slice(5);

    setTasksByColumn((prev) => {
      let fromColumnId: string | null = null;
      let toColumnId: string | null = null;

      for (const col of columns) {
        if ((prev[col.id] ?? []).some((t) => String(t.id) === activeTaskId)) fromColumnId = col.id;
        if (o.startsWith("task:") && (prev[col.id] ?? []).some((t) => `task:${t.id}` === o)) {
          toColumnId = col.id;
        }
      }

      if (o.startsWith("col-drop:")) toColumnId = o.slice(9);
      if (o.startsWith("col:")) toColumnId = o.slice(4);
      if (!fromColumnId || !toColumnId || fromColumnId === toColumnId) return prev;

      const fromList = [...(prev[fromColumnId] ?? [])];
      const toList = [...(prev[toColumnId] ?? [])];
      const movingIdx = fromList.findIndex((t) => String(t.id) === activeTaskId);
      if (movingIdx < 0) return prev;

      const [moving] = fromList.splice(movingIdx, 1);
      if (toList.some((t) => String(t.id) === activeTaskId)) return prev;

      if (o.startsWith("task:")) {
        const overIdx = toList.findIndex((t) => `task:${t.id}` === o);
        const overRect = event.over?.rect;
        const pointerY = getPointerY(event);
        const overCenterY =
          overRect ? overRect.top + overRect.height / 2 : null;
        const isBelowCenter =
          pointerY !== null && overCenterY !== null ? pointerY > overCenterY : isBelowOverMidline(event);
        const baseIndex = overIdx < 0 ? toList.length : overIdx;
        const insertAt = isBelowCenter ? Math.min(baseIndex + 1, toList.length) : baseIndex;
        toList.splice(insertAt, 0, { ...moving, column_id: toColumnId });
      } else if (o.startsWith("col:")) {
        // Column fallback:
        // - empty column => index 0
        // - non-empty column => near top => 0, otherwise end
        if (toList.length === 0) {
          toList.splice(0, 0, { ...moving, column_id: toColumnId });
        } else {
          const pointerY = getPointerY(event);
          const overTop = event.over?.rect.top;
          const nearTop =
            pointerY !== null && typeof overTop === "number" && pointerY <= overTop + 56;
          if (nearTop) {
            toList.splice(0, 0, { ...moving, column_id: toColumnId });
          } else {
            toList.push({ ...moving, column_id: toColumnId });
          }
        }
      } else {
        const pointerY = getPointerY(event);
        const overTop = event.over?.rect.top;
        const isNearTop =
          pointerY !== null && typeof overTop === "number" && pointerY <= overTop + 56;
        if (isNearTop) {
          toList.splice(0, 0, { ...moving, column_id: toColumnId });
        } else {
          toList.push({ ...moving, column_id: toColumnId });
        }
      }

      return {
        ...prev,
        [fromColumnId]: reorderOrders(fromList).map((t) => ({ ...t, column_id: fromColumnId })),
        [toColumnId]: reorderOrders(toList).map((t) => ({ ...t, column_id: toColumnId })),
      };
    });
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const a = String(active.id);
    const o = over ? String(over.id) : null;
    const originColumnId = activeTaskOriginColumnId;
    setActiveId(null);
    setActiveTaskOriginColumnId(null);
    if (!over) return;

    if (!o) return;
    if (a === o) return;

    // Column reorder
    if (a.startsWith("col:") && o.startsWith("col:")) {
      const activeId = a.slice(4);
      const overId = o.slice(4);
      const oldIndex = columns.findIndex((c) => c.id === activeId);
      const newIndex = columns.findIndex((c) => c.id === overId);
      if (oldIndex < 0 || newIndex < 0) return;

      const next = reorderOrders(arrayMove(columns, oldIndex, newIndex));
      setColumns(next);
      setIsPersistingPositions(true);
      try {
        await persistColumnOrder(next.map((c) => ({ id: c.id, order: c.order })));
        // Let Supabase settle concurrent task position writes before refresh.
        await sleep(120);
        atomicRefresh();
      } finally {
        setIsPersistingPositions(false);
      }
      return;
    }

    // Task drop persist:
    // Recalculate one final state locally, lock UI once, then persist that exact state.
    if (a.startsWith("task:")) {
      if (dropSettleTimerRef.current != null) window.clearTimeout(dropSettleTimerRef.current);
      setIsDropSettling(true);
      const activeTaskId = a.slice(5);
      const base = tasksByColumn;
      const sourceColumnId =
        columns.find((col) => (base[col.id] ?? []).some((t) => String(t.id) === activeTaskId))
          ?.id ??
        originColumnId ??
        null;
      if (!sourceColumnId) return;

      let destinationColumnId: string | null = null;
      if (o.startsWith("task:")) {
        const overTaskId = o.slice(5);
        destinationColumnId =
          columns.find((col) => (base[col.id] ?? []).some((t) => String(t.id) === overTaskId))?.id ??
          null;
      } else if (o.startsWith("col-drop:")) {
        destinationColumnId = o.slice(9);
      } else if (o.startsWith("col:")) {
        destinationColumnId = o.slice(4);
      }
      if (!destinationColumnId) return;

      const touchedColumnIds = new Set<string>([sourceColumnId, destinationColumnId]);
      const finalState: TasksByColumn = { ...base };

      if (sourceColumnId === destinationColumnId) {
        const list = [...(base[sourceColumnId] ?? [])];
        const oldIndex = list.findIndex((t) => String(t.id) === activeTaskId);
        if (oldIndex < 0) return;

        let newIndex = oldIndex;
        if (o.startsWith("task:")) {
          const overTaskId = o.slice(5);
          const overIndex = list.findIndex((t) => String(t.id) === overTaskId);
          if (overIndex < 0) return;
          newIndex = overIndex;
        } else if (o.startsWith("col:")) {
          newIndex = 0;
        } else if (o.startsWith("col-drop:")) {
          newIndex = list.length - 1;
        }

        const moved = arrayMove(list, oldIndex, Math.max(0, Math.min(newIndex, list.length - 1)));
        finalState[sourceColumnId] = reorderOrders(moved).map((t) => ({
          ...t,
          id: String(t.id),
          column_id: sourceColumnId,
        }));
      } else {
        const sourceTasks = [...(base[sourceColumnId] ?? [])];
        const destinationTasks = [...(base[destinationColumnId] ?? [])];
        const movingIdx = sourceTasks.findIndex((t) => String(t.id) === activeTaskId);
        if (movingIdx < 0) return;
        const [moving] = sourceTasks.splice(movingIdx, 1);

        let insertAt = destinationTasks.length;
        if (o.startsWith("task:")) {
          const overTaskId = o.slice(5);
          const overIdx = destinationTasks.findIndex((t) => String(t.id) === overTaskId);
          insertAt = overIdx < 0 ? destinationTasks.length : overIdx;
        } else if (o.startsWith("col:")) {
          insertAt = 0;
        } else if (o.startsWith("col-drop:")) {
          insertAt = destinationTasks.length;
        }
        destinationTasks.splice(Math.max(0, Math.min(insertAt, destinationTasks.length)), 0, {
          ...moving,
          column_id: destinationColumnId,
        });

        finalState[sourceColumnId] = reorderOrders(sourceTasks).map((t) => ({
          ...t,
          id: String(t.id),
          column_id: sourceColumnId,
        }));
        finalState[destinationColumnId] = reorderOrders(destinationTasks).map((t) => ({
          ...t,
          id: String(t.id),
          column_id: destinationColumnId,
        }));
      }

      setTasksByColumn({ ...finalState });
      dropSettleTimerRef.current = window.setTimeout(() => {
        setIsDropSettling(false);
      }, 140);

      const finalTasks = [...touchedColumnIds].flatMap((colId) =>
        ((finalState[colId] ?? []) as Task[]).map((t, idx) => ({
          id: String(t.id),
          column_id: String(colId),
          order: idx,
        }))
      );
      console.log("[onDragEnd] finalTasks(recalculated)", finalTasks);
      const titleById = new Map<string, string>();
      for (const [colId, list] of Object.entries(finalState)) {
        for (const task of list) {
          titleById.set(
            String(task.id),
            `${String(task.content ?? "").trim() || "(empty)"}`
          );
        }
      }
      console.table(
        finalTasks.map((t) => ({
          title: titleById.get(String(t.id)) ?? "(unknown)",
          newColumn: t.column_id,
          newOrder: t.order,
        }))
      );
      const perColumnOrders = new Map<string, Set<number>>();
      for (const row of finalTasks) {
        const key = row.column_id;
        const orders = perColumnOrders.get(key) ?? new Set<number>();
        if (orders.has(row.order)) {
          console.error("Duplicate order detected in payload", row);
          return;
        }
        orders.add(row.order);
        perColumnOrders.set(key, orders);
      }

      setIsPersistingPositions(true);
      try {
        const result = await persistTaskPositions(finalTasks);
        if (!result?.success) {
          throw new Error("persistTaskPositions did not confirm success");
        }
        // Task move stays local-first; avoid hard refresh here.
        atomicRefresh();
      } finally {
        setIsPersistingPositions(false);
      }
      return;
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-[#f4f4f5] p-4 shadow-sm">
      <div className="mb-6 flex items-end justify-end gap-4">
        <div className="flex items-center gap-3">
          {isPersistingPositions ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" />
              Saving...
            </div>
          ) : null}
          {isAddingColumn ? (
            <div className="w-72 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition-all duration-200">
              <input
                ref={newColumnInputRef}
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Escape") {
                    setIsAddingColumn(false);
                    setNewColumnTitle("");
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = newColumnTitle.trim();
                    if (!trimmed) return;
                    setIsSubmittingColumn(true);
                    try {
                      await onAddColumn(trimmed);
                    } finally {
                      setIsSubmittingColumn(false);
                    }
                  }
                }}
                placeholder="Column title"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setIsAddingColumn(false);
                    setNewColumnTitle("");
                  }}
                  disabled={isSubmittingColumn}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  onClick={async () => {
                    const trimmed = newColumnTitle.trim();
                    if (!trimmed) return;
                    setIsSubmittingColumn(true);
                    try {
                      await onAddColumn(trimmed);
                    } finally {
                      setIsSubmittingColumn(false);
                    }
                  }}
                  disabled={isSubmittingColumn || !newColumnTitle.trim()}
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              onClick={() => setIsAddingColumn(true)}
            >
              + Add column
            </button>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragCancel={onDragCancel}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          key={`columns-${columnIds.join(",")}`}
          id="columns"
          items={columnIds}
          strategy={horizontalListSortingStrategy}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {columns.map((col) => (
              <SortableColumnCard
                key={`${col.id}:${col.order ?? 0}`}
                column={col}
                tasks={tasksByColumn[col.id] ?? []}
                taskIds={tasksIdsForColumn(col.id)}
                onAddTask={onAddTask}
                onRenameColumn={onRenameColumn}
                onDeleteColumn={onDeleteColumn}
                onChanged={refreshBoard}
                onOpenTask={openTaskModal}
                isAnyDragging={Boolean(activeId)}
                isDropSettling={isDropSettling}
              />
            ))}
          </div>
        </SortableContext>
        {isMounted
          ? createPortal(
              <DragOverlay dropAnimation={null} adjustScale={false}>
                {activeId?.startsWith("task:") ? (
                  <div className="cursor-grabbing m-0" style={{ pointerEvents: "none", margin: 0 }}>
                    <TaskCardVisual
                      task={(() => {
                        const taskId = activeId.slice(5);
                        for (const colId of Object.keys(tasksByColumn)) {
                          const t = (tasksByColumn[colId] ?? []).find((x) => String(x.id) === taskId);
                          if (t) return t;
                        }
                        // Fallback; shouldn't happen, but keeps overlay stable.
                        return {
                          id: taskId,
                          column_id: "",
                          content: "",
                          description: null,
                          order: 0,
                        } satisfies Task;
                      })()}
                      isOverlay
                    />
                  </div>
                ) : null}
              </DragOverlay>,
              document.body
            )
          : null}
      </DndContext>
      {editingTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-xl font-semibold tracking-tight text-zinc-900">Edit Task</h3>
              <p className="text-sm text-zinc-500">Update title and description.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Title
                </label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-lg font-medium text-zinc-900 outline-none focus:border-zinc-400"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400"
                  placeholder="Add more context..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Labels
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {LABEL_COLORS.map((label) => {
                      const active = editLabels.includes(label);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() =>
                            setEditLabels((prev) =>
                              prev.includes(label)
                                ? prev.filter((l) => l !== label)
                                : [...prev, label]
                            )
                          }
                          className={[
                            "h-6 w-6 rounded-full border-2 transition",
                            LABEL_CLASS[label],
                            active ? "border-zinc-900 scale-110" : "border-transparent opacity-70",
                          ].join(" ")}
                          title={label}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                onClick={closeTaskModal}
                disabled={isSavingTask}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                onClick={onSaveTask}
                disabled={isSavingTask || !editTitle.trim()}
              >
                {isSavingTask ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

