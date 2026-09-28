import type { AssessmentAttempt } from "@/lib/services/contracts"
import type { LearnerProgress } from "@/store/use-learner-progress"
import type { CourseworkSubmission } from "@/lib/coursework/types"

/** Read older browser profiles alongside the shared attempt format. */
export function assessmentHistory(progress: LearnerProgress | null, learnerId: string, submissions: CourseworkSubmission[] = []): AssessmentAttempt[] {
  const current = progress?.assessmentAttempts ?? []
  const seen = new Set(current.filter((item) => item.kind === "circuit-challenge").map((item) => item.id))
  const legacyCircuits = (progress?.challengeAttempts ?? []).filter((item) => !seen.has(item.id)).map((item): AssessmentAttempt => ({
    id: item.id, assessmentId: item.challengeId, learnerId, kind: "circuit-challenge", score: item.score,
    status: "graded", passed: item.passed, submittedAt: item.submittedAt, feedback: item.feedback,
    snapshot: { circuit: item.circuit, probabilities: item.probabilities },
  }))
  const legacyQuizzes = Object.entries(progress?.quizAttempts ?? {}).flatMap(([unitId, attempts]) => attempts
    .filter((item) => !current.some((existing) => existing.kind === "unit-quiz" && existing.assessmentId === unitId && existing.submittedAt === item.attemptedAt))
    .map((item, index): AssessmentAttempt => ({
      id: `legacy-${unitId}-${item.attemptedAt}-${index}`, assessmentId: unitId, learnerId, kind: "unit-quiz",
      score: item.score, status: "graded", passed: item.passed, submittedAt: item.attemptedAt,
      feedback: [item.passed ? "Passed" : "Review recommended"],
    })))
  const legacyAssignments = submissions.filter((item) => item.learnerId === learnerId && !current.some((attempt) => attempt.id === item.id)).map((item): AssessmentAttempt => ({
    id: item.id, assessmentId: item.assignmentId, learnerId, kind: "assignment", score: Math.round(item.correctCount / item.totalQuestions * 100),
    status: item.instructorFeedback ? "graded" : "pending", passed: null, submittedAt: item.submittedAt,
    feedback: ["Quiz auto-scored; written and code responses await instructor review.", ...(item.instructorFeedback ? [item.instructorFeedback] : [])],
    snapshot: { circuit: item.circuit, answers: item.answers, code: item.codeResponse },
  }))
  return [...current, ...legacyCircuits, ...legacyQuizzes, ...legacyAssignments].sort((a, b) => b.submittedAt - a.submittedAt)
}
