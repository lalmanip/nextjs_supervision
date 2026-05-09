import { create } from "zustand";
import type { SupervisionUser } from "@/features/auth/auth.types";

type AuthState = {
  user: SupervisionUser | null;
  setUser: (user: SupervisionUser | null) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clear: () => set({ user: null }),
}));

