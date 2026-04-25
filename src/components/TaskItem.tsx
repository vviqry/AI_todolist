"use client";

import React, { useState } from "react";
import { Trash2, ChevronDown } from "lucide-react";
import type { Task } from "@/store/taskStore";

interface TaskItemProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onToggleSubtask: (task: Task, subtaskId: string) => void;
  onDelete: (taskId: string) => void;
}

// Date formatting
const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function formatTaskDate(timestamp: number | null) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} - ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getProgress(task: Task): number {
  if (task.isCompleted) return 100;
  if (task.subtasks.length === 0) return 0;
  const done = task.subtasks.filter((st) => st.isDone).length;
  return Math.round((done / task.subtasks.length) * 100);
}

export default function TaskItem({ task, onToggleComplete, onToggleSubtask, onDelete }: TaskItemProps) {
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isCompleted = task.isCompleted;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const progress = getProgress(task);
  const overdueThreshold = 24 * 60 * 60 * 1000;
  const isOverdue = !isCompleted && (Date.now() - task.createdAt > overdueThreshold);

  // Progress bar color
  let progressColorClass = "progress-active";
  if (progress === 100) progressColorClass = "progress-done";
  if (progress === 0 && !hasSubtasks) progressColorClass = "progress-empty";

  const handleDelete = () => {
    setRemoving(true);
    setTimeout(() => onDelete(task.id), 300);
  };

  return (
    <div
      className={`task-item ${isCompleted ? "completed" : ""} ${isOverdue ? "overdue" : ""} ${hasSubtasks ? "has-subtasks" : ""} ${removing ? "removing" : ""}`}
      style={{ animation: removing ? "fadeOut 0.3s ease forwards" : undefined }}
    >
      <div className="task-item-header">
        {/* Checkbox: Only show if no subtasks */}
        {hasSubtasks ? (
          <div className="checkbox-wrapper checkbox-placeholder"></div>
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
          <p className="task-text">{task.text}</p>
          <div className="task-meta">
            <span className="task-date">
              {formatTaskDate(isCompleted ? task.completedAt : task.createdAt)}
            </span>
            <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
          </div>
        </div>

        <div className="task-actions">
          <button className="delete-btn" onClick={handleDelete}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Subtask Dropdown */}
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
              style={{ transition: "transform 0.3s ease" }}
            />
            <span className="subtask-summary">
              {task.subtasks.filter((s) => s.isDone).length}/{task.subtasks.length} sub-tugas selesai
            </span>
          </button>
          <div className={`subtask-list ${subtasksOpen ? "" : "collapsed"}`}>
            {task.subtasks.map((st) => (
              <div key={st.id} className="subtask-item">
                <div className="subtask-checkbox-wrapper">
                  <input
                    type="checkbox"
                    className="subtask-checkbox"
                    checked={st.isDone}
                    disabled={isCompleted}
                    onChange={() => onToggleSubtask(task, st.id)}
                  />
                </div>
                <span className={`subtask-text ${st.isDone ? "subtask-done" : ""}`}>
                  {st.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div
          className={`progress-bar-fill ${progressColorClass}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="progress-label">
        <span>{progress}%</span>
      </div>
    </div>
  );
}
