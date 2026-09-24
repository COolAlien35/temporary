import { create } from "zustand"
import { persist } from "zustand/middleware"

export type SavedCircuit = {
  id: string
  name: string
  algorithmSlug: string | null
  gates: Array<{ gate: string; qubit: number; target?: number; timeStep: number }>
  code: string
  updatedAt: number
}

export type LearnerProgress = {
  stagesCompleted: Record<string, number>
  xp: number
  streak: number
  badges: string[]
  calibrationHistory: Array<{ algoSlug: string; score: number; timestamp: number }>
  savedCircuits: SavedCircuit[]
  notebookNotes: Array<{ id: string; content: string; timestamp: number }>
  cohortMembership: string[]
  lessonsCompleted: string[]
  quizScores: Record<string, number>
  flaggedQuestions: string[]
  lastLessonId: string | null
}

const initialState: LearnerProgress = {
  stagesCompleted: {},
  xp: 0,
  streak: 12,
  badges: ["Quantum Explorer", "Oracle Master"],
  calibrationHistory: [],
  savedCircuits: [],
  notebookNotes: [],
  cohortMembership: [],
  lessonsCompleted: [],
  quizScores: {},
  flaggedQuestions: [],
  lastLessonId: null,
}

export const useLearnerProgress = create<LearnerProgress & {
  updateStage: (algoSlug: string, stage: number) => void
  addXP: (amount: number) => void
  updateStreak: (days: number) => void
  addBadge: (badge: string) => void
  addCalibration: (algoSlug: string, score: number) => void
  saveCircuit: (circuit: SavedCircuit) => void
  addNote: (content: string) => void
  completeLesson: (lessonId: string, amount: number) => void
  saveQuizScore: (unitId: string, score: number) => void
}>()(
  persist(
    (set) => ({
      ...initialState,
      updateStage: (algoSlug: string, stage: number) =>
        set((state) => ({
          stagesCompleted: {
            ...state.stagesCompleted,
            [algoSlug]: Math.max(state.stagesCompleted[algoSlug] ?? 0, stage),
          },
        })),
      addXP: (amount: number) => set((state) => ({ xp: state.xp + amount })),
      updateStreak: (days: number) => set({ streak: days }),
      addBadge: (badge: string) =>
        set((state) => ({
          badges: state.badges.includes(badge) ? state.badges : [...state.badges, badge],
        })),
      addCalibration: (algoSlug: string, score: number) =>
        set((state) => ({
          calibrationHistory: [...state.calibrationHistory, { algoSlug, score, timestamp: Date.now() }],
        })),
      saveCircuit: (circuit: SavedCircuit) =>
        set((state) => {
          const existing = state.savedCircuits.findIndex((c) => c.id === circuit.id)
          const updated = existing >= 0 ? state.savedCircuits.map((c, i) => (i === existing ? circuit : c)) : [...state.savedCircuits, circuit]
          return { savedCircuits: updated }
        }),
      addNote: (content: string) =>
        set((state) => ({
          notebookNotes: [...state.notebookNotes, { id: Date.now().toString(), content, timestamp: Date.now() }],
        })),
      completeLesson: (lessonId: string, amount: number) => set((state) => ({ lessonsCompleted: state.lessonsCompleted.includes(lessonId) ? state.lessonsCompleted : [...state.lessonsCompleted, lessonId], lastLessonId: lessonId, xp: state.lessonsCompleted.includes(lessonId) ? state.xp : state.xp + amount })),
      saveQuizScore: (unitId: string, score: number) => set((state) => ({ quizScores: { ...state.quizScores, [unitId]: Math.max(state.quizScores[unitId] ?? 0, score) } })),
    }),
    {
      name: "learner-progress-storage",
    },
  ),
)
