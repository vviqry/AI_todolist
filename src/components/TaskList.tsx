"use client";

import React, { useState } from "react";
import { ClipboardList, CheckCircle, ChevronDown } from "lucide-react";
import TaskItem from "@/components/TaskItem";
import type { Task } from "@/store/taskStore";
import { useTaskStore } from "@/store/taskStore";
import { getPeriodKey, RecurringConfig, isTaskActiveOnDate } from "@/lib/recurringUtils";

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (task: Task) => void;
  onToggleSubtask: (task: Task, subtaskId: string) => void;
  onToggleRecurringInstance: (task: Task, periodKey: string, index: number) => void;
  onDelete: (taskId: string) => void;
  onEditTask: (taskId: string, newText: string) => void;
  onEditSubtask: (task: Task, subtaskId: string, newText: string) => void;
  onUpdateRecurringConfig?: (taskId: string, config: RecurringConfig | null) => void;
}

export default function TaskList({
  tasks,
  onToggleComplete,
  onToggleSubtask,
  onToggleRecurringInstance,
  onDelete,
  onEditTask,
  onEditSubtask,
  onUpdateRecurringConfig,
}: TaskListProps) {
  const recurringInstances = useTaskStore((s) => s.recurringInstances);
  const [isDoneOpen, setIsDoneOpen] = useState(false);

  // Helper to check if task is completed in its current state/period
  const isTaskCompleted = (task: Task): boolean => {
    if (!task.recurringConfig?.isRecurring) {
      return task.isCompleted;
    }

    const frequency = task.recurringConfig.frequency || "daily";
    const periodKey = getPeriodKey(frequency);
    const instanceDoc = recurringInstances[task.id]?.[periodKey];
    const targetCount = instanceDoc?.targetCount || task.recurringConfig.targetCount || 1;
    const completedIndices = instanceDoc?.completedIndices || [];

    return completedIndices.length >= targetCount;
  };

  // Filter tasks that are currently active (e.g. not past end date)
  const activeTasks = tasks.filter((t) => isTaskActiveOnDate(t.recurringConfig));

  const todoTasks = activeTasks.filter((t) => !isTaskCompleted(t));
  const doneTasks = activeTasks.filter((t) => isTaskCompleted(t));

  return (
    <>
      {/* ===== To Do Section ===== */}
      <section className="todo-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-icon">📋</span>
            To Do
            <span className="task-count">{todoTasks.length}</span>
          </h2>
        </div>
        <div className="task-list">
          {todoTasks.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={48} strokeWidth={1.5} className="mx-auto mb-4 opacity-50" />
              <p>Belum ada tugas</p>
              <span>Tambahkan tugas baru di atas</span>
            </div>
          ) : (
            todoTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onToggleSubtask={onToggleSubtask}
                onToggleRecurringInstance={onToggleRecurringInstance}
                onDelete={onDelete}
                onEditTask={onEditTask}
                onEditSubtask={onEditSubtask}
                onUpdateRecurringConfig={onUpdateRecurringConfig}
              />
            ))
          )}
        </div>
      </section>

      {/* ===== Selesai Section (Collapsible) ===== */}
      <section className="done-section">
        <button
          type="button"
          className="section-header done-toggle-header"
          onClick={() => setIsDoneOpen((prev) => !prev)}
          aria-expanded={isDoneOpen}
        >
          <h2 className="section-title">
            <span className="title-icon">✅</span>
            Selesai
            <span className="task-count done-count">{doneTasks.length}</span>
          </h2>
          <div className="done-toggle-action">
            <span className="done-toggle-hint">
              {isDoneOpen ? "Tutup" : "Lihat"}
            </span>
            <ChevronDown
              size={18}
              className={`done-chevron-icon ${isDoneOpen ? "rotated" : ""}`}
            />
          </div>
        </button>

        <div className={`collapsible-wrapper ${isDoneOpen ? "open" : "collapsed"}`}>
          <div className="collapsible-inner">
            <div className="task-list done-task-list">
              {doneTasks.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle size={44} strokeWidth={1.5} className="mx-auto mb-3 opacity-40" />
                  <p>Belum ada tugas selesai</p>
                  <span>Selesaikan target tugas untuk memindahkannya ke sini</span>
                </div>
              ) : (
                doneTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggleComplete={onToggleComplete}
                    onToggleSubtask={onToggleSubtask}
                    onToggleRecurringInstance={onToggleRecurringInstance}
                    onDelete={onDelete}
                    onEditTask={onEditTask}
                    onEditSubtask={onEditSubtask}
                    onUpdateRecurringConfig={onUpdateRecurringConfig}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

