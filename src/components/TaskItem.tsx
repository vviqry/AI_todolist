"use client";

import React, { useState, useRef, useEffect } from "react";
import { Trash2, ChevronDown, Pencil, Check, X } from "lucide-react";
import type { Task } from "@/store/taskStore";

interface TaskItemProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onToggleSubtask: (task: Task, subtaskId: string) => void;
  onDelete: (taskId: string) => void;
  onEditTask: (taskId: string, newText: string) => void;
  onEditSubtask: (task: Task, subtaskId: string, newText: string) => void;
}

// ===== Date Formatting =====
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatTaskDate(timestamp: number | null): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} - ${hh}:${mm}`;
}

function getProgress(task: Task): number {
  if (task.isCompleted) return 100;
  if (task.subtasks.length === 0) return 0;
  const done = task.subtasks.filter((st) => st.isDone).length;
  return Math.round((done / task.subtasks.length) * 100);
}

// ===== Inline Edit Hook =====
function useInlineEdit(
  initialValue: string,
  onSave: (value: string) => void
) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialValue);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(initialValue);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing, initialValue]);

  const startEdit = () => setEditing(true);

  const confirmEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== initialValue) {
      onSave(trimmed);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(initialValue);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      confirmEdit();
    }
    if (e.key === "Escape") {
      cancelEdit();
    }
  };

  return { editing, draft, setDraft, inputRef, startEdit, confirmEdit, cancelEdit, handleKeyDown };
}

// ===== Component =====
export default function TaskItem({
  task,
  onToggleComplete,
  onToggleSubtask,
  onDelete,
  onEditTask,
  onEditSubtask,
}: TaskItemProps) {
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isCompleted = task.isCompleted;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const progress = getProgress(task);


  // Progress bar color
  let progressColorClass = "progress-active";
  if (progress === 100) progressColorClass = "progress-done";
  if (progress === 0 && !hasSubtasks) progressColorClass = "progress-empty";

  const taskEdit = useInlineEdit(task.text, (newText) =>
    onEditTask(task.id, newText)
  );

  const handleDelete = () => {
    setRemoving(true);
    setTimeout(() => onDelete(task.id), 300);
  };

  return (
    <div
      className={`task-item ${isCompleted ? "completed" : ""} ${hasSubtasks ? "has-subtasks" : ""} ${removing ? "removing" : ""}`}
      style={{ animation: removing ? "fadeOut 0.3s ease forwards" : undefined }}
    >
      <div className="task-item-header">
        {/* Checkbox: Only show if no subtasks */}
        {hasSubtasks ? (
          <div className="checkbox-wrapper checkbox-placeholder" />
        ) : (
          <div className="checkbox-wrapper">
            <input
              type="checkbox"
              className="task-checkbox"
              checked={isCompleted}
              onChange={() => onToggleComplete(task)}
            />
          </div>
        )}

        <div className="task-content">
          {taskEdit.editing ? (
            /* ---- Edit Mode: Task Title ---- */
            <div className="inline-edit-wrapper">
              <textarea
                ref={taskEdit.inputRef as React.RefObject<HTMLTextAreaElement>}
                className="inline-edit-input"
                value={taskEdit.draft}
                rows={2}
                onChange={(e) => taskEdit.setDraft(e.target.value)}
                onKeyDown={taskEdit.handleKeyDown}
                onBlur={taskEdit.confirmEdit}
              />
              <div className="inline-edit-actions">
                <button
                  type="button"
                  className="inline-confirm-btn"
                  onMouseDown={(e) => { e.preventDefault(); taskEdit.confirmEdit(); }}
                  title="Simpan"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  className="inline-cancel-btn"
                  onMouseDown={(e) => { e.preventDefault(); taskEdit.cancelEdit(); }}
                  title="Batal"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : (
            /* ---- View Mode: Task Title ---- */
            <div
              className="task-text-row"
              onDoubleClick={() => !isCompleted && taskEdit.startEdit()}
            >
              <p className="task-text">{task.text}</p>
              {!isCompleted && (
                <button
                  type="button"
                  className="edit-inline-btn"
                  onClick={taskEdit.startEdit}
                  title="Edit judul"
                >
                  <Pencil size={13} />
                </button>
              )}
            </div>
          )}

          <div className="task-meta">
            <span className="task-date">
              {formatTaskDate(isCompleted ? task.completedAt : task.createdAt)}
            </span>
            <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
          </div>
        </div>

        <div className="task-actions">
          <button className="delete-btn" onClick={handleDelete} title="Hapus tugas">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* ---- Subtask Dropdown ---- */}
      {hasSubtasks && (
        <div className="subtask-dropdown">
          <button
            type="button"
            className="subtask-toggle-btn"
            onClick={() => setSubtasksOpen(!subtasksOpen)}
          >
            <ChevronDown
              size={14}
              className={`chevron-icon ${subtasksOpen ? "rotated" : ""}`}
            />
            <span className="subtask-summary">
              {task.subtasks.filter((s) => s.isDone).length}/{task.subtasks.length} sub-tugas selesai
            </span>
          </button>

          <div className={`subtask-list ${subtasksOpen ? "" : "collapsed"}`}>
            {task.subtasks.map((st) => (
              <SubtaskRow
                key={st.id}
                text={st.text}
                isDone={st.isDone}
                isParentCompleted={isCompleted}
                onToggle={() => onToggleSubtask(task, st.id)}
                onSave={(newText) => onEditSubtask(task, st.id, newText)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- Progress Bar ---- */}
      <div className="progress-bar-container">
        <div
          className={`progress-bar-fill ${progressColorClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="progress-label">
        <span>{progress}%</span>
      </div>
    </div>
  );
}

