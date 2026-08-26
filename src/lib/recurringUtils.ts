export type RecurrenceFrequency = "none" | "daily" | "weekly" | "monthly";

export interface RecurringConfig {
  isRecurring: boolean;
  frequency: "daily" | "weekly" | "monthly";
  targetCount: number; // Target per period (e.g. 7 for daily)
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD or null
}

export interface RecurringInstanceDoc {
  periodKey: string;
  targetCount: number;
  completedIndices: number[];
  updatedAt: number;
}

const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * Returns YYYY-MM-DD in user's local timezone.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date to Indonesian readable format (e.g. "Rabu, 26 Agustus 2026").
 */
export function formatReadableDate(dateString: string): string {
  const [y, m, d] = dateString.split("-").map(Number);
  if (!y || !m || !d) return dateString;
  const date = new Date(y, m - 1, d);
  return `${DAYS_ID[date.getDay()]}, ${d} ${MONTHS_ID[m - 1]} ${y}`;
}

/**
 * Generates ISO week string YYYY-Www (e.g. "2026-W35").
 */
export function getWeekKey(d: Date = new Date()): string {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // Monday = 0
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${d.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

/**
 * Generates month string YYYY-MM (e.g. "2026-08").
 */
export function getMonthKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Computes period key based on recurrence frequency.
 */
export function getPeriodKey(frequency: "daily" | "weekly" | "monthly", d: Date = new Date()): string {
  if (frequency === "daily") {
    return getLocalDateString(d);
  }
  if (frequency === "weekly") {
    return getWeekKey(d);
  }
  if (frequency === "monthly") {
    return getMonthKey(d);
  }
  return getLocalDateString(d);
}

/**
 * Human-readable period label.
 */
export function getPeriodDisplayLabel(
  frequency: "daily" | "weekly" | "monthly",
  periodKey: string,
  currentDate: Date = new Date()
): string {
  const todayKey = getLocalDateString(currentDate);

  if (frequency === "daily") {
    if (periodKey === todayKey) return "Hari ini";
    return formatReadableDate(periodKey);
  }

  if (frequency === "weekly") {
    const currentWeekKey = getWeekKey(currentDate);
    if (periodKey === currentWeekKey) return "Minggu ini";
    return `Minggu ${periodKey}`;
  }

  if (frequency === "monthly") {
    const currentMonthKey = getMonthKey(currentDate);
    if (periodKey === currentMonthKey) return "Bulan ini";
    const [y, m] = periodKey.split("-").map(Number);
    if (y && m) return `${MONTHS_ID[m - 1]} ${y}`;
    return periodKey;
  }

  return "Periode ini";
}

/**
 * Frequency label in Indonesian.
 */
export function getFrequencyLabel(frequency: "daily" | "weekly" | "monthly"): string {
  switch (frequency) {
    case "daily":
      return "Setiap hari";
    case "weekly":
      return "Setiap minggu";
    case "monthly":
      return "Setiap bulan";
  }
}

/**
 * Target unit label in Indonesian.
 */
export function getTargetUnitLabel(frequency: "daily" | "weekly" | "monthly"): string {
  switch (frequency) {
    case "daily":
      return "hari";
    case "weekly":
      return "minggu";
    case "monthly":
      return "bulan";
  }
}

/**
 * Checks if a task is active on a given date (inclusive of start and end dates).
 */
export function isTaskActiveOnDate(
  config: RecurringConfig | null | undefined,
  dateString: string = getLocalDateString()
): boolean {
  if (!config || !config.isRecurring) return true;
  if (config.startDate && dateString < config.startDate) return false;
  if (config.endDate && dateString > config.endDate) return false;
  return true;
}

/**
 * Calculates completion metrics for a recurring task.
 */
export function getRecurringMetrics(
  targetCount: number,
  completedIndices: number[] = []
): {
  targetCount: number;
  completedCount: number;
  isCompleted: boolean;
  percent: number;
} {
  const safeTarget = Math.max(1, targetCount || 1);
  const completedCount = completedIndices.length;
  const isCompleted = completedCount >= safeTarget;
  const percent = Math.min(100, Math.round((completedCount / safeTarget) * 100));

  return {
    targetCount: safeTarget,
    completedCount,
    isCompleted,
    percent,
  };
}
