import { units } from "@/lib/curriculum/units"
import type { LearnerProgress } from "@/store/use-learner-progress"

export function getLearnerRecommendation(progress: LearnerProgress) {
  const latestQuiz = Object.entries(progress.quizAttempts).flatMap(([unitId, attempts]) => {
    const attempt = attempts[attempts.length - 1]
    return attempt ? [{ unitId, ...attempt }] : []
  }).sort((a, b) => b.attemptedAt - a.attemptedAt)[0]
  const latestChallengeById = new Map<string, (typeof progress.challengeAttempts)[number]>()
  for (const attempt of progress.challengeAttempts) latestChallengeById.set(attempt.challengeId, attempt)
  const latestFailedChallenge = [...latestChallengeById.values()].filter((attempt) => !attempt.passed).sort((a, b) => b.submittedAt - a.submittedAt)[0]
  const latestActivity = progress.activities[0]
  const quizFailureIsCurrent = latestQuiz && !latestQuiz.passed && latestActivity?.kind === "quiz" && latestActivity.title === `${latestQuiz.unitId.toUpperCase()} quiz`
  const challengeFailureIsCurrent = latestFailedChallenge && latestActivity?.kind === "challenge" && latestActivity.href.endsWith(`/attempts/${latestFailedChallenge.id}`)
  if (quizFailureIsCurrent && (!challengeFailureIsCurrent || latestQuiz.attemptedAt >= latestFailedChallenge.submittedAt)) {
    const failedQuiz = latestQuiz
    const unit = units.find((item) => item.id === failedQuiz.unitId)
    return { title: `${unit?.title ?? "Unit"} knowledge check`, reason: `Your last score was ${failedQuiz.score}%. Review the quiz explanations, then retry.`, href: `/curriculum/${failedQuiz.unitId}/quiz`, action: "Review quiz" }
  }
  if (challengeFailureIsCurrent) {
    return { title: "Retry your circuit challenge", reason: "Your latest submission did not meet every target. Adjust the circuit and run it again.", href: `/challenges/${latestFailedChallenge.challengeId}`, action: "Continue challenge" }
  }

  if (progress.lastLessonId && !progress.lessonsCompleted.includes(progress.lastLessonId)) {
    for (const unit of units) {
      const lesson = unit.lessons.find((item) => item.id === progress.lastLessonId)
      if (lesson) return { title: lesson.title, reason: `Pick up where you left off in ${unit.title}.`, href: `/curriculum/${unit.id}/${lesson.id}`, action: "Resume lesson" }
    }
  }

  for (const unit of units) {
    if (!unit.prerequisites.every((prerequisite) => units.find((item) => item.id === prerequisite)?.lessons.every((lesson) => progress.lessonsCompleted.includes(lesson.id)))) continue
    const lesson = unit.lessons.find((item) => !progress.lessonsCompleted.includes(item.id))
    if (lesson) return { title: lesson.title, reason: progress.lessonsCompleted.length ? `Continue your learning path in ${unit.title}.` : "Start with the foundations. This lesson introduces qubits and measurement.", href: `/curriculum/${unit.id}/${lesson.id}`, action: progress.lastLessonId ? "Resume lesson" : "Start first lesson" }
    if (!progress.quizzesCompleted.includes(unit.id)) return { title: `${unit.title} quiz`, reason: "You have completed this unit’s lessons. Check your understanding with a short quiz.", href: `/curriculum/${unit.id}/quiz`, action: "Take unit quiz" }
  }

  return { title: "Explore a circuit challenge", reason: "Your curriculum path is up to date. Apply your skills in a simulator-graded challenge.", href: "/challenges", action: "Browse challenges" }
}
