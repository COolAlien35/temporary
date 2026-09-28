import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AssessmentTemplate, AssessmentTemplateInput } from "@/lib/assessments/templates"

interface TemplateState {
  templates: AssessmentTemplate[]
  saveTemplate: (input: AssessmentTemplateInput, id?: string) => string
}

export const useAssessmentTemplates = create<TemplateState>()(
  persist((set, get) => ({
    templates: [],
    saveTemplate: (input, id) => {
      const existing = id ? get().templates.find((item) => item.id === id) : undefined
      const templateId = existing?.id ?? crypto.randomUUID()
      const now = Date.now()
      const record: AssessmentTemplate = {
        ...structuredClone(input), id: templateId, version: existing ? existing.version + 1 : 1,
        createdAt: existing?.createdAt ?? now, updatedAt: now,
      }
      set((state) => ({ templates: existing ? state.templates.map((item) => item.id === templateId ? record : item) : [...state.templates, record] }))
      return templateId
    },
  }), { name: "quantumloop-demo-assessment-templates", partialize: (state) => ({ templates: state.templates }) }),
)
