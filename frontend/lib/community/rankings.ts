import type { ChallengeAttempt, LearnerProgress } from "@/store/use-learner-progress"

export type RankingScope = "global" | "contest" | "module"
export type RankingPeriod = "week" | "all"
export interface RankingRow { id: string; name: string; initials: string; score: number; source: "sample" | "local"; streak: number; badges: string[]; rank: number }

const sampleExplorers = [
  { id: "ari", name: "Ari Vega", xp: 4820, weekXp: 180, streak: 21, badges: ["Top 3 Finisher", "First Blood"], modules: { u1: 96, u2: 91, u3: 95 }, contests: { "entanglement-speed": 100, "measurement-lab": 97, "noise-navigator": 87 } },
  { id: "noah", name: "Noah Singh", xp: 4510, weekXp: 235, streak: 14, badges: ["Module Master"], modules: { u1: 98, u2: 89, u3: 83 }, contests: { "entanglement-speed": 91, "measurement-lab": 95, "noise-navigator": 79 } },
  { id: "lena", name: "Lena Park", xp: 4280, weekXp: 152, streak: 18, badges: ["Debugger", "Community Helper"], modules: { u1: 87, u2: 94, u3: 90 }, contests: { "entanglement-speed": 96, "measurement-lab": 90, "noise-navigator": 84 } },
  { id: "maya", name: "Maya Chen", xp: 3910, weekXp: 120, streak: 12, badges: ["Consistent Learner"], modules: { u1: 91, u2: 82, u3: 79 }, contests: { "entanglement-speed": 85, "measurement-lab": 92, "noise-navigator": 72 } },
  { id: "theo", name: "Theo Brooks", xp: 3680, weekXp: 88, streak: 8, badges: ["Debugger"], modules: { u1: 83, u2: 86, u3: 76 }, contests: { "entanglement-speed": 80, "measurement-lab": 88, "noise-navigator": 69 } },
] as const
const weeklyContestScores: Record<string, Record<string, number>> = { "entanglement-speed": { ari: 92, noah: 88, lena: 96, maya: 0, theo: 80 } }
const weeklyModuleScores: Record<string, Record<string, number>> = { u1: { ari: 92, noah: 96, lena: 0, maya: 85, theo: 80 }, u2: { ari: 88, noah: 82, lena: 91, maya: 0, theo: 78 }, u3: { ari: 90, noah: 0, lena: 86, maya: 75, theo: 0 } }

export function rankingRows(scope: RankingScope, period: RankingPeriod, selectedId: string, progress: LearnerProgress, learnerName: string): RankingRow[] {
  const samples: RankingRow[] = sampleExplorers.map((person) => ({
    id: `sample-${person.id}`, name: person.name, initials: person.name.split(" ").map((word) => word[0]).join(""),
    score: scope === "global" ? period === "week" ? person.weekXp : person.xp : scope === "module" ? period === "week" ? weeklyModuleScores[selectedId]?.[person.id] ?? 0 : person.modules[selectedId as keyof typeof person.modules] ?? 0 : period === "week" ? weeklyContestScores[selectedId]?.[person.id] ?? 0 : person.contests[selectedId as keyof typeof person.contests] ?? 0,
    source: "sample" as const, streak: person.streak, badges: [...person.badges], rank: 0,
  })).filter((person) => person.score > 0)
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  const localScore = scope === "global" ? period === "week" ? (progress.activities ?? []).filter((item) => item.timestamp >= cutoff).reduce((sum, item) => sum + item.xp, 0) : progress.xp ?? 0
    : scope === "module" ? period === "week" ? Math.max(0, ...(progress.assessmentAttempts ?? []).filter((item) => item.kind === "unit-quiz" && item.assessmentId === selectedId && item.submittedAt >= cutoff).map((item) => item.score ?? 0)) : progress.quizScores?.[selectedId] ?? 0
    : Math.max(0, ...(progress.challengeAttempts ?? []).filter((item: ChallengeAttempt) => item.contestId === selectedId && (period === "all" || item.submittedAt >= cutoff)).map((item) => item.score))
  if (localScore > 0) samples.push({ id: "local", name: learnerName, initials: learnerName.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(), score: localScore, source: "local", streak: progress.streak ?? 0, badges: progress.badges ?? [], rank: 0 })
  return samples.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).map((item, index) => ({ ...item, rank: index + 1 }))
}
