import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AuthResult, LearnerIdentity, LearningPreferences } from "@/lib/services/contracts"

export const defaultLearningPreferences: LearningPreferences = {
  focus: "foundations",
  pace: "guided",
  reduceMotion: false,
}

interface DemoProfile {
  name: string
  preferences: LearningPreferences
}

interface SessionState {
  user: LearnerIdentity | null
  mode: "demo" | "connected" | null
  profiles: Record<string, DemoProfile>
  preferences: LearningPreferences
  startSession: (result: AuthResult) => void
  updateName: (name: string) => void
  updatePreferences: (preferences: Partial<LearningPreferences>) => void
  endSession: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      mode: null,
      profiles: {},
      preferences: defaultLearningPreferences,
      startSession: ({ user, mode }) => set((state) => {
        const saved = state.profiles[user.id]
        const resolvedUser = saved ? { ...user, name: saved.name } : user
        const preferences = saved?.preferences ?? defaultLearningPreferences
        return {
          user: resolvedUser,
          mode,
          preferences,
          profiles: { ...state.profiles, [user.id]: { name: resolvedUser.name, preferences } },
        }
      }),
      updateName: (name) => set((state) => {
        if (!state.user) return state
        return {
          user: { ...state.user, name },
          profiles: { ...state.profiles, [state.user.id]: { name, preferences: state.preferences } },
        }
      }),
      updatePreferences: (changes) => set((state) => {
        if (!state.user) return state
        const preferences = { ...state.preferences, ...changes }
        return {
          preferences,
          profiles: { ...state.profiles, [state.user.id]: { name: state.user.name, preferences } },
        }
      }),
      endSession: () => set({ user: null, mode: null, preferences: defaultLearningPreferences }),
    }),
    { name: "quantumloop-demo-session", partialize: (state) => ({ user: state.user, mode: state.mode, profiles: state.profiles, preferences: state.preferences }) },
  ),
)
