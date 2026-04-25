// Fix: Make auth listener client-side only
import { create } from "zustand";
import { User } from "firebase/auth";

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  initialized: boolean;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user, loading: false }),
  init: () => {
    if (get().initialized) return;
    set({ initialized: true });
    // Dynamic import to avoid SSR issues
    import("@/lib/firebase").then(({ auth }) => {
      const { onAuthStateChanged } = require("firebase/auth");
      onAuthStateChanged(auth, (user: User | null) => {
        set({ user, loading: false });
      });
    });
  },
}));
