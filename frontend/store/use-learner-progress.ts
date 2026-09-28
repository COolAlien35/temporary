import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AssessmentAttempt } from "@/lib/services/contracts"

export type SavedCircuit = {
  id: string
  name: string
  algorithmSlug: string | null
  gates: Array<{ gate: string; qubit: number; target?: number; timeStep: number }>
  code: string
  updatedAt: number
}

export type ChallengeAttempt = {
  id: string
  challengeId: string
  contestId?: string
  learnerId: string
  circuit: import("@/lib/studio/types").StudioCircuit
  score: number
  passed: boolean
  feedback: string[]
  probabilities: Record<string, number>
  submittedAt: number
}

export type LearnerActivity = {
  id: string
  kind: "lesson" | "quiz" | "challenge" | "experiment" | "daily-practice"
  title: string
  href: string
  timestamp: number
  xp: number
  score?: number
  details?: string
}

type NewLearnerActivity = Omit<LearnerActivity, "id" | "timestamp"> & { timestamp?: number }

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
  quizzesCompleted: string[]
  quizAttempts: Record<string, Array<{ score: number; attemptedAt: number; passed: boolean }>>
  challengeAttempts: ChallengeAttempt[]
  assessmentAttempts: AssessmentAttempt[]
  hintUsage: Record<string, number>
  activities: LearnerActivity[]
  activityDays: string[]
  bestStreak: number
  dailyPracticeResults: Record<string, number>
  flaggedQuestions: string[]
  lastLessonId: string | null
}

const initialState: LearnerProgress = {
  stagesCompleted: {},
  xp: 0,
  streak: 0,
  badges: [],
  calibrationHistory: [],
  savedCircuits: [],
  notebookNotes: [],
  cohortMembership: [],
  lessonsCompleted: [],
  quizScores: {},
  quizzesCompleted: [],
  quizAttempts: {},
  challengeAttempts: [],
  assessmentAttempts: [],
  hintUsage: {},
  activities: [],
  activityDays: [],
  bestStreak: 0,
  dailyPracticeResults: {},
  flaggedQuestions: [],
  lastLessonId: null,
}

