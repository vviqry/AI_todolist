import { create } from "zustand";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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
}

interface TaskState {
  tasks: Task[];
  loading: boolean;
  unsubscribe: (() => void) | null;

  // Actions
  subscribeTasks: (userId: string) => void;
  cleanup: () => void;
  addTask: (userId: string, text: string, priority: string, subtasks: { text: string }[]) => Promise<void>;
  toggleComplete: (userId: string, task: Task) => Promise<void>;
  toggleSubtask: (userId: string, task: Task, subtaskId: string) => Promise<void>;
  deleteTask: (userId: string, taskId: string) => Promise<void>;
  deleteAll: (userId: string) => Promise<void>;
}

// ===== Helper =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function getTasksRef(userId: string) {
  return collection(db, "users", userId, "tasks");
}

// ===== Store =====
export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: true,
  unsubscribe: null,

  // Real-time listener
  subscribeTasks: (userId: string) => {
    // Clean up previous listener
    get().cleanup();

    const q = query(getTasksRef(userId), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const tasks: Task[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text,
          priority: data.priority,
          isCompleted: data.isCompleted,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
          completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toMillis() : data.completedAt,
          subtasks: data.subtasks || [],
        };
      });
      set({ tasks, loading: false });
    });

    set({ unsubscribe: unsub });
  },

  cleanup: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null });
    }
  },

  // CRUD Operations
  addTask: async (userId, text, priority, subtaskInputs) => {
    const subtasks: Subtask[] = subtaskInputs
      .filter((st) => st.text.trim())
      .map((st) => ({
        id: generateId(),
        text: st.text.trim(),
        isDone: false,
      }));

    await addDoc(getTasksRef(userId), {
      text,
      priority,
      isCompleted: false,
      createdAt: Timestamp.now(),
      completedAt: null,
      subtasks,
    });
  },

  toggleComplete: async (userId, task) => {
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
      await updateDoc(ref, { subtasks: updatedSubtasks });
    }
  },

  deleteTask: async (userId, taskId) => {
    await deleteDoc(doc(db, "users", userId, "tasks", taskId));
  },

  deleteAll: async (userId) => {
    const snapshot = await getDocs(getTasksRef(userId));
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  },
}));
