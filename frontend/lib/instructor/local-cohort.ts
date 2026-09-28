import { getQuizQuestions } from "@/lib/curriculum/questions"
import { getUnit } from "@/lib/curriculum/units"
import { assessmentHistory } from "@/lib/assessments/attempts"
import type { CourseworkSubmission } from "@/lib/coursework/types"
import type { AssessmentAttempt } from "@/lib/services/contracts"
import type { LearnerProgress } from "@/store/use-learner-progress"

export interface LocalStudent {
  id: string
  name: string
  email: string | null
  progress: LearnerProgress | null
  attempts: AssessmentAttempt[]
  submissions: CourseworkSubmission[]
  latestActivity: number | null
  latestScore: number | null
  needsAttention: boolean
  attentionReason: string | null
}

export interface MissedQuestion {
  id: string
  unitId: string
  prompt: string
  concept: string
  missedAttempts: number
  affectedLearners: string[]
  lessonHref: string
  challengeHref: string | null
}

const challengeForConcept: Record<string, string> = {
  superposition: "/challenges/balanced-qubit",
  measurement: "/challenges/balanced-qubit",
  gates: "/challenges/flip-the-bit",
  circuits: "/challenges/flip-the-bit",
  entanglement: "/challenges/bell-pair",
  correlations: "/challenges/bell-pair",
  "no-signalling": "/challenges/bell-pair",
}

export function buildLocalCohort(
  names: Record<string, { name: string }>,
  progressState: LearnerProgress & { activeLearnerId: string | null; profiles: Record<string, LearnerProgress> },
  submissions: CourseworkSubmission[],
): LocalStudent[] {
  const ids = new Set([...Object.keys(names), ...Object.keys(progressState.profiles), ...submissions.map((item) => item.learnerId)])
  if (!progressState.activeLearnerId && (progressState.activities.length || progressState.lessonsCompleted.length || progressState.assessmentAttempts?.length)) ids.add("demo-learner")
  if (progressState.activeLearnerId) ids.add(progressState.activeLearnerId)
  return [...ids].filter((id) => id.startsWith("demo-")).map((id) => {
    const progress = progressState.activeLearnerId === id || (!progressState.activeLearnerId && id === "demo-learner") ? progressState : progressState.profiles[id] ?? null
    const ownSubmissions = submissions.filter((item) => item.learnerId === id).sort((a, b) => b.submittedAt - a.submittedAt)
    const attempts = assessmentHistory(progress, id, ownSubmissions)
    const latestScore = attempts.find((item) => item.score !== null)?.score ?? (ownSubmissions[0] ? Math.round(ownSubmissions[0].correctCount / ownSubmissions[0].totalQuestions * 100) : null)
    const recentFailures = attempts.slice(0, 5).filter((item) => item.status === "graded" && item.passed === false).length
    const needsAttention = recentFailures >= 2 || (latestScore !== null && latestScore < 70)
    const latestActivity = Math.max(0, ...[...(progress?.activities ?? []).map((item) => item.timestamp), ...attempts.map((item) => item.submittedAt), ...ownSubmissions.map((item) => item.submittedAt)]) || null
    const email = id === "demo-learner" ? null : id.slice(5)
    return {
      id, name: names[id]?.name ?? ownSubmissions[0]?.learnerName ?? (email ? email.split("@")[0].replace(/[._-]/g, " ") : "Guest learner"),
      email, progress, attempts, submissions: ownSubmissions, latestActivity, latestScore, needsAttention,
      attentionReason: recentFailures >= 2 ? `${recentFailures} recent assessments below the pass mark` : latestScore !== null && latestScore < 70 ? `Latest score ${latestScore}%` : null,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
}

export function buildMissedQuestions(students: LocalStudent[]): MissedQuestion[] {
  const grouped = new Map<string, MissedQuestion>()
  for (const student of students) {
    for (const attempt of student.attempts.filter((item) => item.kind === "unit-quiz" && item.snapshot?.answers)) {
      for (const question of getQuizQuestions(attempt.assessmentId)) {
        if (attempt.snapshot?.answers?.[question.id] === question.answer) continue
        const key = `${attempt.assessmentId}:${question.id}`
        const existing = grouped.get(key) ?? {
          id: key, unitId: attempt.assessmentId, prompt: question.prompt, concept: question.tags[0] ?? getUnit(attempt.assessmentId)?.title ?? attempt.assessmentId,
          missedAttempts: 0, affectedLearners: [], lessonHref: `/curriculum/${attempt.assessmentId}`,
          challengeHref: challengeForConcept[question.tags[0] ?? ""] ?? null,
        }
        existing.missedAttempts += 1
        if (!existing.affectedLearners.includes(student.id)) existing.affectedLearners.push(student.id)
        grouped.set(key, existing)
      }
    }
    for (const submission of student.submissions) {
      for (const question of submission.questions) {
        if (submission.answers[question.id] === question.correctIndex) continue
        const key = `${submission.assignmentId}:${question.id}`
        const existing = grouped.get(key) ?? {
          id: key, unitId: submission.assignmentId, prompt: question.prompt, concept: "Assignment question",
          missedAttempts: 0, affectedLearners: [], lessonHref: `/instructor/assignments/${submission.assignmentId}`,
          challengeHref: null,
        }
        existing.missedAttempts += 1
        if (!existing.affectedLearners.includes(student.id)) existing.affectedLearners.push(student.id)
        grouped.set(key, existing)
      }
    }
  }
  return [...grouped.values()].sort((a, b) => b.affectedLearners.length - a.affectedLearners.length || b.missedAttempts - a.missedAttempts)
}
