import { create } from "zustand";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  writeBatch,
  getDocs,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  RecurringConfig,
  RecurringInstanceDoc,
  getPeriodKey,
} from "@/lib/recurringUtils";

// ===== Types =====
export interface Subtask {
  id: string;
  text: string;
  isDone: boolean;
}

export interface Task {
  id: string;
  text: string;
  priority: "low" | "medium" | "high";
  isCompleted: boolean;
  createdAt: number;
  completedAt: number | null;
  subtasks: Subtask[];
  recurringConfig?: RecurringConfig | null;
}

interface TaskState {
  tasks: Task[];
  recurringInstances: Record<string, Record<string, RecurringInstanceDoc>>;
  loading: boolean;
  tasksUnsubscribe: Unsubscribe | null;
  instanceUnsubscribes: Record<string, Unsubscribe>;

  // Actions
  subscribeTasks: (userId: string) => void;
  cleanup: () => void;
  addTask: (
    userId: string,
    text: string,
    priority: string,
    subtasks: { text: string }[],
    recurringConfig?: RecurringConfig | null
  ) => Promise<void>;
  toggleComplete: (userId: string, task: Task, optionalPeriodKey?: string) => Promise<void>;
  toggleSubtask: (userId: string, task: Task, subtaskId: string) => Promise<void>;
  toggleRecurringInstance: (
    userId: string,
    task: Task,
    periodKey: string,
    index: number
  ) => Promise<void>;
  toggleRecurringAll: (
    userId: string,
    task: Task,
    periodKey: string
  ) => Promise<void>;
  updateTaskText: (userId: string, taskId: string, newText: string) => Promise<void>;
  updateSubtaskText: (userId: string, task: Task, subtaskId: string, newText: string) => Promise<void>;
  updateRecurringConfig: (
    userId: string,
    taskId: string,
    recurringConfig: RecurringConfig | null
  ) => Promise<void>;
  deleteTask: (userId: string, taskId: string) => Promise<void>;
  deleteAll: (userId: string) => Promise<void>;
}

// ===== Helpers =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function getTasksRef(userId: string) {
  return collection(db, "users", userId, "tasks");
}

function getRecurringInstancesRef(userId: string, taskId: string) {
  return collection(db, "users", userId, "tasks", taskId, "recurringInstances");
}

