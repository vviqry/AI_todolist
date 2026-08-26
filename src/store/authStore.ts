import { create } from "zustand";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

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
    onAuthStateChanged(auth, (user: User | null) => {
      set({ user, loading: false });
    });
  },
}));