export const useLearnerProgress = create<LearnerProgress & {
  activeLearnerId: string | null
  profiles: Record<string, LearnerProgress>
  switchLearner: (learnerId: string | null) => void
  resetProgress: () => void
  updateStage: (algoSlug: string, stage: number) => void
  addXP: (amount: number) => void
  updateStreak: (days: number) => void
  addBadge: (badge: string) => void
  addCalibration: (algoSlug: string, score: number) => void
  saveCircuit: (circuit: SavedCircuit) => void
  addNote: (content: string) => void
  completeLesson: (lessonId: string, amount: number) => void
  setLastLesson: (lessonId: string) => void
  saveQuizScore: (unitId: string, score: number) => void
  completeUnitQuiz: (unitId: string, score: number, xp: number, answers?: Record<string, number>) => void
  recordChallengeAttempt: (attempt: ChallengeAttempt) => void
  recordAssessmentAttempt: (attempt: AssessmentAttempt) => void
  updateAssessmentAttempt: (learnerId: string, attemptId: string, feedback: string) => void
  recordHint: (algorithmSlug: string) => void
  recordActivity: (activity: NewLearnerActivity) => void
  recordExperiment: (title: string, href: string, details: string) => void
  completeDailyPractice: (day: string, score: number) => void
}>()(
  persist(
    (set) => ({
      ...initialState,
      activeLearnerId: null,
      profiles: {},
      switchLearner: (learnerId) => set((state) => {
        if (state.activeLearnerId === learnerId) return state
        const profiles = { ...state.profiles }
        if (state.activeLearnerId) {
          profiles[state.activeLearnerId] = snapshot(state)
        }
        return { ...initialState, ...profiles[learnerId ?? ""], profiles, activeLearnerId: learnerId }
      }),
      resetProgress: () => set((state) => {
        const profiles = { ...state.profiles }
        if (state.activeLearnerId) delete profiles[state.activeLearnerId]
        return { ...initialState, profiles }
      }),
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
      setLastLesson: (lessonId) => set({ lastLessonId: lessonId }),
      saveQuizScore: (unitId: string, score: number) => set((state) => ({ quizScores: { ...state.quizScores, [unitId]: Math.max(state.quizScores[unitId] ?? 0, score) } })),
      completeUnitQuiz: (unitId, score, xp, answers) => set((state) => {
        const passed = score >= 70
        const awardedXp = passed && !state.quizzesCompleted.includes(unitId) ? xp : 0
        const submittedAt = Date.now()
        return {
          ...activityPatch(state, { kind: "quiz", title: `${unitId.toUpperCase()} quiz`, href: `/curriculum/${unitId}/quiz`, xp: awardedXp, score, details: passed ? "Passed" : "Review recommended" }, submittedAt),
          quizScores: { ...state.quizScores, [unitId]: Math.max(state.quizScores[unitId] ?? 0, score) },
          quizzesCompleted: passed && !state.quizzesCompleted.includes(unitId) ? [...state.quizzesCompleted, unitId] : state.quizzesCompleted,
          quizAttempts: { ...state.quizAttempts, [unitId]: [...(state.quizAttempts[unitId] ?? []), { score, attemptedAt: submittedAt, passed }] },
          assessmentAttempts: [...(state.assessmentAttempts ?? []), { id: crypto.randomUUID(), assessmentId: unitId, learnerId: state.activeLearnerId ?? "demo-learner", kind: "unit-quiz", score, status: "graded", passed, submittedAt, feedback: [passed ? "Passed" : "Review the answers and retry"], snapshot: answers ? { answers: { ...answers } } : undefined }],
        }
      }),
      completeLesson: (lessonId: string, amount: number) => set((state) => {
        if (state.lessonsCompleted.includes(lessonId)) return { lastLessonId: lessonId }
        return {
          ...activityPatch(state, { kind: "lesson", title: "Lesson completed", href: lessonHref(lessonId), xp: amount }),
          lessonsCompleted: [...state.lessonsCompleted, lessonId],
          lastLessonId: lessonId,
        }
      }),
      recordChallengeAttempt: (attempt) => set((state) => ({
        ...activityPatch(state, { kind: "challenge", title: attempt.passed ? "Challenge passed" : "Challenge submitted", href: `/challenges/${attempt.challengeId}/attempts/${attempt.id}`, xp: attempt.passed ? 10 : 0, score: attempt.score, details: attempt.passed ? "Passed" : "Try another circuit" }, attempt.submittedAt),
        challengeAttempts: [...state.challengeAttempts, attempt],
        assessmentAttempts: [...(state.assessmentAttempts ?? []), { id: attempt.id, assessmentId: attempt.challengeId, learnerId: attempt.learnerId, kind: "circuit-challenge", score: attempt.score, status: "graded", passed: attempt.passed, submittedAt: attempt.submittedAt, feedback: attempt.feedback, snapshot: { circuit: attempt.circuit, probabilities: attempt.probabilities } }],
      })),
      recordAssessmentAttempt: (attempt) => set((state) => ({
        assessmentAttempts: [...(state.assessmentAttempts ?? []), attempt],
        ...activityPatch(state, { kind: attempt.kind === "assignment" ? "quiz" : "challenge", title: attempt.kind === "lab-challenge" ? `${attempt.assessmentId} lab challenge` : attempt.kind === "assignment" ? "Assignment submitted" : "Code challenge submitted", href: attempt.kind === "lab-challenge" ? `/lab/${attempt.assessmentId}` : attempt.kind === "assignment" ? `/assignments/${attempt.assessmentId}` : `/challenges/${attempt.assessmentId}`, xp: 0, score: attempt.score ?? undefined, details: attempt.feedback[0] }, attempt.submittedAt),
      })),
      updateAssessmentAttempt: (learnerId, attemptId, feedback) => set((state) => {
        const update = (items: AssessmentAttempt[] = []) => items.map((item) => item.id === attemptId ? { ...item, status: "graded" as const, passed: item.kind === "assignment" || item.score === null ? null : item.score >= 70, feedback: [item.feedback[0] ?? "Quiz auto-scored", feedback] } : item)
        if (state.activeLearnerId === learnerId || (!state.activeLearnerId && learnerId === "demo-learner")) return { assessmentAttempts: update(state.assessmentAttempts) }
        const profile = state.profiles[learnerId]
        return profile ? { profiles: { ...state.profiles, [learnerId]: { ...profile, assessmentAttempts: update(profile.assessmentAttempts) } } } : state
      }),
      recordHint: (algorithmSlug) => set((state) => ({ hintUsage: { ...(state.hintUsage ?? {}), [algorithmSlug]: (state.hintUsage?.[algorithmSlug] ?? 0) + 1 } })),
      recordActivity: (activity) => set((state) => activityPatch(state, activity)),
      recordExperiment: (title, href, details) => set((state) => activityPatch(state, { kind: "experiment", title, href, xp: 0, details })),
      completeDailyPractice: (day, score) => set((state) => {
        if (state.dailyPracticeResults[day] !== undefined) return state
        const xp = score >= 70 ? 5 : 0
        return {
          ...activityPatch(state, { kind: "daily-practice", title: "Daily knowledge check", href: "/curriculum/practice", xp, score, details: score >= 70 ? "Correct answer" : "Review the explanation" }),
          dailyPracticeResults: { ...state.dailyPracticeResults, [day]: score },
        }
      }),
    }),
    {
      name: "learner-progress-storage",
    },
  ),
)

function activityPatch(state: LearnerProgress, activity: NewLearnerActivity, now = activity.timestamp ?? Date.now()): Partial<LearnerProgress> {
  const day = localDay(now)
  const days = state.activityDays.includes(day) ? state.activityDays : [...state.activityDays, day].sort()
  const today = localDay(Date.now())
  const cursor = new Date()
  if (!days.includes(today)) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.includes(localDay(cursor.getTime()))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  const record: LearnerActivity = { ...activity, id: crypto.randomUUID(), timestamp: now }
  const badgeForActivity: Partial<Record<LearnerActivity["kind"], string>> = { lesson: "first-lesson", experiment: "first-experiment" }
  const automaticBadge = activity.kind === "quiz" && (activity.score ?? 0) >= 70 ? "quiz-finisher" : activity.kind === "challenge" && activity.xp > 0 ? "challenge-solver" : badgeForActivity[activity.kind]
  return {
    activities: [record, ...state.activities].slice(0, 100),
    activityDays: days,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    xp: state.xp + activity.xp,
    badges: automaticBadge && !state.badges.includes(automaticBadge) ? [...state.badges, automaticBadge] : state.badges,
  }
}

function localDay(timestamp: number) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function lessonHref(lessonId: string) {
  const [unitId, ...slug] = lessonId.split("-")
  return `/curriculum/${unitId}/${lessonId || slug.join("-")}`
}

function snapshot(state: LearnerProgress): LearnerProgress {
  return Object.fromEntries(Object.keys(initialState).map((key) => [key, state[key as keyof LearnerProgress]])) as unknown as LearnerProgress
}
