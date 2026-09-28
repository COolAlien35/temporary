import type { StudioCircuit } from "@/lib/studio/types"

export interface CourseworkQuestion {
  id: string
  prompt: string
  options: [string, string, string, string]
  correctIndex: number
  explanation: string
}

export interface CourseworkAssignment {
  id: string
  version: number
  supersedesId?: string
  title: string
  unitId: string
  instructions: string
  circuit: StudioCircuit
  circuitSource: string
  questions: CourseworkQuestion[]
  reflectionPrompt: string
  exerciseKind?: "quiz" | "code" | "debug"
  starterCode?: string
  audience: "all" | "email"
  targetEmail?: string
  dueDate?: string
  status: "draft" | "published"
  createdAt: number
  updatedAt: number
  publishedAt?: number
}

export type AssignmentInput = Omit<CourseworkAssignment, "id" | "version" | "supersedesId" | "status" | "createdAt" | "updatedAt" | "publishedAt">

export interface ResponseDraft {
  answers: Record<string, number>
  reflection: string
  codeResponse?: string
  updatedAt: number
}

export interface CourseworkSubmission {
  id: string
  assignmentId: string
  assignmentVersion: number
  learnerId: string
  learnerName: string
  learnerEmail: string
  circuit: StudioCircuit
  questions: CourseworkQuestion[]
  answers: Record<string, number>
  reflection: string
  codeResponse?: string
  correctCount: number
  totalQuestions: number
  submittedAt: number
  instructorFeedback?: string
  feedbackAt?: number
}

export function canAccessAssignment(assignment: CourseworkAssignment, email: string) {
  return assignment.status === "published" && (assignment.audience === "all" || assignment.targetEmail?.toLowerCase() === email.toLowerCase())
}
