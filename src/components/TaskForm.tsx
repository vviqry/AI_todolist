"use client";

import React, { useState } from "react";
import { Plus, X, Sparkles, Loader2 } from "lucide-react";
import { useTaskStore } from "@/store/taskStore";
import { useAuthStore } from "@/store/authStore";

interface SubtaskInput {
  id: string;
  text: string;
}

export default function TaskForm() {
  const [taskText, setTaskText] = useState("");
  const [priority, setPriority] = useState("low");
  const [subtasks, setSubtasks] = useState<SubtaskInput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const addTask = useTaskStore((s) => s.addTask);
  const user = useAuthStore((s) => s.user);

  const addSubtaskField = () => {
    setSubtasks([...subtasks, { id: Math.random().toString(36).substr(2, 9), text: "" }]);
  };

  const removeSubtaskField = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handleSubtaskChange = (id: string, text: string) => {
    setSubtasks(subtasks.map((st) => (st.id === id ? { ...st, text } : st)));
  };

  const handleGenerateAI = async () => {
    if (!taskText.trim()) return;
    
    setGeneratingAI(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task: taskText.trim() }),
      });

      if (!response.ok) {
        throw new Error('Gagal memanggil AI');
      }

      const data = await response.json();
      if (data.subtasks && Array.isArray(data.subtasks)) {
        const newSubtasks = data.subtasks.map((text: string) => ({
          id: Math.random().toString(36).substr(2, 9),
          text: text,
        }));
        
        // Append new subtasks to existing ones
        setSubtasks((prev) => [...prev, ...newSubtasks]);
      }
    } catch (error) {
      console.error("AI Error:", error);
      alert("Gagal membuat langkah-langkah dengan AI. Silakan coba lagi nanti.");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim() || !user) return;

    setSubmitting(true);
    try {
      await addTask(
        user.uid,
        taskText.trim(),
        priority,
        subtasks.filter((st) => st.text.trim())
      );

      // Reset Form
      setTaskText("");
      setPriority("low");
      setSubtasks([]);
    } catch (error) {
      console.error("Gagal menambah tugas:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="input-section">
      <h2 className="section-title">Tambah Tugas Baru</h2>
      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-group" style={{ position: 'relative' }}>
          <textarea
            className="task-input"
            placeholder="Tuliskan tugas Anda di sini..."
            rows={3}
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            required
            style={{ paddingBottom: '32px' }}
          ></textarea>
          
          {/* AI Magic Button */}
          <button
            type="button"
            className="ai-generate-btn"
            onClick={handleGenerateAI}
            disabled={generatingAI || !taskText.trim()}
            title="Generate langkah dengan AI"
          >
            {generatingAI ? (
              <Loader2 size={16} className="ai-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            <span className="sr-only">Generate AI</span>
          </button>
        </div>

        {/* Sub-Task Builder */}
        <div className="form-group subtask-builder">
          <div className="subtask-inputs">
            {subtasks.map((st, index) => (
              <div key={st.id} className="subtask-input-row">
                <span className="subtask-input-number">{index + 1}</span>
                <input
                  type="text"
                  className="subtask-text-input"
                  placeholder="Sub tugas..."
                  value={st.text}
                  onChange={(e) => handleSubtaskChange(st.id, e.target.value)}
                />
                <button
                  type="button"
                  className="remove-subtask-btn"
                  onClick={() => removeSubtaskField(st.id)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="add-subtask-btn" onClick={addSubtaskField}>
            <Plus size={16} />
            Tambah Sub Tugas
          </button>
        </div>

        <div className="form-group">
          <label className="priority-label">Level Prioritas:</label>
          <div className="priority-selector">
            {["low", "medium", "high"].map((p) => (
              <React.Fragment key={p}>
                <input
                  type="radio"
                  id={`priority-${p}`}
                  name="priority"
                  value={p}
                  checked={priority === p}
                  onChange={(e) => setPriority(e.target.value)}
                />
                <label
                  htmlFor={`priority-${p}`}
                  className={`priority-btn priority-${p}`}
                >
                  <span className="priority-dot"></span>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </label>
              </React.Fragment>
            ))}
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? (
            <span className="auth-spinner" style={{ width: 20, height: 20 }}></span>
          ) : (
            <>
              <Plus size={20} />
              Tambah Tugas
            </>
          )}
        </button>
      </form>
    </section>
  );
}
