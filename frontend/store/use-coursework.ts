import { create } from "zustand"
import { persist } from "zustand/middleware"
import { canAccessAssignment, type AssignmentInput, type CourseworkAssignment, type CourseworkSubmission, type ResponseDraft } from "@/lib/coursework/types"
import type { LearnerIdentity } from "@/lib/services/contracts"
import { useLearnerProgress } from "@/store/use-learner-progress"

const draftKey = (assignmentId: string, learnerId: string) => `${assignmentId}:${learnerId}`

interface CourseworkState {
  assignments: CourseworkAssignment[]
  submissions: CourseworkSubmission[]
  responseDrafts: Record<string, ResponseDraft>
  createDraft: (input: AssignmentInput) => string
  updateDraft: (id: string, input: AssignmentInput) => void
  publish: (id: string) => void
  duplicateAsDraft: (id: string) => string | null
  saveResponseDraft: (assignmentId: string, learnerId: string, answers: Record<string, number>, reflection: string, codeResponse?: string) => void
  submitResponse: (assignment: CourseworkAssignment, learner: LearnerIdentity, answers: Record<string, number>, reflection: string, codeResponse?: string) => string
  saveFeedback: (submissionId: string, feedback: string) => void
}

export const useCoursework = create<CourseworkState>()(
  persist(
    (set, get) => ({
      assignments: [],
      submissions: [],
      responseDrafts: {},
      createDraft: (input) => {
        const id = crypto.randomUUID()
        const now = Date.now()
        set((state) => ({ assignments: [...state.assignments, { ...input, id, version: 1, status: "draft", createdAt: now, updatedAt: now }] }))
        return id
      },
      updateDraft: (id, input) => set((state) => ({ assignments: state.assignments.map((assignment) => assignment.id === id && assignment.status === "draft" ? { ...assignment, ...input, updatedAt: Date.now() } : assignment) })),
      publish: (id) => set((state) => ({ assignments: state.assignments.map((assignment) => assignment.id === id && assignment.status === "draft" ? { ...assignment, status: "published", publishedAt: Date.now(), updatedAt: Date.now() } : assignment) })),
      duplicateAsDraft: (id) => {
        const original = get().assignments.find((item) => item.id === id)
        if (!original) return null
        const duplicateId = crypto.randomUUID()
        const now = Date.now()
        set((state) => ({ assignments: [...state.assignments, { ...original, id: duplicateId, version: original.version + 1, supersedesId: original.id, status: "draft", createdAt: now, updatedAt: now, publishedAt: undefined }] }))
        return duplicateId
      },
      saveResponseDraft: (assignmentId, learnerId, answers, reflection, codeResponse) => set((state) => ({ responseDrafts: { ...state.responseDrafts, [draftKey(assignmentId, learnerId)]: { answers, reflection, codeResponse, updatedAt: Date.now() } } })),
      submitResponse: (assignment, learner, answers, reflection, codeResponse) => {
        const current = get().assignments.find((item) => item.id === assignment.id)
        if (!current || !canAccessAssignment(current, learner.email)) throw new Error("This assignment is not available to this learner.")
        if (assignment.questions.some((question) => answers[question.id] === undefined)) throw new Error("Answer every quiz question before submitting.")
        if (!reflection.trim()) throw new Error("Add your written response before submitting.")
        if (assignment.exerciseKind === "code" && !codeResponse?.trim()) throw new Error("Add your code response before submitting.")
        const id = crypto.randomUUID()
        const submission: CourseworkSubmission = {
          id,
          assignmentId: assignment.id,
          assignmentVersion: assignment.version,
          learnerId: learner.id,
          learnerName: learner.name,
          learnerEmail: learner.email,
          circuit: structuredClone(assignment.circuit),
          questions: structuredClone(assignment.questions),
          answers: { ...answers },
          reflection: reflection.trim(),
          codeResponse: assignment.exerciseKind === "code" ? codeResponse?.trim() : undefined,
          correctCount: assignment.questions.filter((question) => answers[question.id] === question.correctIndex).length,
          totalQuestions: assignment.questions.length,
          submittedAt: Date.now(),
        }
        set((state) => {
          const responseDrafts = { ...state.responseDrafts }
          delete responseDrafts[draftKey(assignment.id, learner.id)]
          return { submissions: [...state.submissions, submission], responseDrafts }
        })
        return id
      },
      saveFeedback: (submissionId, feedback) => {
        const submission = get().submissions.find((item) => item.id === submissionId)
        set((state) => ({ submissions: state.submissions.map((item) => item.id === submissionId ? { ...item, instructorFeedback: feedback.trim(), feedbackAt: Date.now() } : item) }))
        if (submission) useLearnerProgress.getState().updateAssessmentAttempt(submission.learnerId, submissionId, feedback.trim())
      },
    }),
    { name: "quantumloop-demo-coursework", partialize: (state) => ({ assignments: state.assignments, submissions: state.submissions, responseDrafts: state.responseDrafts }) },
  ),
)
