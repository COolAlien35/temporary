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
        const saved = mode === "demo" ? state.profiles[user.id] : undefined
        const resolvedUser = saved ? { ...user, name: saved.name } : user
        const preferences = saved?.preferences ?? defaultLearningPreferences
        return {
          user: resolvedUser,
          mode,
          preferences,
          profiles: mode === "demo" ? { ...state.profiles, [user.id]: { name: resolvedUser.name, preferences } } : state.profiles,
        }
      }),
      updateName: (name) => set((state) => {
        if (!state.user) return state
        return {
          user: { ...state.user, name },
          profiles: state.mode === "demo" ? { ...state.profiles, [state.user.id]: { name, preferences: state.preferences } } : state.profiles,
        }
      }),
      updatePreferences: (changes) => set((state) => {
        if (!state.user) return state
        const preferences = { ...state.preferences, ...changes }
        return {
          preferences,
          profiles: state.mode === "demo" ? { ...state.profiles, [state.user.id]: { name: state.user.name, preferences } } : state.profiles,
        }
      }),
      endSession: () => set({ user: null, mode: null, preferences: defaultLearningPreferences }),
    }),
    { name: "quantumloop-demo-session", partialize: (state) => ({
      user: state.mode === "demo" ? state.user : null,
      mode: state.mode === "demo" ? "demo" : null,
      profiles: state.profiles,
      preferences: state.mode === "demo" ? state.preferences : defaultLearningPreferences,
    }) },
  ),
)
