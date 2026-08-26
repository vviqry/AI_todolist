"use client";

import React, { useState } from "react";
import { Plus, X, Sparkles, Loader2, Repeat, Calendar, Hash } from "lucide-react";
import { useTaskStore } from "@/store/taskStore";
import { useAuthStore } from "@/store/authStore";
import {
  RecurrenceFrequency,
  RecurringConfig,
  getLocalDateString,
  getTargetUnitLabel,
} from "@/lib/recurringUtils";

interface SubtaskInput {
  id: string;
  text: string;
}

export default function TaskForm() {
  const [taskText, setTaskText] = useState("");
  const [priority, setPriority] = useState("low");
  const [subtasks, setSubtasks] = useState<SubtaskInput[]>([]);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("none");
  const [targetCount, setTargetCount] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(getLocalDateString());
  const [hasEndDate, setHasEndDate] = useState<boolean>(false);
  const [endDate, setEndDate] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const addTask = useTaskStore((s) => s.addTask);
  const user = useAuthStore((s) => s.user);

  const addSubtaskField = () => {
    setSubtasks([...subtasks, { id: Math.random().toString(36).substring(2, 9), text: "" }]);
  };

  const removeSubtaskField = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handleSubtaskChange = (id: string, text: string) => {
    setSubtasks(subtasks.map((st) => (st.id === id ? { ...st, text } : st)));
  };

  const handleFrequencyChange = (newFreq: RecurrenceFrequency) => {
    setFrequency(newFreq);
    if (newFreq !== "none" && targetCount < 1) {
      setTargetCount(1);
    }
  };

  const handleGenerateAI = async () => {
    if (!taskText.trim()) return;

    setGeneratingAI(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task: taskText.trim() }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.subtasks && Array.isArray(data.subtasks)) {
        const newSubtasks = data.subtasks.map((text: string) => ({
          id: Math.random().toString(36).substring(2, 9),
          text: text,
        }));

        setSubtasks((prev) => [...prev, ...newSubtasks]);
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Silakan coba lagi nanti.";
      console.error("AI Error:", error);
      alert(`Gagal AI: ${errMsg}`);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim() || !user) return;

    // Validation for recurring tasks
    let recurringConfig: RecurringConfig | null = null;
    if (frequency !== "none") {
      const safeTarget = Math.max(1, Math.floor(Number(targetCount) || 1));

      if (hasEndDate && endDate && endDate < startDate) {
        alert("Tanggal berakhir tidak boleh sebelum tanggal mulai.");
        return;
      }

      recurringConfig = {
        isRecurring: true,
        frequency,
        targetCount: safeTarget,
        startDate: startDate || getLocalDateString(),
        endDate: hasEndDate && endDate ? endDate : null,
      };
    }

    setSubmitting(true);
    try {
      await addTask(
        user.uid,
        taskText.trim(),
        priority,
        subtasks.filter((st) => st.text.trim()),
        recurringConfig
      );

      // Reset Form
      setTaskText("");
      setPriority("low");
      setSubtasks([]);
      setFrequency("none");
      setTargetCount(1);
      setStartDate(getLocalDateString());
      setHasEndDate(false);
      setEndDate("");
    } catch (error) {
      console.error("Gagal menambah tugas:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="input-section">
      <h2 className="section-title">
        <span className="title-icon">➕</span>
        Tambah Tugas Baru
      </h2>
      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-group" style={{ position: "relative" }}>
          <textarea
            className="task-input"
            placeholder="Tuliskan tugas Anda di sini... (contoh: Bikin Konten)"
            rows={3}
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            required
            style={{ paddingBottom: "32px" }}
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

        {/* Recurring Section */}
        <div className="form-group recurring-section-wrapper">
          <label className="field-label">
            <Repeat size={14} className="field-label-icon" />
            Pengulangan
          </label>
          <div className="frequency-selector">
            {(
              [
                { value: "none", label: "Tidak berulang" },
                { value: "daily", label: "Setiap hari" },
                { value: "weekly", label: "Setiap minggu" },
                { value: "monthly", label: "Setiap bulan" },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                type="button"
                className={`frequency-pill-btn ${frequency === item.value ? "active" : ""}`}
                onClick={() => handleFrequencyChange(item.value)}
              >
                {item.value !== "none" && <span className="freq-dot" />}
                {item.label}
              </button>
            ))}
          </div>

          {/* Recurring details expandable form */}
          {frequency !== "none" && (
            <div className="recurring-details-card">
              <div className="recurring-form-row">
                <div className="recurring-field">
                  <label className="recurring-sublabel">
                    <Hash size={13} />
                    Target per {getTargetUnitLabel(frequency)}:
                  </label>
                  <div className="target-input-stepper">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setTargetCount((prev) => Math.max(1, prev - 1))}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="target-number-input"
                      value={targetCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setTargetCount(isNaN(val) ? 1 : Math.max(1, val));
                      }}
                      required
                    />
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setTargetCount((prev) => prev + 1)}
                    >
                      +
                    </button>
                    <span className="target-unit-text">
                      kali / {getTargetUnitLabel(frequency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="recurring-date-grid">
                <div className="recurring-field">
                  <label className="recurring-sublabel">
                    <Calendar size={13} />
                    Mulai:
                  </label>
                  <input
                    type="date"
                    className="date-picker-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="recurring-field">
                  <div className="end-date-header">
                    <label className="recurring-sublabel">
                      <Calendar size={13} />
                      Berakhir:
                    </label>
                    <label className="no-end-checkbox-label">
                      <input
                        type="checkbox"
                        checked={!hasEndDate}
                        onChange={(e) => setHasEndDate(!e.target.checked)}
                      />
                      <span>Tanpa batas</span>
                    </label>
                  </div>
                  {hasEndDate ? (
                    <input
                      type="date"
                      className="date-picker-input"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required={hasEndDate}
                    />
                  ) : (
                    <div className="date-picker-disabled">
                      Selamanya (hingga dihapus)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sub-Task Builder (Available for any task) */}
        <div className="form-group subtask-builder">
          <label className="field-label">
            <span>Sub Tugas (Opsional)</span>
          </label>
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
