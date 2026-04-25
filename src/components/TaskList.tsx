"use client";

import React from "react";
import { ClipboardList, CheckCircle } from "lucide-react";
import TaskItem from "@/components/TaskItem";
import type { Task } from "@/store/taskStore";

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (task: Task) => void;
  onToggleSubtask: (task: Task, subtaskId: string) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskList({ tasks, onToggleComplete, onToggleSubtask, onDelete }: TaskListProps) {
  const todoTasks = tasks.filter((t) => !t.isCompleted);
  const doneTasks = tasks.filter((t) => t.isCompleted);

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
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </section>

      {/* ===== Done Section ===== */}
      <section className="done-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-icon">✅</span>
            Done
            <span className="task-count done-count">{doneTasks.length}</span>
          </h2>
        </div>
        <div className="task-list">
          {doneTasks.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={48} strokeWidth={1.5} className="mx-auto mb-4 opacity-50" />
              <p>Belum ada tugas selesai</p>
              <span>Selesaikan tugas dengan klik checkbox</span>
            </div>
          ) : (
            doneTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onToggleSubtask={onToggleSubtask}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </section>
    </>
  );
}
