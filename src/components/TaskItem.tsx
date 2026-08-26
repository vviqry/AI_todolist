"use client";

import React, { useState, useRef } from "react";
import { Trash2, ChevronDown, Pencil, Check, X, Repeat, CheckCircle2 } from "lucide-react";
import type { Task } from "@/store/taskStore";
import { useTaskStore } from "@/store/taskStore";
import {
  getPeriodKey,
  getPeriodDisplayLabel,
  getFrequencyLabel,
  getTargetUnitLabel,
  getRecurringMetrics,
  RecurringConfig,
} from "@/lib/recurringUtils";

interface TaskItemProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onToggleSubtask: (task: Task, subtaskId: string) => void;
  onToggleRecurringInstance: (task: Task, periodKey: string, index: number) => void;
  onDelete: (taskId: string) => void;
  onEditTask: (taskId: string, newText: string) => void;
  onEditSubtask: (task: Task, subtaskId: string, newText: string) => void;
  onUpdateRecurringConfig?: (taskId: string, config: RecurringConfig | null) => void;
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

// ===== Component =====
export default function TaskItem({
  task,
  onToggleComplete,
  onToggleSubtask,
  onToggleRecurringInstance,
  onDelete,
  onEditTask,
  onEditSubtask,
}: TaskItemProps) {
  const isRecurring = !!task.recurringConfig?.isRecurring;
  const frequency = task.recurringConfig?.frequency || "daily";
  const currentPeriodKey = getPeriodKey(frequency);

  // Subscribe to recurring instance doc for this period
  const instanceDoc = useTaskStore(
    (s) => s.recurringInstances[task.id]?.[currentPeriodKey]
  );

  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [instancesOpen, setInstancesOpen] = useState(true); // Default open for recurring
  const [removing, setRemoving] = useState(false);

  // Task inline editing state
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [taskDraft, setTaskDraft] = useState(task.text);
  const taskInputRef = useRef<HTMLTextAreaElement>(null);

  const handleStartEditTask = () => {
    setTaskDraft(task.text);
    setIsEditingTask(true);
    setTimeout(() => taskInputRef.current?.focus(), 0);
  };

  const handleConfirmEditTask = () => {
    const trimmed = taskDraft.trim();
    if (trimmed && trimmed !== task.text) {
      onEditTask(task.id, trimmed);
    }
    setIsEditingTask(false);
  };

  const handleCancelEditTask = () => {
    setTaskDraft(task.text);
    setIsEditingTask(false);
  };

  const handleTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleConfirmEditTask();
    } else if (e.key === "Escape") {
      handleCancelEditTask();
    }
  };

  // Metrics calculation
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const targetCount = instanceDoc?.targetCount || task.recurringConfig?.targetCount || 1;
  const completedIndices = instanceDoc?.completedIndices || [];

  const recurringMetrics = getRecurringMetrics(targetCount, completedIndices);

  let isCompleted = task.isCompleted;
  let progress = 0;

  if (isRecurring) {
    isCompleted = recurringMetrics.isCompleted;
    progress = recurringMetrics.percent;
  } else {
    if (task.isCompleted) {
      progress = 100;
    } else if (hasSubtasks) {
      const done = task.subtasks.filter((st) => st.isDone).length;
      progress = Math.round((done / task.subtasks.length) * 100);
    } else {
      progress = 0;
    }
  }

  // Progress bar color
  let progressColorClass = "progress-active";
  if (progress === 100) progressColorClass = "progress-done";
  if (progress === 0 && !hasSubtasks && !isRecurring) progressColorClass = "progress-empty";

  const handleDelete = () => {
    setRemoving(true);
    setTimeout(() => onDelete(task.id), 300);
  };

  const periodLabel = getPeriodDisplayLabel(frequency, currentPeriodKey);

  return (
    <div
      className={`task-item ${isCompleted ? "completed" : ""} ${hasSubtasks || isRecurring ? "has-subtasks" : ""} ${removing ? "removing" : ""} ${isRecurring ? "is-recurring-item" : ""}`}
      style={{ animation: removing ? "fadeOut 0.3s ease forwards" : undefined }}
    >
      <div className="task-item-header">
        {/* Checkbox */}
        <div className="checkbox-wrapper">
          <input
            type="checkbox"
            className="task-checkbox"
            checked={isCompleted}
            onChange={() => onToggleComplete(task)}
            title={isRecurring ? "Selesaikan / reset target periode ini" : "Tandai selesai"}
          />
        </div>

        <div className="task-content">
          {isEditingTask ? (
            /* ---- Edit Mode: Task Title ---- */
            <div className="inline-edit-wrapper">
              <textarea
                ref={taskInputRef}
                className="inline-edit-input"
                value={taskDraft}
                rows={2}
                onChange={(e) => setTaskDraft(e.target.value)}
                onKeyDown={handleTaskKeyDown}
                onBlur={handleConfirmEditTask}
              />
              <div className="inline-edit-actions">
                <button
                  type="button"
                  className="inline-confirm-btn"
                  onMouseDown={(e) => { e.preventDefault(); handleConfirmEditTask(); }}
                  title="Simpan"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  className="inline-cancel-btn"
                  onMouseDown={(e) => { e.preventDefault(); handleCancelEditTask(); }}
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
              onDoubleClick={() => !isCompleted && handleStartEditTask()}
            >
              <div className="task-text-container">
                <p className="task-text">{task.text}</p>
                {isRecurring && (
                  <span className="recurring-badge">
                    <Repeat size={11} className="spin-slow" />
                    {getFrequencyLabel(frequency)} • {targetCount}x / {getTargetUnitLabel(frequency)}
                  </span>
                )}
              </div>

              {!isCompleted && (
                <button
                  type="button"
                  className="edit-inline-btn"
                  onClick={handleStartEditTask}
                  title="Edit judul"
                >
                  <Pencil size={13} />
                </button>
              )}
            </div>
          )}

          {/* Meta Information */}
          <div className="task-meta">
            <span className="task-date">
              {isRecurring ? (
                <span className="recurring-period-info">
                  <strong>{periodLabel}</strong>
                  <span className="recurring-progress-summary">
                    {recurringMetrics.completedCount} / {recurringMetrics.targetCount} selesai
                  </span>
                  {recurringMetrics.isCompleted && (
                    <span className="recurring-complete-check">
                      <CheckCircle2 size={13} /> Target {periodLabel.toLowerCase()} selesai
                    </span>
                  )}
                </span>
              ) : (
                formatTaskDate(isCompleted ? task.completedAt : task.createdAt)
              )}
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

      {/* ---- Recurring Instances Checklist ---- */}
      {isRecurring && (
        <div className="recurring-instances-dropdown">
          <button
            type="button"
            className="subtask-toggle-btn"
            onClick={() => setInstancesOpen(!instancesOpen)}
          >
            <ChevronDown
              size={14}
              className={`chevron-icon ${instancesOpen ? "rotated" : ""}`}
            />
            <span className="subtask-summary">
              Target {periodLabel} ({recurringMetrics.completedCount}/{recurringMetrics.targetCount} selesai)
            </span>
          </button>

          <div className={`subtask-list ${instancesOpen ? "" : "collapsed"}`}>
            {Array.from({ length: targetCount }, (_, i) => i + 1).map((idx) => {
              const isInstanceDone = completedIndices.includes(idx);
              return (
                <div key={idx} className="subtask-item recurring-instance-item">
                  <div className="subtask-checkbox-wrapper">
                    <input
                      type="checkbox"
                      id={`rec-${task.id}-${idx}`}
                      className="subtask-checkbox"
                      checked={isInstanceDone}
                      onChange={() => onToggleRecurringInstance(task, currentPeriodKey, idx)}
                    />
                  </div>
                  <label
                    htmlFor={`rec-${task.id}-${idx}`}
                    className="subtask-text-row cursor-pointer"
                  >
                    <span className={`subtask-text ${isInstanceDone ? "subtask-done" : ""}`}>
                      {task.text} #{idx}
                    </span>
                    {isInstanceDone && (
                      <span className="instance-done-badge">Selesai</span>
                    )}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Regular Subtask Dropdown (if has subtasks) ---- */}
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
        {isRecurring ? (
          <span>
            {recurringMetrics.completedCount} / {recurringMetrics.targetCount} ({progress}%)
          </span>
        ) : (
          <span>{progress}%</span>
        )}
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
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = () => {
    setDraft(text);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleConfirmEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== text) {
      onSave(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setDraft(text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirmEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

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

      {isEditing ? (
        /* ---- Edit Mode: Subtask ---- */
        <div className="inline-edit-wrapper inline-edit-subtask">
          <input
            ref={inputRef}
            type="text"
            className="inline-edit-input-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleConfirmEdit}
          />
          <div className="inline-edit-actions">
            <button
              type="button"
              className="inline-confirm-btn"
              onMouseDown={(e) => { e.preventDefault(); handleConfirmEdit(); }}
              title="Simpan"
            >
              <Check size={11} />
            </button>
            <button
              type="button"
              className="inline-cancel-btn"
              onMouseDown={(e) => { e.preventDefault(); handleCancelEdit(); }}
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
          onDoubleClick={() => !isParentCompleted && !isDone && handleStartEdit()}
        >
          <span className={`subtask-text ${isDone ? "subtask-done" : ""}`}>
            {text}
          </span>
          {!isParentCompleted && !isDone && (
            <button
              type="button"
              className="edit-inline-btn edit-inline-btn-sm"
              onClick={handleStartEdit}
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
