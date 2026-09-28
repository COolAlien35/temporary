import { askTutor } from "@/lib/ai/tutor"
import { getUnit, units } from "@/lib/curriculum/units"
import type { Unit } from "@/lib/curriculum/types"
import { runCircuit } from "@/lib/sim/run-circuit"
import { assessmentHistory } from "@/lib/assessments/attempts"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { useAssessmentTemplates } from "@/store/use-assessment-templates"
import { useCoursework } from "@/store/use-coursework"
import { useCommunity } from "@/store/use-community"
import { demoAuth } from "./demo-auth"
import type { ExperimentRun, LearnerSummary, LearnerUnit, PlatformServices, RunRequest } from "./contracts"

export type DemoScenario = "success" | "empty" | "failure"
export type DemoFeature = Exclude<keyof PlatformServices, "auth">

export interface DemoOptions {
  delayMs?: number
  scenarios?: Partial<Record<DemoFeature, DemoScenario>>
}

const sampleCohort = {
  cohortId: "sample-2026-fall",
  learnerCount: 128,
  learnersNeedingAttention: ["sample-aisha", "sample-jonah", "sample-sofia", "sample-david"],
  conceptMissRates: { entanglement: 0.31, superposition: 0.24, grover: 0.18 },
}

function learnerUnit(unit: Unit): LearnerUnit {
  return {
    ...unit,
    content_version: 1,
    review_status: "pending",
    is_placeholder: ["u4", "u5", "u6", "u7", "u8"].includes(unit.id),
    lessons: unit.lessons.map((lesson) => ({
      ...lesson,
      checkpoints: lesson.checkpoints.map(({ id, prompt, options }) => ({ id, prompt, options })),
    })),
  }
}

function stableId(request: RunRequest): string {
  const input = JSON.stringify(request)
  let hash = 2166136261
  for (const character of input) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return `demo-run-${(hash >>> 0).toString(36)}`
}

function countsFromProbabilities(probabilities: Record<string, number>, shots: number) {
  const entries = Object.entries(probabilities).map(([key, probability]) => ({ key, exact: probability * shots, count: Math.floor(probability * shots) }))
  let remaining = shots - entries.reduce((total, entry) => total + entry.count, 0)
  entries.sort((a, b) => (b.exact - b.count) - (a.exact - a.count) || a.key.localeCompare(b.key))
  for (const entry of entries) {
    if (remaining-- <= 0) break
    entry.count++
  }
  return Object.fromEntries(entries.map(({ key, count }) => [key, count]))
}

export function createDemoPlatform({ delayMs = 180, scenarios = {} }: DemoOptions = {}): PlatformServices {
  async function prepare(feature: DemoFeature) {
    if (delayMs > 0) await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
    if (scenarios[feature] === "failure") throw new Error(`Demo ${feature} service is temporarily unavailable. Please retry.`)
    return scenarios[feature] === "empty"
  }

  return {
    auth: demoAuth,
    curriculum: {
      async listUnits() { return await prepare("curriculum") ? [] : units.map(learnerUnit) },
      async getUnit(id) { const unit = getUnit(id); return await prepare("curriculum") || !unit ? null : learnerUnit(unit) },
    },
    experiments: {
      async run(request): Promise<ExperimentRun> {
        const empty = await prepare("experiments")
        if (request.backend !== "local") throw new Error(`${request.backend} execution is unavailable in the frontend demo.`)
        if (!Number.isInteger(request.circuit.qubits) || request.circuit.qubits < 1 || request.circuit.qubits > 5) throw new Error("The local simulator supports 1 to 5 qubits.")
        if (!Number.isInteger(request.shots) || request.shots < 1 || request.shots > 10000) throw new Error("Choose between 1 and 10,000 shots.")
        const base = { id: stableId(request), algorithmSlug: request.algorithmSlug, circuit: request.circuit, backend: "local" }
        if (empty) return { ...base, status: "queued" }
        const result = runCircuit(request.circuit.qubits, request.circuit.gates, { shots: request.shots })
        result.counts = countsFromProbabilities(result.probabilities, request.shots)
        return { ...base, status: "completed", result }
      },
    },
    tutor: {
      async respond(request) {
        const empty = await prepare("tutor")
        return { id: `demo-tutor-${request.action}`, role: "tutor", text: empty ? "No demo explanation is available for this request." : askTutor(request.context, request.prompt, request.action), source: "demo" }
      },
    },
    assessments: {
      async listAttempts(learnerId) {
        if (await prepare("assessments")) return []
        const progress = useLearnerProgress.getState()
        const own = progress.activeLearnerId === learnerId || (!progress.activeLearnerId && learnerId === "demo-learner")
        const profile = own ? progress : progress.profiles[learnerId]
        return assessmentHistory(profile ?? null, learnerId, useCoursework.getState().submissions)
      },
      async gradeCodeChallenge(request) {
        const pending = await prepare("assessments")
        if (!request.code.trim()) return { status: "failed", score: null, feedback: ["Enter a solution before submitting."] }
        if (pending) return { status: "pending", score: null, feedback: ["Awaiting a configured remote grader."] }
        return { status: "failed", score: null, feedback: ["Remote code grading is unavailable in this frontend demo. No code was executed."] }
      },
      async listTemplates() { return await prepare("assessments") ? [] : useAssessmentTemplates.getState().templates },
      async saveTemplate(input, id) {
        await prepare("assessments")
        return { id: useAssessmentTemplates.getState().saveTemplate(input, id) }
      },
    },
    progress: {
      async getSummary(learner): Promise<LearnerSummary> {
        const empty = await prepare("progress")
        const progress = useLearnerProgress.getState()
        const ownProgress = !empty && (progress.activeLearnerId === learner.id || (!progress.activeLearnerId && learner.id === "demo-learner"))
        const profile = ownProgress ? progress : progress.profiles[learner.id]
        return { learner, xp: ownProgress ? progress.xp : 0, lessonsCompleted: ownProgress ? progress.lessonsCompleted.length : 0, experimentsCompleted: ownProgress ? Object.values(progress.stagesCompleted).filter((stage) => stage >= 9).length : 0, attempts: !empty ? assessmentHistory(profile ?? null, learner.id, useCoursework.getState().submissions) : [] }
      },
    },
    instructor: {
      async getSummary(cohortId) { return await prepare("instructor") || cohortId !== sampleCohort.cohortId ? null : sampleCohort },
    },
    community: {
      async listThreads(contestId) { return await prepare("community") ? [] : useCommunity.getState().threads.filter((item) => !contestId || item.contestId === contestId) },
      async getThread(id) { return await prepare("community") ? null : useCommunity.getState().threads.find((item) => item.id === id) ?? null },
      async createThread(input) { await prepare("community"); return { id: useCommunity.getState().createThread(input) } },
      async addReply(input) { await prepare("community"); return { id: useCommunity.getState().addReply(input) } },
      async toggleVote(threadId, voterId) { await prepare("community"); useCommunity.getState().toggleVote(threadId, voterId) },
      async enterContest(contestId, learnerId) { await prepare("community"); useCommunity.getState().enterContest(contestId, learnerId) },
      async listEntries(learnerId) { return await prepare("community") ? [] : useCommunity.getState().entries.filter((item) => item.learnerId === learnerId) },
      async listReplies(threadId) { return await prepare("community") ? [] : useCommunity.getState().replies.filter((item) => item.threadId === threadId) },
    },
  }
}

export const demoPlatform = createDemoPlatform()
