import type { CourseworkQuestion } from "@/lib/coursework/types"
import type { StudioCircuit } from "@/lib/studio/types"

export type AssessmentTemplateKind = "quiz" | "code" | "debug"

export interface AssessmentTemplate {
  id: string
  version: number
  kind: AssessmentTemplateKind
  title: string
  unitId: string
  instructions: string
  circuit: StudioCircuit
  circuitSource: string
  questions: CourseworkQuestion[]
  reflectionPrompt: string
  starterCode?: string
  createdAt: number
  updatedAt: number
}

export type AssessmentTemplateInput = Omit<AssessmentTemplate, "id" | "version" | "createdAt" | "updatedAt">
