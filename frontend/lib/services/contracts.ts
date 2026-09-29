import type { StudioCircuit, SimResult } from "@/lib/studio/types"
import type { Checkpoint, Lesson, Unit } from "@/lib/curriculum/types"
import type { TutorAction, TutorContext } from "@/lib/ai/tutor"
import type { AssessmentTemplate, AssessmentTemplateInput } from "@/lib/assessments/templates"
import type { CommunityReply, CommunityThread, ContestEntry, NewReply, NewThread } from "@/lib/community/types"

export type UserRole = "learner" | "instructor"

export type LearnerCheckpoint = Pick<Checkpoint, "id" | "prompt" | "options">
export type LearnerLesson = Omit<Lesson, "checkpoints"> & { checkpoints: LearnerCheckpoint[] }
export type LearnerUnit = Omit<Unit, "lessons"> & {
  lessons: LearnerLesson[]
  review_status: string
  is_placeholder: boolean
  content_version: number
}

export type ComparisonBasis = "ideal_probability" | "noisy_probability" | "sampled_frequency"

/** All vector entries are probabilities in [0, 1], ordered by basis_labels. */
export interface PredictionSubmission {
  schema_version: 1
  lesson_id: string
  lesson_version: number
  learning_session_id: string
  prediction_vector: number[]
  basis_labels: string[]
  /** Left-to-right bitstring position to circuit qubit index. */
  measurement_qubits: number[]
  comparison_basis: ComparisonBasis
  confidence?: number | null
}

export interface PredictionPair {
  schema_version: 1
  prediction_id: string
  run_id: string
  prediction_vector: number[]
  simulated_vector: number[]
  basis_labels: string[]
  measurement_qubits: number[]
  comparison_basis: ComparisonBasis
  metric_version: "tvd-v1"
  prediction_match: number
  backend: string
  shots?: number | null
  seed?: number | null
  circuit_revision: number
}

export interface LearningPreferences {
  focus: "foundations" | "algorithms" | "hardware"
  pace: "guided" | "self-paced"
  reduceMotion: boolean
}

export interface LearnerIdentity {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface AuthResult {
  user: LearnerIdentity
  mode: "demo" | "connected"
  preferences?: LearningPreferences
}

export type ResetLinkState = "valid" | "expired" | "invalid" | "unavailable"

export interface ResetLinkResult {
  state: ResetLinkState
  email?: string
}

export interface LessonRecord {
  id: string
  unitId: string
  title: string
  reviewStatus: "draft" | "faculty-reviewed"
}

export interface ExperimentRun {
  id: string
  algorithmSlug: string
  circuit: StudioCircuit
  backend: string
  status: "queued" | "running" | "completed" | "failed"
  result?: SimResult
  error?: string
}

export interface TutorMessage {
  id: string
  role: "learner" | "tutor"
  text: string
  source: "demo" | "service"
}

export interface AssessmentAttempt {
  id: string
  assessmentId: string
  learnerId: string
  kind: "unit-quiz" | "circuit-challenge" | "lab-challenge" | "code-challenge" | "assignment"
  score: number | null
  status: "pending" | "graded" | "failed"
  passed: boolean | null
  submittedAt: number
  feedback: string[]
  snapshot?: { circuit?: StudioCircuit; code?: string; answers?: Record<string, number>; probabilities?: Record<string, number> }
}

export interface CodeGradeRequest {
  challengeId: string
  learnerId: string
  code: string
}

export interface CodeGradeResult {
  status: "pending" | "graded" | "failed"
  score: number | null
  feedback: string[]
  jobId?: string
}

export interface LearnerSummary {
  learner: LearnerIdentity
  xp: number
  lessonsCompleted: number
  experimentsCompleted: number
  attempts: AssessmentAttempt[]
}

export interface InstructorSummary {
  cohortId: string
  learnerCount: number
  learnersNeedingAttention: string[]
  conceptMissRates: Record<string, number>
}

export interface AuthService {
  signIn(email: string, password: string): Promise<AuthResult>
  signUp(name: string, email: string, password: string): Promise<AuthResult>
  requestPasswordReset(email: string): Promise<{ delivered: boolean; message: string }>
  inspectResetLink(token: string): Promise<ResetLinkResult>
  confirmPasswordReset(token: string, password: string): Promise<void>
}

export interface RunRequest {
  algorithmSlug: string
  circuit: StudioCircuit
  backend: "local" | "qiskit-aer" | "pennylane" | "cirq" | "qbraid"
  shots: number
}

export interface TutorRequest {
  context: TutorContext
  prompt: string
  action: TutorAction
}

export interface PlatformServices {
  auth: AuthService
  curriculum: {
    listUnits(): Promise<LearnerUnit[]>
    getUnit(id: string): Promise<LearnerUnit | null>
  }
  experiments: { run(request: RunRequest): Promise<ExperimentRun> }
  tutor: { respond(request: TutorRequest): Promise<TutorMessage> }
  assessments: {
    listAttempts(learnerId: string): Promise<AssessmentAttempt[]>
    gradeCodeChallenge(request: CodeGradeRequest): Promise<CodeGradeResult>
    listTemplates(): Promise<AssessmentTemplate[]>
    saveTemplate(input: AssessmentTemplateInput, id?: string): Promise<{ id: string }>
  }
  progress: { getSummary(learner: LearnerIdentity): Promise<LearnerSummary> }
  instructor: { getSummary(cohortId: string): Promise<InstructorSummary | null> }
  community: {
    listThreads(contestId?: string): Promise<CommunityThread[]>
    getThread(id: string): Promise<CommunityThread | null>
    createThread(input: NewThread): Promise<{ id: string }>
    addReply(input: NewReply): Promise<{ id: string }>
    toggleVote(threadId: string, voterId: string): Promise<void>
    enterContest(contestId: string, learnerId: string): Promise<void>
    listEntries(learnerId: string): Promise<ContestEntry[]>
    listReplies(threadId: string): Promise<CommunityReply[]>
  }
}
