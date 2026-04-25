"use client";

import React, { useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import TaskForm from "@/components/TaskForm";
import TaskList from "@/components/TaskList";
import { useAuthStore } from "@/store/authStore";
import { useTaskStore } from "@/store/taskStore";
import { Trash2 } from "lucide-react";

function TodoApp() {
  const user = useAuthStore((s) => s.user);
  const { tasks, loading, subscribeTasks, cleanup, toggleComplete, toggleSubtask, deleteTask, deleteAll } =
    useTaskStore();

  useEffect(() => {
    if (user) {
      subscribeTasks(user.uid);
    }
    return () => cleanup();
  }, [user, subscribeTasks, cleanup]);

  const handleDeleteAll = async () => {
    if (!user) return;
    if (!confirm("Yakin mau hapus semua tugas?")) return;
    await deleteAll(user.uid);
  };

  return (
    <div className="app-container">
      <Header
        userName={user?.displayName}
        userEmail={user?.email}
      />

      <main className="main-content">
        <TaskForm />

        {loading ? (
          <div className="auth-loading-screen" style={{ minHeight: "200px", background: "transparent" }}>
            <div className="auth-loading-spinner"></div>
            <p>Memuat tugas...</p>
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            onToggleComplete={(task) => user && toggleComplete(user.uid, task)}
            onToggleSubtask={(task, subtaskId) => user && toggleSubtask(user.uid, task, subtaskId)}
            onDelete={(taskId) => user && deleteTask(user.uid, taskId)}
          />
        )}
      </main>

      <footer className="footer">
        <button
          className="delete-all-btn"
          onClick={handleDeleteAll}
          disabled={tasks.length === 0}
        >
          <Trash2 size={18} />
          Hapus Semua
        </button>
      </footer>
    </div>
  );
}

export default function Home() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <AuthGuard>
      <TodoApp />
    </AuthGuard>
  );
}
