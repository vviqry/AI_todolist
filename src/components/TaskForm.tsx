"use client";

import React, { useState, useRef } from "react";
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
  const [isOpen, setIsOpen] = useState(false);
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addTask = useTaskStore((s) => s.addTask);
  const user = useAuthStore((s) => s.user);

  const handleToggleForm = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => textareaRef.current?.focus(), 200);
      }
      return next;
    });
  };

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

      // Automatically collapse the form after successful submit
      setIsOpen(false);
    } catch (error) {
      console.error("Gagal menambah tugas:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={`input-section ${isOpen ? "form-expanded" : "form-collapsed"}`}>
      <div
        className="input-section-header"
        onClick={handleToggleForm}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggleForm();
          }
        }}
      >
        <div className="section-header-left">
          <button
            type="button"
            className={`form-toggle-btn ${isOpen ? "open" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleForm();
            }}
            title={isOpen ? "Tutup form" : "Tambah Tugas Baru"}
            aria-label={isOpen ? "Tutup form tambah tugas" : "Buka form tambah tugas"}
          >
            <Plus size={18} className={`form-toggle-icon ${isOpen ? "rotated" : ""}`} />
          </button>
          <h2 className="section-title">Tambah Tugas Baru</h2>
        </div>
        <span className="form-toggle-badge">
          {isOpen ? "Tutup" : "Baru"}
        </span>
      </div>

      <div className={`form-collapsible-wrapper ${isOpen ? "open" : "collapsed"}`}>
        <div className="form-collapsible-inner">
          <form onSubmit={handleSubmit} className="task-form">
            <div className="form-group" style={{ position: "relative" }}>
              <textarea
                ref={textareaRef}
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

              {frequency !== "none" && (
                <div className="recurring-details-box animate-fadeIn">
                  {/* Target Count */}
                  <div className="recurring-field-row">
                    <label className="sub-label">
                      <Hash size={13} />
                      Target Selesai
                    </label>
                    <div className="target-counter-wrapper">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={targetCount}
                        onChange={(e) => setTargetCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="target-number-input"
                      />
                      <span className="target-unit-text">
                        kali / {getTargetUnitLabel(frequency)}
                      </span>
                    </div>
                  </div>

                  {/* Dates Configuration */}
                  <div className="recurring-dates-grid">
                    <div className="date-field-col">
                      <label className="sub-label">
                        <Calendar size={13} />
                        Tanggal Mulai
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="date-input"
                      />
                    </div>

                    <div className="date-field-col">
                      <div className="end-date-toggle-row">
                        <label className="sub-label">
                          <Calendar size={13} />
                          Batas Akhir
                        </label>
                        <input
                          type="checkbox"
                          id="hasEndDateToggle"
                          checked={hasEndDate}
                          onChange={(e) => setHasEndDate(e.target.checked)}
                          className="subtask-checkbox"
                        />
                      </div>
                      {hasEndDate ? (
                        <input
                          type="date"
                          value={endDate}
                          min={startDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="date-input"
                          required={hasEndDate}
                        />
                      ) : (
                        <span className="no-end-date-badge">Berjalan terus (tanpa batas)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-tasks Section */}
            <div className="form-group subtask-builder">
              <div className="subtask-header">
                <label className="field-label">Langkah-langkah (Sub-tugas)</label>
                <span className="subtask-counter">{subtasks.length} langkah</span>
              </div>

              {subtasks.length > 0 && (
                <div className="subtask-inputs">
                  {subtasks.map((st, index) => (
                    <div key={st.id} className="subtask-input-row">
                      <span className="subtask-input-number">{index + 1}</span>
                      <input
                        type="text"
                        placeholder={`Langkah ${index + 1}...`}
                        value={st.text}
                        onChange={(e) => handleSubtaskChange(st.id, e.target.value)}
                        className="subtask-text-input"
                        autoFocus={index === subtasks.length - 1 && st.text === ""}
                      />
                      <button
                        type="button"
                        onClick={() => removeSubtaskField(st.id)}
                        className="remove-subtask-btn"
                        title="Hapus langkah"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={addSubtaskField}
                className="add-subtask-btn"
              >
                <Plus size={16} />
                <span>Tambah Langkah Manual</span>
              </button>
            </div>

            <div className="form-group">
              <label className="field-label">Prioritas</label>
              <div className="priority-selector">
                {(["low", "medium", "high"] as const).map((p) => (
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
        </div>
      </div>
    </section>
  );
}