// ===== Store =====
export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  recurringInstances: {},
  loading: true,
  tasksUnsubscribe: null,
  instanceUnsubscribes: {},

  // Real-time listener
  subscribeTasks: (userId: string) => {
    // Clean up previous listeners
    get().cleanup();

    const q = query(getTasksRef(userId), orderBy("createdAt", "desc"));
    const tasksUnsub = onSnapshot(
      q,
      (snapshot) => {
        const tasks: Task[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            text: data.text,
            priority: data.priority,
            isCompleted: data.isCompleted,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
            completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toMillis() : data.completedAt,
            subtasks: data.subtasks || [],
            recurringConfig: data.recurringConfig || null,
          };
        });

        const currentInstanceUnsubs = { ...get().instanceUnsubscribes };
        const activeTaskIds = new Set(tasks.map((t) => t.id));

        // Unsubscribe deleted tasks' subcollections
        Object.keys(currentInstanceUnsubs).forEach((taskId) => {
          if (!activeTaskIds.has(taskId)) {
            currentInstanceUnsubs[taskId]();
            delete currentInstanceUnsubs[taskId];
          }
        });

        // Subscribe to subcollections for recurring tasks
        tasks.forEach((task) => {
          if (task.recurringConfig?.isRecurring && !currentInstanceUnsubs[task.id]) {
            const instancesRef = getRecurringInstancesRef(userId, task.id);
            const unsub = onSnapshot(
              instancesRef,
              (instSnapshot) => {
                const map: Record<string, RecurringInstanceDoc> = {};
                instSnapshot.docs.forEach((instDoc) => {
                  const instData = instDoc.data();
                  map[instDoc.id] = {
                    periodKey: instDoc.id,
                    targetCount: instData.targetCount || task.recurringConfig?.targetCount || 1,
                    completedIndices: instData.completedIndices || [],
                    updatedAt: instData.updatedAt || 0,
                  };
                });

                set((state) => ({
                  recurringInstances: {
                    ...state.recurringInstances,
                    [task.id]: map,
                  },
                }));
              },
              (err) => {
                console.error(`Error listening to recurring instances for task ${task.id}:`, err);
              }
            );

            currentInstanceUnsubs[task.id] = unsub;
          }
        });

        set({
          tasks,
          instanceUnsubscribes: currentInstanceUnsubs,
          loading: false,
        });
      },
      (error) => {
        console.error("Error fetching tasks:", error);
        set({ loading: false });
      }
    );

    set({ tasksUnsubscribe: tasksUnsub });
  },

  cleanup: () => {
    const { tasksUnsubscribe, instanceUnsubscribes } = get();
    if (tasksUnsubscribe) {
      tasksUnsubscribe();
    }
    Object.values(instanceUnsubscribes).forEach((unsub) => unsub());
    set({
      tasksUnsubscribe: null,
      instanceUnsubscribes: {},
      recurringInstances: {},
    });
  },

  // CRUD Operations
  addTask: async (userId, text, priority, subtaskInputs, recurringConfig = null) => {
    const subtasks: Subtask[] = subtaskInputs
      .filter((st) => st.text.trim())
      .map((st) => ({
        id: generateId(),
        text: st.text.trim(),
        isDone: false,
      }));

    const taskData: {
      text: string;
      priority: string;
      isCompleted: boolean;
      createdAt: Timestamp;
      completedAt: null;
      subtasks: Subtask[];
      recurringConfig: RecurringConfig | null;
    } = {
      text,
      priority,
      isCompleted: false,
      createdAt: Timestamp.now(),
      completedAt: null,
      subtasks,
      recurringConfig: null,
    };

    if (recurringConfig && recurringConfig.isRecurring) {
      taskData.recurringConfig = {
        isRecurring: true,
        frequency: recurringConfig.frequency,
        targetCount: Math.max(1, Number(recurringConfig.targetCount) || 1),
        startDate: recurringConfig.startDate,
        endDate: recurringConfig.endDate || null,
      };
    }

    await addDoc(getTasksRef(userId), taskData);
  },

  toggleComplete: async (userId, task, optionalPeriodKey) => {
    if (task.recurringConfig?.isRecurring) {
      const frequency = task.recurringConfig.frequency;
      const periodKey = optionalPeriodKey || getPeriodKey(frequency);
      await get().toggleRecurringAll(userId, task, periodKey);
      return;
    }

    const ref = doc(db, "users", userId, "tasks", task.id);
    if (!task.isCompleted) {
      // Mark as done
      await updateDoc(ref, {
        isCompleted: true,
        completedAt: Timestamp.now(),
        subtasks: task.subtasks.map((st) => ({ ...st, isDone: true })),
      });
    } else {
      // Un-complete
      await updateDoc(ref, {
        isCompleted: false,
        completedAt: null,
        subtasks: task.subtasks.map((st) => ({ ...st, isDone: false })),
      });
    }
  },

  toggleSubtask: async (userId, task, subtaskId) => {
    const ref = doc(db, "users", userId, "tasks", task.id);
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, isDone: !st.isDone } : st
    );

    const allDone = updatedSubtasks.every((st) => st.isDone) && updatedSubtasks.length > 0;

    if (allDone) {
      // Auto-complete main task
      await updateDoc(ref, {
        subtasks: updatedSubtasks,
        isCompleted: true,
        completedAt: Timestamp.now(),
      });
    } else {
      await updateDoc(ref, {
        subtasks: updatedSubtasks,
        isCompleted: false,
        completedAt: null,
      });
    }
  },

  toggleRecurringInstance: async (userId, task, periodKey, index) => {
    const taskInstances = get().recurringInstances[task.id] || {};
    const existingDoc = taskInstances[periodKey];
    const currentTarget = existingDoc?.targetCount || task.recurringConfig?.targetCount || 1;
    const currentCompleted = existingDoc?.completedIndices || [];

    const isAlreadyCompleted = currentCompleted.includes(index);
    const nextCompletedIndices = isAlreadyCompleted
      ? currentCompleted.filter((i) => i !== index)
      : [...currentCompleted, index].sort((a, b) => a - b);

    // Optimistic update
    set((state) => ({
      recurringInstances: {
        ...state.recurringInstances,
        [task.id]: {
          ...(state.recurringInstances[task.id] || {}),
          [periodKey]: {
            periodKey,
            targetCount: currentTarget,
            completedIndices: nextCompletedIndices,
            updatedAt: Date.now(),
          },
        },
      },
    }));

    const instDocRef = doc(db, "users", userId, "tasks", task.id, "recurringInstances", periodKey);
    await setDoc(
      instDocRef,
      {
        periodKey,
        targetCount: currentTarget,
        completedIndices: nextCompletedIndices,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  },

  toggleRecurringAll: async (userId, task, periodKey) => {
    const taskInstances = get().recurringInstances[task.id] || {};
    const existingDoc = taskInstances[periodKey];
    const currentTarget = existingDoc?.targetCount || task.recurringConfig?.targetCount || 1;
    const currentCompleted = existingDoc?.completedIndices || [];

    const isAllDone = currentCompleted.length >= currentTarget;
    const nextCompletedIndices = isAllDone
      ? []
      : Array.from({ length: currentTarget }, (_, i) => i + 1);

    // Optimistic update
    set((state) => ({
      recurringInstances: {
        ...state.recurringInstances,
        [task.id]: {
          ...(state.recurringInstances[task.id] || {}),
          [periodKey]: {
            periodKey,
            targetCount: currentTarget,
            completedIndices: nextCompletedIndices,
            updatedAt: Date.now(),
          },
        },
      },
    }));

    const instDocRef = doc(db, "users", userId, "tasks", task.id, "recurringInstances", periodKey);
    await setDoc(
      instDocRef,
      {
        periodKey,
        targetCount: currentTarget,
        completedIndices: nextCompletedIndices,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  },

  updateTaskText: async (userId, taskId, newText) => {
    const ref = doc(db, "users", userId, "tasks", taskId);
    await updateDoc(ref, { text: newText });
  },

  updateSubtaskText: async (userId, task, subtaskId, newText) => {
    const ref = doc(db, "users", userId, "tasks", task.id);
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, text: newText } : st
    );
    await updateDoc(ref, { subtasks: updatedSubtasks });
  },

  updateRecurringConfig: async (userId, taskId, recurringConfig) => {
    const ref = doc(db, "users", userId, "tasks", taskId);
    await updateDoc(ref, { recurringConfig });
  },

  deleteTask: async (userId, taskId) => {
    // 1. Delete all subcollection docs in recurringInstances
    try {
      const instancesSnapshot = await getDocs(getRecurringInstancesRef(userId, taskId));
      if (!instancesSnapshot.empty) {
        const batch = writeBatch(db);
        instancesSnapshot.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.warn("Could not batch delete recurringInstances subcollection:", e);
    }

    // 2. Delete main task doc
    await deleteDoc(doc(db, "users", userId, "tasks", taskId));

    // 3. Cleanup listener
    const { instanceUnsubscribes } = get();
    if (instanceUnsubscribes[taskId]) {
      instanceUnsubscribes[taskId]();
      const nextUnsubs = { ...instanceUnsubscribes };
      delete nextUnsubs[taskId];
      set({ instanceUnsubscribes: nextUnsubs });
    }
  },

  deleteAll: async (userId) => {
    const snapshot = await getDocs(getTasksRef(userId));
    for (const docSnap of snapshot.docs) {
      try {
        const instancesSnapshot = await getDocs(getRecurringInstancesRef(userId, docSnap.id));
        if (!instancesSnapshot.empty) {
          const batch = writeBatch(db);
          instancesSnapshot.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {
        console.warn("Could not delete subcollection for task:", docSnap.id, e);
      }
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  },
}));