// ===== SubtaskRow sub-component =====
interface SubtaskRowProps {
  text: string;
  isDone: boolean;
  isParentCompleted: boolean;
  onToggle: () => void;
  onSave: (newText: string) => void;
}

function SubtaskRow({ text, isDone, isParentCompleted, onToggle, onSave }: SubtaskRowProps) {
  const edit = useInlineEdit(text, onSave);

  return (
    <div className="subtask-item">
      <div className="subtask-checkbox-wrapper">
        <input
          type="checkbox"
          className="subtask-checkbox"
          checked={isDone}
          disabled={isParentCompleted}
          onChange={onToggle}
        />
      </div>

      {edit.editing ? (
        /* ---- Edit Mode: Subtask ---- */
        <div className="inline-edit-wrapper inline-edit-subtask">
          <input
            ref={edit.inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            className="inline-edit-input-sm"
            value={edit.draft}
            onChange={(e) => edit.setDraft(e.target.value)}
            onKeyDown={edit.handleKeyDown}
            onBlur={edit.confirmEdit}
          />
          <div className="inline-edit-actions">
            <button
              type="button"
              className="inline-confirm-btn"
              onMouseDown={(e) => { e.preventDefault(); edit.confirmEdit(); }}
              title="Simpan"
            >
              <Check size={11} />
            </button>
            <button
              type="button"
              className="inline-cancel-btn"
              onMouseDown={(e) => { e.preventDefault(); edit.cancelEdit(); }}
              title="Batal"
            >
              <X size={11} />
            </button>
          </div>
        </div>
      ) : (
        /* ---- View Mode: Subtask ---- */
        <div
          className="subtask-text-row"
          onDoubleClick={() => !isParentCompleted && !isDone && edit.startEdit()}
        >
          <span className={`subtask-text ${isDone ? "subtask-done" : ""}`}>
            {text}
          </span>
          {!isParentCompleted && !isDone && (
            <button
              type="button"
              className="edit-inline-btn edit-inline-btn-sm"
              onClick={edit.startEdit}
              title="Edit sub-tugas"
            >
              <Pencil size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
