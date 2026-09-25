"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Atom,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Copy,
  Eye,
  Gauge,
  HelpCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react"
import { units } from "@/lib/curriculum/units"
import {
  batchOptions,
  misconceptionOptions,
  quizAnalytics,
  questionBank as seedQuestionBank,
  quizzes as seedQuizzes,
  type AssignmentMode,
  type BankQuestion,
  type Quiz,
  type QuizStatus,
  type QuestionType,
} from "@/lib/instructor-quizzes"
import { students as rosterStudents } from "@/lib/instructor-students"

/* --------------------------------- Constants -------------------------------- */

type StatusTab = "All" | QuizStatus
type EditorTab = "Details" | "Questions" | "Assignment"
type AddMode = null | "bank" | "new"

const STATUS_TABS: StatusTab[] = ["All", "Active", "Draft", "Closed"]
const EDITOR_TABS: EditorTab[] = ["Details", "Questions", "Assignment"]
const QUESTION_TYPES: QuestionType[] = ["Multiple Choice", "Numeric", "Circuit-Based"]

const statusStyles: Record<QuizStatus, { text: string; bg: string; dot: string }> = {
  Active: { text: "text-[#4ADE80]", bg: "bg-[#4ADE80]/12", dot: "#4ADE80" },
  Draft: { text: "text-[#F5B942]", bg: "bg-[#F5B942]/12", dot: "#F5B942" },
  Closed: { text: "text-white/60", bg: "bg-white/10", dot: "#9CA3AF" },
}

const typeStyles: Record<QuestionType, string> = {
  "Multiple Choice": "#00D4FF",
  Numeric: "#A78BFA",
  "Circuit-Based": "#F5B942",
}

function unitTitle(unitId: string) {
  return units.find((u) => u.id === unitId)?.title ?? unitId
}

let uidCounter = 0
function uid(prefix: string) {
  uidCounter += 1
  return `${prefix}-${Date.now()}-${uidCounter}`
}

/* ------------------------------ Shared building blocks ------------------------------ */

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Users
  accent: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[.16em] text-white/45">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
          <p className="mt-1 text-xs text-white/45">{detail}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}18`, color: accent }}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="absolute -bottom-10 -right-8 size-24 rounded-full blur-2xl" style={{ backgroundColor: `${accent}12` }} />
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  actionLabel,
  onAction,
}: {
  eyebrow?: string
  title: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-[11px] uppercase tracking-[.22em] text-[#00D4FF]">{eyebrow}</p>}
        <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-1.5 rounded-lg border border-[#00D4FF]/40 bg-[#00D4FF]/10 px-3 py-2 text-xs font-semibold text-[#00D4FF] transition hover:bg-[#00D4FF]/20"
        >
          <Plus className="size-3.5" /> {actionLabel}
        </button>
      )}
    </div>
  )
}

function FilterPillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: T[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-[.14em] text-white/35">{label}</span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-lg border px-3 py-1.5 text-xs transition ${
            value === option ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/50 hover:text-white"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: QuizStatus }) {
  const style = statusStyles[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${style.text} ${style.bg}`}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
      {status}
    </span>
  )
}

function TypeBadge({ type }: { type: QuestionType }) {
  const color = typeStyles[type]
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ color, backgroundColor: `${color}18` }}
    >
      {type}
    </span>
  )
}

function ProgressBar({ value, color = "#00D4FF" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }} />
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-white/50">{children}</span>
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00D4FF]/40"
const selectClass = "rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#00D4FF]/40"
const textareaClass = `${inputClass} min-h-20 resize-none`
const ghostBtn =
  "rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-[#00D4FF]/40 hover:text-[#00D4FF]"
const dangerGhostBtn =
  "rounded-lg border border-[#FB7185]/30 px-3 py-1.5 text-xs font-medium text-[#FB7185] transition hover:bg-[#FB7185]/10"

function ModalShell({
  onClose,
  title,
  eyebrow,
  maxWidth = "max-w-md",
  children,
  footer,
}: {
  onClose: () => void
  title: string
  eyebrow: string
  maxWidth?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className={`relative flex max-h-[85vh] w-full ${maxWidth} flex-col rounded-2xl border border-white/10 bg-[#0f1420] shadow-2xl`}>
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-6">
          <div>
            <p className="text-xs uppercase tracking-[.16em] text-[#00D4FF]">{eyebrow}</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-white/40 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-white/10 p-4">{footer}</div>}
      </div>
    </div>
  )
}

/* --------------------------------- Quiz draft --------------------------------- */

type QuizDraft = {
  id: string
  title: string
  unitId: string
  timeLimitText: string
  passMark: number
  instructions: string
  status: QuizStatus
  questionIds: string[]
  assignment: {
    mode: AssignmentMode
    batch: (typeof batchOptions)[number]
    studentIds: string[]
    dueDate: string
    allowRetakes: boolean
    maxRetakes: number
    latePenalty: boolean
    latePenaltyPercent: number
  }
}

function quizToDraft(quiz: Quiz): QuizDraft {
  return {
    id: quiz.id,
    title: quiz.title,
    unitId: quiz.unitId,
    timeLimitText: quiz.timeLimit != null ? String(quiz.timeLimit) : "",
    passMark: quiz.passMark,
    instructions: quiz.instructions,
    status: quiz.status,
    questionIds: [...quiz.questionIds],
    assignment: {
      mode: quiz.assignment.mode,
      batch: quiz.assignment.batch ?? batchOptions[0],
      studentIds: [...quiz.assignment.studentIds],
      dueDate: quiz.assignment.dueDate,
      allowRetakes: quiz.assignment.allowRetakes,
      maxRetakes: quiz.assignment.maxRetakes,
      latePenalty: quiz.assignment.latePenalty,
      latePenaltyPercent: quiz.assignment.latePenaltyPercent,
    },
  }
}

function emptyQuizDraft(): QuizDraft {
  return {
    id: uid("quiz"),
    title: "",
    unitId: units[0].id,
    timeLimitText: "",
    passMark: 70,
    instructions: "",
    status: "Draft",
    questionIds: [],
    assignment: {
      mode: "cohort",
      batch: batchOptions[0],
      studentIds: [],
      dueDate: "",
      allowRetakes: true,
      maxRetakes: 1,
      latePenalty: false,
      latePenaltyPercent: 10,
    },
  }
}

function draftToQuiz(draft: QuizDraft): Quiz {
  const timeLimit = draft.timeLimitText.trim() === "" ? null : Number(draft.timeLimitText)
  return {
    id: draft.id,
    title: draft.title,
    unitId: draft.unitId,
    questionIds: draft.questionIds,
    timeLimit: Number.isFinite(timeLimit) ? timeLimit : null,
    passMark: draft.passMark,
    instructions: draft.instructions,
    status: draft.status,
    assignment: {
      mode: draft.assignment.mode,
      batch: draft.assignment.mode === "batch" ? draft.assignment.batch : undefined,
      studentIds: draft.assignment.mode === "students" ? draft.assignment.studentIds : [],
      dueDate: draft.assignment.dueDate,
      allowRetakes: draft.assignment.allowRetakes,
      maxRetakes: draft.assignment.maxRetakes,
      latePenalty: draft.assignment.latePenalty,
      latePenaltyPercent: draft.assignment.latePenaltyPercent,
    },
  }
}

/* ------------------------------- Question draft form ------------------------------- */

type QuestionDraft = {
  id: string | null
  unitId: string
  type: QuestionType
  prompt: string
  options: string[]
  correctIndex: number
  numericAnswer: string
  tolerance: string
  circuitDescription: string
  targetDistribution: string
  explanation: string
  tagsText: string
  misconception: string
  xp: number
}

function emptyQuestionDraft(unitId: string): QuestionDraft {
  return {
    id: null,
    unitId,
    type: "Multiple Choice",
    prompt: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    numericAnswer: "",
    tolerance: "",
    circuitDescription: "",
    targetDistribution: "",
    explanation: "",
    tagsText: "",
    misconception: "",
    xp: 2,
  }
}

function bankQuestionToDraft(q: BankQuestion): QuestionDraft {
  return {
    id: q.id,
    unitId: q.unitId,
    type: q.type,
    prompt: q.prompt,
    options: q.options ? [...q.options] : ["", "", "", ""],
    correctIndex: q.answer ?? 0,
    numericAnswer: q.numericAnswer ?? "",
    tolerance: q.tolerance ?? "",
    circuitDescription: q.circuitDescription ?? "",
    targetDistribution: q.targetDistribution ?? "",
    explanation: q.explanation,
    tagsText: q.tags.join(", "),
    misconception: q.misconception ?? "",
    xp: q.xp,
  }
}

function draftToBankQuestion(draft: QuestionDraft, existing?: BankQuestion): BankQuestion {
  return {
    id: draft.id ?? uid("bq"),
    unitId: draft.unitId,
    type: draft.type,
    prompt: draft.prompt,
    options: draft.type === "Multiple Choice" ? draft.options.filter((o) => o.trim() !== "") : undefined,
    answer: draft.type === "Multiple Choice" ? draft.correctIndex : undefined,
    numericAnswer: draft.type === "Numeric" ? draft.numericAnswer : undefined,
    tolerance: draft.type === "Numeric" ? draft.tolerance : undefined,
    circuitDescription: draft.type === "Circuit-Based" ? draft.circuitDescription : undefined,
    targetDistribution: draft.type === "Circuit-Based" ? draft.targetDistribution : undefined,
    explanation: draft.explanation,
    tags: draft.tagsText.split(",").map((t) => t.trim()).filter(Boolean),
    misconception: draft.misconception || undefined,
    xp: draft.xp,
    usageCount: existing?.usageCount ?? 0,
    avgCorrect: existing?.avgCorrect ?? 0,
  }
}

function QuestionForm({
  draft,
  setDraft,
}: {
  draft: QuestionDraft
  setDraft: (updater: (d: QuestionDraft) => QuestionDraft) => void
}) {
  function updateOption(index: number, value: string) {
    setDraft((d) => ({ ...d, options: d.options.map((o, i) => (i === index ? value : o)) }))
  }
  function addOption() {
    setDraft((d) => ({ ...d, options: [...d.options, ""] }))
  }
  function removeOption(index: number) {
    setDraft((d) => ({
      ...d,
      options: d.options.filter((_, i) => i !== index),
      correctIndex: d.correctIndex >= index && d.correctIndex > 0 ? d.correctIndex - 1 : d.correctIndex,
    }))
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/8 bg-black/15 p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Question type</FieldLabel>
          <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as QuestionType }))} className={selectClass}>
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type} className="bg-[#0f1420]">
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Unit</FieldLabel>
          <select value={draft.unitId} onChange={(e) => setDraft((d) => ({ ...d, unitId: e.target.value }))} className={selectClass}>
            {units.map((u) => (
              <option key={u.id} value={u.id} className="bg-[#0f1420]">
                {u.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <FieldLabel>Prompt</FieldLabel>
        <textarea value={draft.prompt} onChange={(e) => setDraft((d) => ({ ...d, prompt: e.target.value }))} className={textareaClass} placeholder="Question text" />
      </label>

      {draft.type === "Multiple Choice" && (
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Options — select the correct answer</FieldLabel>
          <div className="flex flex-col gap-2">
            {draft.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${draft.id ?? "new"}`}
                  checked={draft.correctIndex === index}
                  onChange={() => setDraft((d) => ({ ...d, correctIndex: index }))}
                  className="size-4 accent-[#00D4FF]"
                />
                <input value={option} onChange={(e) => updateOption(index, e.target.value)} className={inputClass} placeholder={`Option ${index + 1}`} />
                <button type="button" onClick={() => removeOption(index)} className="shrink-0 rounded-md p-1.5 text-white/40 hover:text-[#FB7185]">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addOption} className="flex items-center gap-1.5 self-start text-xs text-[#00D4FF] hover:text-white">
              <Plus className="size-3.5" /> Add option
            </button>
          </div>
        </div>
      )}

      {draft.type === "Numeric" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Correct numeric answer</FieldLabel>
            <input value={draft.numericAnswer} onChange={(e) => setDraft((d) => ({ ...d, numericAnswer: e.target.value }))} className={inputClass} placeholder="e.g. 0.64" />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Tolerance</FieldLabel>
            <input value={draft.tolerance} onChange={(e) => setDraft((d) => ({ ...d, tolerance: e.target.value }))} className={inputClass} placeholder="e.g. 0.02" />
          </label>
        </div>
      )}

      {draft.type === "Circuit-Based" && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Expected circuit description</FieldLabel>
            <textarea
              value={draft.circuitDescription}
              onChange={(e) => setDraft((d) => ({ ...d, circuitDescription: e.target.value }))}
              className={textareaClass}
              placeholder="e.g. Apply H to qubit 0, then CNOT(0 → 1)"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Target distribution</FieldLabel>
            <input
              value={draft.targetDistribution}
              onChange={(e) => setDraft((d) => ({ ...d, targetDistribution: e.target.value }))}
              className={inputClass}
              placeholder="e.g. 00: 0.5, 11: 0.5"
            />
          </label>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <FieldLabel>Explanation</FieldLabel>
        <textarea value={draft.explanation} onChange={(e) => setDraft((d) => ({ ...d, explanation: e.target.value }))} className={textareaClass} placeholder="Shown after submission" />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="col-span-2 flex flex-col gap-1.5">
          <FieldLabel>Tags (comma-separated)</FieldLabel>
          <input value={draft.tagsText} onChange={(e) => setDraft((d) => ({ ...d, tagsText: e.target.value }))} className={inputClass} placeholder="e.g. superposition, measurement" />
        </label>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>XP value</FieldLabel>
          <input type="number" value={draft.xp} onChange={(e) => setDraft((d) => ({ ...d, xp: Number(e.target.value) || 0 }))} className={inputClass} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <FieldLabel>Misconception link</FieldLabel>
        <select value={draft.misconception} onChange={(e) => setDraft((d) => ({ ...d, misconception: e.target.value }))} className={selectClass}>
          <option value="" className="bg-[#0f1420]">
            None
          </option>
          {misconceptionOptions.map((m) => (
            <option key={m} value={m} className="bg-[#0f1420]">
              {m}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

/* --------------------------------- Question list item --------------------------------- */

function QuestionListItem({
  index,
  question,
  onEdit,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  index: number
  question: BankQuestion
  onEdit: () => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 shrink-0 text-xs font-semibold text-white/40">Q{index + 1}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={question.type} />
              {question.misconception && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FB7185]/12 px-2 py-0.5 text-[10px] font-medium text-[#FB7185]">
                  <AlertTriangle className="size-2.5" /> Misconception: {question.misconception}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm font-medium text-white">{question.prompt}</p>

            {question.type === "Multiple Choice" && question.options && (
              <div className="mt-2 flex flex-col gap-1">
                {question.options.map((option, i) => (
                  <p
                    key={i}
                    className={`rounded-md px-2 py-1 text-xs ${
                      i === question.answer ? "bg-[#4ADE80]/12 text-[#4ADE80]" : "text-white/50"
                    }`}
                  >
                    {option}
                  </p>
                ))}
              </div>
            )}
            {question.type === "Numeric" && (
              <p className="mt-2 text-xs text-white/50">
                Correct answer: <span className="text-[#4ADE80]">{question.numericAnswer}</span> ± {question.tolerance}
              </p>
            )}
            {question.type === "Circuit-Based" && (
              <p className="mt-2 text-xs text-white/50">Expected: {question.circuitDescription}</p>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5">
              {question.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={!canMoveUp} className="rounded-md p-1 text-white/40 hover:text-white disabled:opacity-30">
            <ChevronUp className="size-3.5" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={!canMoveDown} className="rounded-md p-1 text-white/40 hover:text-white disabled:opacity-30">
            <ChevronDown className="size-3.5" />
          </button>
          <button type="button" onClick={onEdit} className="rounded-md p-1.5 text-white/40 hover:text-[#00D4FF]">
            <Pencil className="size-3.5" />
          </button>
          <button type="button" onClick={onRemove} className="rounded-md p-1.5 text-white/40 hover:text-[#FB7185]">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------- Quiz editor modal --------------------------------- */

function QuizEditorModal({
  draft,
  setDraft,
  isNew,
  bank,
  setBank,
  onCancel,
  onSave,
}: {
  draft: QuizDraft
  setDraft: (updater: (d: QuizDraft) => QuizDraft) => void
  isNew: boolean
  bank: BankQuestion[]
  setBank: (updater: (b: BankQuestion[]) => BankQuestion[]) => void
  onCancel: () => void
  onSave: () => void
}) {
  const [tab, setTab] = useState<EditorTab>("Details")
  const [addMode, setAddMode] = useState<AddMode>(null)
  const [bankSearch, setBankSearch] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingDraft, setEditingDraft] = useState<QuestionDraft | null>(null)
  const [newQuestionDraft, setNewQuestionDraft] = useState<QuestionDraft>(emptyQuestionDraft(draft.unitId))
  const [studentSearch, setStudentSearch] = useState("")

  const bankById = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank])

  const filteredBank = useMemo(
    () => bank.filter((q) => q.prompt.toLowerCase().includes(bankSearch.toLowerCase())),
    [bank, bankSearch],
  )

  function moveQuestion(index: number, dir: -1 | 1) {
    setDraft((d) => {
      const next = [...d.questionIds]
      const target = index + dir
      if (target < 0 || target >= next.length) return d
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...d, questionIds: next }
    })
  }

  function removeQuestion(index: number) {
    setDraft((d) => ({ ...d, questionIds: d.questionIds.filter((_, i) => i !== index) }))
  }

  function addFromBank(questionId: string) {
    setDraft((d) => ({ ...d, questionIds: [...d.questionIds, questionId] }))
    setBank((b) => b.map((q) => (q.id === questionId ? { ...q, usageCount: q.usageCount + 1 } : q)))
    setAddMode(null)
    setBankSearch("")
  }

  function saveNewQuestion() {
    if (!newQuestionDraft.prompt.trim()) return
    const created = draftToBankQuestion(newQuestionDraft)
    created.usageCount = 1
    setBank((b) => [...b, created])
    setDraft((d) => ({ ...d, questionIds: [...d.questionIds, created.id] }))
    setNewQuestionDraft(emptyQuestionDraft(draft.unitId))
    setAddMode(null)
  }

  function startEdit(index: number) {
    const q = bankById.get(draft.questionIds[index])
    if (!q) return
    setEditingIndex(index)
    setEditingDraft(bankQuestionToDraft(q))
  }

  function saveEdit() {
    if (!editingDraft) return
    const existing = editingDraft.id ? bankById.get(editingDraft.id) : undefined
    const updated = draftToBankQuestion(editingDraft, existing)
    setBank((b) => (existing ? b.map((q) => (q.id === updated.id ? updated : q)) : [...b, updated]))
    setEditingIndex(null)
    setEditingDraft(null)
  }

  const toggleableStudents = rosterStudents.filter((s) => s.name.toLowerCase().includes(studentSearch.toLowerCase()))

  return (
    <ModalShell
      onClose={onCancel}
      eyebrow={isNew ? "New quiz" : "Edit quiz"}
      title={isNew ? "Create quiz" : draft.title || "Edit quiz"}
      maxWidth="max-w-2xl"
      footer={
        <>
          <button type="button" onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!draft.title.trim()}
            className="rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#07101a] transition hover:bg-[#00D4FF]/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save quiz
          </button>
        </>
      }
    >
      <div className="flex gap-2 border-b border-white/8 pb-4">
        {EDITOR_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition ${
              tab === t ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/50 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "Details" && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Quiz title</FieldLabel>
              <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className={inputClass} placeholder="e.g. Quantum Foundations Quiz" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Linked unit</FieldLabel>
                <select value={draft.unitId} onChange={(e) => setDraft((d) => ({ ...d, unitId: e.target.value }))} className={selectClass}>
                  {units.map((u) => (
                    <option key={u.id} value={u.id} className="bg-[#0f1420]">
                      {u.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Status</FieldLabel>
                <select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as QuizStatus }))} className={selectClass}>
                  {(["Draft", "Active", "Closed"] as QuizStatus[]).map((s) => (
                    <option key={s} value={s} className="bg-[#0f1420]">
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Time limit (minutes, optional)</FieldLabel>
                <input value={draft.timeLimitText} onChange={(e) => setDraft((d) => ({ ...d, timeLimitText: e.target.value }))} className={inputClass} placeholder="e.g. 20" />
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Pass mark (%)</FieldLabel>
                <input
                  type="number"
                  value={draft.passMark}
                  onChange={(e) => setDraft((d) => ({ ...d, passMark: Number(e.target.value) || 0 }))}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <FieldLabel>Instructions</FieldLabel>
              <textarea
                value={draft.instructions}
                onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))}
                className={textareaClass}
                placeholder="Shown to students before they start the quiz"
              />
            </label>
          </div>
        )}

        {tab === "Questions" && (
          <div className="flex flex-col gap-3">
            {draft.questionIds.length === 0 && <p className="text-sm text-white/40">No questions added yet.</p>}

            {draft.questionIds.map((qid, index) => {
              const question = bankById.get(qid)
              if (!question) return null
              if (editingIndex === index && editingDraft) {
                return (
                  <div key={`${qid}-${index}`} className="flex flex-col gap-3">
                    <QuestionForm draft={editingDraft} setDraft={(fn) => setEditingDraft((d) => (d ? fn(d) : d))} />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditingIndex(null)} className={ghostBtn}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="rounded-lg bg-[#00D4FF] px-3 py-1.5 text-xs font-semibold text-[#07101a] transition hover:bg-[#00D4FF]/85"
                      >
                        Save question
                      </button>
                    </div>
                  </div>
                )
              }
              return (
                <QuestionListItem
                  key={`${qid}-${index}`}
                  index={index}
                  question={question}
                  onEdit={() => startEdit(index)}
                  onRemove={() => removeQuestion(index)}
                  onMove={(dir) => moveQuestion(index, dir)}
                  canMoveUp={index > 0}
                  canMoveDown={index < draft.questionIds.length - 1}
                />
              )
            })}

            {addMode === null && (
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setAddMode("bank")} className={ghostBtn}>
                  <Plus className="mr-1 inline size-3.5" /> Add from question bank
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewQuestionDraft(emptyQuestionDraft(draft.unitId))
                    setAddMode("new")
                  }}
                  className={ghostBtn}
                >
                  <Plus className="mr-1 inline size-3.5" /> Create new question
                </button>
              </div>
            )}

            {addMode === "bank" && (
              <div className="rounded-xl border border-white/8 bg-black/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[.14em] text-white/40">Question bank</p>
                  <button type="button" onClick={() => setAddMode(null)} className="text-xs text-white/40 hover:text-white">
                    Close
                  </button>
                </div>
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    placeholder="Search question bank"
                    className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00D4FF]/40"
                  />
                </div>
                <div className="mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto">
                  {filteredBank.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => addFromBank(q.id)}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-black/10 p-3 text-left transition hover:border-[#00D4FF]/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{q.prompt}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <TypeBadge type={q.type} />
                          <span className="text-[11px] text-white/40">{unitTitle(q.unitId)}</span>
                        </div>
                      </div>
                      <Plus className="size-4 shrink-0 text-[#00D4FF]" />
                    </button>
                  ))}
                  {filteredBank.length === 0 && <p className="text-sm text-white/40">No matching questions.</p>}
                </div>
              </div>
            )}

            {addMode === "new" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[.14em] text-white/40">New question</p>
                  <button type="button" onClick={() => setAddMode(null)} className="text-xs text-white/40 hover:text-white">
                    Close
                  </button>
                </div>
                <QuestionForm draft={newQuestionDraft} setDraft={(fn) => setNewQuestionDraft(fn)} />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={saveNewQuestion}
                    disabled={!newQuestionDraft.prompt.trim()}
                    className="rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#07101a] transition hover:bg-[#00D4FF]/85 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Add question to quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "Assignment" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Assign to</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {(["cohort", "batch", "students"] as AssignmentMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, assignment: { ...d.assignment, mode } }))}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                      draft.assignment.mode === mode
                        ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]"
                        : "border-white/10 text-white/50 hover:text-white"
                    }`}
                  >
                    {mode === "cohort" ? "Whole cohort" : mode === "batch" ? "Specific batch" : "Specific students"}
                  </button>
                ))}
              </div>
            </div>

            {draft.assignment.mode === "batch" && (
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Batch</FieldLabel>
                <select
                  value={draft.assignment.batch}
                  onChange={(e) => setDraft((d) => ({ ...d, assignment: { ...d.assignment, batch: e.target.value as (typeof batchOptions)[number] } }))}
                  className={selectClass}
                >
                  {batchOptions.map((b) => (
                    <option key={b} value={b} className="bg-[#0f1420]">
                      {b}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {draft.assignment.mode === "students" && (
              <div className="flex flex-col gap-2">
                <FieldLabel>Students</FieldLabel>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search students"
                    className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00D4FF]/40"
                  />
                </div>
                <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-white/8 p-2">
                  {toggleableStudents.map((s) => {
                    const checked = draft.assignment.studentIds.includes(s.id)
                    return (
                      <label key={s.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/70 hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setDraft((d) => ({
                              ...d,
                              assignment: {
                                ...d.assignment,
                                studentIds: checked
                                  ? d.assignment.studentIds.filter((id) => id !== s.id)
                                  : [...d.assignment.studentIds, s.id],
                              },
                            }))
                          }
                          className="size-3.5 accent-[#00D4FF]"
                        />
                        {s.name}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            <label className="flex flex-col gap-1.5">
              <FieldLabel>Due date</FieldLabel>
              <input
                type="date"
                value={draft.assignment.dueDate}
                onChange={(e) => setDraft((d) => ({ ...d, assignment: { ...d.assignment, dueDate: e.target.value } }))}
                className={inputClass}
              />
            </label>

            <div className="flex items-center justify-between rounded-lg border border-white/8 p-3">
              <div>
                <p className="text-sm text-white">Allow retakes</p>
                <p className="text-xs text-white/40">Students can attempt the quiz more than once.</p>
              </div>
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, assignment: { ...d.assignment, allowRetakes: !d.assignment.allowRetakes } }))}
                className={`relative h-6 w-11 rounded-full transition ${draft.assignment.allowRetakes ? "bg-[#00D4FF]" : "bg-white/15"}`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-white transition ${draft.assignment.allowRetakes ? "left-5" : "left-0.5"}`}
                />
              </button>
            </div>

            {draft.assignment.allowRetakes && (
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Max retake count</FieldLabel>
                <input
                  type="number"
                  value={draft.assignment.maxRetakes}
                  onChange={(e) => setDraft((d) => ({ ...d, assignment: { ...d.assignment, maxRetakes: Number(e.target.value) || 0 } }))}
                  className={inputClass}
                />
              </label>
            )}

            <div className="flex items-center justify-between rounded-lg border border-white/8 p-3">
              <div>
                <p className="text-sm text-white">Late submission penalty</p>
                <p className="text-xs text-white/40">Deduct a percentage from late submissions.</p>
              </div>
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, assignment: { ...d.assignment, latePenalty: !d.assignment.latePenalty } }))}
                className={`relative h-6 w-11 rounded-full transition ${draft.assignment.latePenalty ? "bg-[#00D4FF]" : "bg-white/15"}`}
              >
                <span className={`absolute top-0.5 size-5 rounded-full bg-white transition ${draft.assignment.latePenalty ? "left-5" : "left-0.5"}`} />
              </button>
            </div>

            {draft.assignment.latePenalty && (
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Penalty (%)</FieldLabel>
                <input
                  type="number"
                  value={draft.assignment.latePenaltyPercent}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, assignment: { ...d.assignment, latePenaltyPercent: Number(e.target.value) || 0 } }))
                  }
                  className={inputClass}
                />
              </label>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  )
}

/* --------------------------------- Results panel --------------------------------- */

function ResultsPanel({ quiz, bank }: { quiz: Quiz; bank: BankQuestion[] }) {
  const analytics = quizAnalytics[quiz.id]
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)
  const [expandedSubmission, setExpandedSubmission] = useState<number | null>(null)
  const bankById = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank])

  if (!analytics) {
    return <p className="mt-4 rounded-xl border border-white/8 bg-black/10 p-4 text-sm text-white/40">No submissions yet for this quiz.</p>
  }

  return (
    <div className="mt-4 flex flex-col gap-5 rounded-2xl border border-white/10 bg-black/15 p-5">
      <div className="grid gap-3 sm:grid-cols-5">
        <div>
          <p className="text-[11px] uppercase tracking-[.14em] text-white/35">Submissions</p>
          <p className="mt-1 text-lg font-semibold text-white">{analytics.totalSubmissions}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[.14em] text-white/35">Avg. score</p>
          <p className="mt-1 text-lg font-semibold text-white">{analytics.avgScore}%</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[.14em] text-white/35">Pass rate</p>
          <p className="mt-1 text-lg font-semibold text-[#4ADE80]">{analytics.passRate}%</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[.14em] text-white/35">Highest</p>
          <p className="mt-1 text-lg font-semibold text-white">{analytics.highest}%</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[.14em] text-white/35">Lowest</p>
          <p className="mt-1 text-lg font-semibold text-white">{analytics.lowest}%</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[.14em] text-white/35">Score distribution</p>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
          {analytics.distribution.map((d) => (
            <div key={d.range} style={{ width: `${d.pct}%`, backgroundColor: d.color }} title={`${d.range}: ${d.pct}%`} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          {analytics.distribution.map((d) => (
            <span key={d.range} className="flex items-center gap-1.5 text-[11px] text-white/45">
              <span className="size-2 rounded-full" style={{ backgroundColor: d.color }} /> {d.range} · {d.pct}%
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[.14em] text-white/35">Per-question breakdown</p>
        <div className="overflow-hidden rounded-xl border border-white/8">
          <div className="grid grid-cols-[32px_2fr_1fr_1.3fr_1.1fr_80px] gap-3 border-b border-white/8 bg-white/[.02] px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/35">
            <span>#</span>
            <span>Question</span>
            <span>Correct %</span>
            <span>Most-chosen wrong</span>
            <span>Misconception</span>
            <span>Actions</span>
          </div>
          {analytics.perQuestion.map((qr, index) => {
            const question = bankById.get(qr.questionId)
            const isLow = qr.correctPct < 50
            const expanded = expandedQuestionId === qr.questionId
            return (
              <div key={qr.questionId} className={`border-b border-white/5 last:border-0 ${isLow ? "border-l-2 border-l-[#FB7185]" : ""}`}>
                <div className="grid grid-cols-[32px_2fr_1fr_1.3fr_1.1fr_80px] items-center gap-3 px-4 py-3 text-sm">
                  <span className="text-white/40">{index + 1}</span>
                  <span className="truncate text-white/75">{question?.prompt ?? qr.questionId}</span>
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-xs text-white/60">{qr.correctPct}%</span>
                    <ProgressBar value={qr.correctPct} color={qr.correctPct >= 70 ? "#4ADE80" : qr.correctPct >= 50 ? "#F5B942" : "#FB7185"} />
                  </div>
                  <span className="truncate text-xs text-white/50">{qr.mostChosenWrong}</span>
                  <span className="truncate text-xs text-[#FB7185]">{qr.misconception ?? "—"}</span>
                  <button type="button" onClick={() => setExpandedQuestionId(expanded ? null : qr.questionId)} className="text-xs text-[#00D4FF] hover:text-white">
                    {expanded ? "Hide" : "View details"}
                  </button>
                </div>
                {expanded && (
                  <div className="mx-4 mb-3 flex flex-col gap-1.5 rounded-lg bg-white/[.03] p-3">
                    {qr.optionBreakdown.map((opt) => (
                      <div key={opt.label} className="flex items-center gap-2 text-xs">
                        <span className="w-40 shrink-0 truncate text-white/55">{opt.label}</span>
                        <ProgressBar value={opt.pct} color="#00D4FF" />
                        <span className="w-10 shrink-0 text-right text-white/45">{opt.pct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[.14em] text-white/35">Student submissions</p>
        <div className="flex flex-col gap-2">
          {analytics.submissions.map((sub, index) => {
            const expanded = expandedSubmission === index
            return (
              <div key={`${sub.studentName}-${index}`} className="rounded-xl border border-white/8 bg-black/10 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-white">{sub.studentName}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sub.passed ? "bg-[#4ADE80]/12 text-[#4ADE80]" : "bg-[#FB7185]/12 text-[#FB7185]"}`}>
                      {sub.passed ? "Passed" : "Failed"}
                    </span>
                    {sub.retake > 0 && <span className="text-[11px] text-white/35">retake #{sub.retake}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/45">
                    <span>{sub.score}%</span>
                    <span>{sub.timeTaken}</span>
                    <span>{sub.date}</span>
                    <button type="button" onClick={() => setExpandedSubmission(expanded ? null : index)} className="text-[#00D4FF] hover:text-white">
                      {expanded ? "Hide answers" : "View answers"}
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="mt-3 flex flex-col gap-1.5 border-t border-white/8 pt-3">
                    {quiz.questionIds.map((qid, qi) => {
                      const q = bankById.get(qid)
                      return (
                        <p key={`${qid}-${qi}`} className="text-xs text-white/45">
                          Q{qi + 1}: {q?.prompt ?? qid} — <span className="text-white/60">response recorded</span>
                        </p>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* --------------------------------- Quiz card --------------------------------- */

function QuizCard({
  quiz,
  bank,
  resultsOpen,
  onToggleResults,
  onEdit,
  onAssign,
  onDuplicate,
  onDelete,
}: {
  quiz: Quiz
  bank: BankQuestion[]
  resultsOpen: boolean
  onToggleResults: () => void
  onEdit: () => void
  onAssign: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const analytics = quizAnalytics[quiz.id]
  const assignmentLabel =
    quiz.assignment.mode === "cohort"
      ? "Assigned to whole cohort"
      : quiz.assignment.mode === "batch"
        ? `Assigned to ${quiz.assignment.batch}`
        : `Assigned to ${quiz.assignment.studentIds.length} students`

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{quiz.title}</h3>
          <span className="mt-2 inline-flex items-center rounded-full border border-[#00D4FF]/30 bg-[#00D4FF]/10 px-2.5 py-1 text-[11px] text-[#00D4FF]">
            {unitTitle(quiz.unitId)}
          </span>
        </div>
        <StatusBadge status={quiz.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-white/50">
        <span>{quiz.questionIds.length} questions</span>
        <span>{quiz.timeLimit ? `${quiz.timeLimit} min limit` : "No time limit"}</span>
        <span>Pass mark {quiz.passMark}%</span>
        <span>{analytics ? `${analytics.totalSubmissions} submissions` : "0 submissions"}</span>
        {analytics && <span>Avg. score {analytics.avgScore}%</span>}
      </div>

      <p className="mt-3 text-xs text-white/40">
        {assignmentLabel}
        {quiz.assignment.dueDate ? ` · Due ${new Date(quiz.assignment.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : " · No due date set"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onEdit} className={ghostBtn}>
          Edit
        </button>
        <button type="button" onClick={onToggleResults} className={ghostBtn}>
          {resultsOpen ? "Hide results" : "View results"}
        </button>
        <button type="button" onClick={onAssign} className={ghostBtn}>
          Assign
        </button>
        <button type="button" onClick={onDuplicate} className={ghostBtn}>
          <Copy className="mr-1 inline size-3.5" /> Duplicate
        </button>
        <button type="button" onClick={onDelete} className={dangerGhostBtn}>
          <Trash2 className="mr-1 inline size-3.5" /> Delete
        </button>
      </div>

      {resultsOpen && <ResultsPanel quiz={quiz} bank={bank} />}
    </div>
  )
}

/* --------------------------------- Question bank section --------------------------------- */

function QuestionBankSection({
  bank,
  onAdd,
  onEdit,
  onDelete,
}: {
  bank: BankQuestion[]
  onAdd: () => void
  onEdit: (q: BankQuestion) => void
  onDelete: (id: string) => void
}) {
  const [search, setSearch] = useState("")
  const [unitFilter, setUnitFilter] = useState<string>("All")
  const [typeFilter, setTypeFilter] = useState<"All" | QuestionType>("All")
  const [tagFilter, setTagFilter] = useState<string>("All")
  const [misconceptionFilter, setMisconceptionFilter] = useState<string>("All")
  const [previewId, setPreviewId] = useState<string | null>(null)

  const allTags = useMemo(() => Array.from(new Set(bank.flatMap((q) => q.tags))).sort(), [bank])

  const filtered = useMemo(
    () =>
      bank.filter((q) => {
        if (search && !q.prompt.toLowerCase().includes(search.toLowerCase())) return false
        if (unitFilter !== "All" && q.unitId !== unitFilter) return false
        if (typeFilter !== "All" && q.type !== typeFilter) return false
        if (tagFilter !== "All" && !q.tags.includes(tagFilter)) return false
        if (misconceptionFilter !== "All" && q.misconception !== misconceptionFilter) return false
        return true
      }),
    [bank, search, unitFilter, typeFilter, tagFilter, misconceptionFilter],
  )

  const previewQuestion = bank.find((q) => q.id === previewId) ?? null

  return (
    <section className="mt-10">
      <SectionHeading eyebrow="Content library" title="Question bank" actionLabel="Add question" onAction={onAdd} />

      <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:p-5">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search question bank"
            className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00D4FF]/40"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/8 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[.14em] text-white/35">Unit</span>
            <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className={selectClass}>
              <option value="All" className="bg-[#0f1420]">
                All
              </option>
              {units.map((u) => (
                <option key={u.id} value={u.id} className="bg-[#0f1420]">
                  {u.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[.14em] text-white/35">Type</span>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "All" | QuestionType)} className={selectClass}>
              <option value="All" className="bg-[#0f1420]">
                All
              </option>
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t} className="bg-[#0f1420]">
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[.14em] text-white/35">Tag</span>
            <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className={selectClass}>
              <option value="All" className="bg-[#0f1420]">
                All
              </option>
              {allTags.map((tag) => (
                <option key={tag} value={tag} className="bg-[#0f1420]">
                  {tag}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[.14em] text-white/35">Misconception</span>
            <select value={misconceptionFilter} onChange={(e) => setMisconceptionFilter(e.target.value)} className={selectClass}>
              <option value="All" className="bg-[#0f1420]">
                All
              </option>
              {misconceptionOptions.map((m) => (
                <option key={m} value={m} className="bg-[#0f1420]">
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {filtered.map((q) => (
          <div key={q.id} className="rounded-xl border border-white/8 bg-black/10 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={q.type} />
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">{unitTitle(q.unitId)}</span>
              </div>
              <span className="shrink-0 text-[11px] text-white/35">Used {q.usageCount}×</span>
            </div>
            <p className="mt-2 truncate text-sm font-medium text-white">{q.prompt}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {q.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
                  {tag}
                </span>
              ))}
              {q.misconception && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FB7185]/12 px-2 py-0.5 text-[10px] font-medium text-[#FB7185]">
                  <AlertTriangle className="size-2.5" /> {q.misconception}
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-white/45">Avg. correct {q.avgCorrect}%</span>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setPreviewId(q.id)} className="rounded-md p-1.5 text-white/40 hover:text-[#00D4FF]" title="Preview">
                  <Eye className="size-3.5" />
                </button>
                <button type="button" onClick={() => onEdit(q)} className="rounded-md p-1.5 text-white/40 hover:text-[#00D4FF]" title="Edit">
                  <Pencil className="size-3.5" />
                </button>
                <button type="button" onClick={() => onDelete(q.id)} className="rounded-md p-1.5 text-white/40 hover:text-[#FB7185]" title="Delete">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-white/40">No questions match these filters.</p>}
      </div>

      {previewQuestion && (
        <ModalShell onClose={() => setPreviewId(null)} eyebrow="Preview" title="Question preview">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={previewQuestion.type} />
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">{unitTitle(previewQuestion.unitId)}</span>
            </div>
            <p className="text-sm font-medium text-white">{previewQuestion.prompt}</p>
            {previewQuestion.type === "Multiple Choice" && previewQuestion.options && (
              <div className="flex flex-col gap-1.5">
                {previewQuestion.options.map((option, i) => (
                  <p key={i} className={`rounded-md px-2 py-1.5 text-sm ${i === previewQuestion.answer ? "bg-[#4ADE80]/12 text-[#4ADE80]" : "text-white/55"}`}>
                    {option}
                  </p>
                ))}
              </div>
            )}
            {previewQuestion.type === "Numeric" && (
              <p className="text-sm text-white/60">
                Correct answer: <span className="text-[#4ADE80]">{previewQuestion.numericAnswer}</span> ± {previewQuestion.tolerance}
              </p>
            )}
            {previewQuestion.type === "Circuit-Based" && (
              <p className="text-sm text-white/60">Expected: {previewQuestion.circuitDescription}</p>
            )}
            <p className="text-xs text-white/45">{previewQuestion.explanation}</p>
          </div>
        </ModalShell>
      )}
    </section>
  )
}

/* --------------------------------- Main page --------------------------------- */

export function QuizManagerPage() {
  const [quizzesState, setQuizzesState] = useState<Quiz[]>(seedQuizzes)
  const [bank, setBank] = useState<BankQuestion[]>(seedQuestionBank)
  const [statusTab, setStatusTab] = useState<StatusTab>("All")
  const [resultsOpenId, setResultsOpenId] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorDraft, setEditorDraft] = useState<QuizDraft | null>(null)
  const [editorIsNew, setEditorIsNew] = useState(false)

  const [standaloneQuestionOpen, setStandaloneQuestionOpen] = useState(false)
  const [standaloneQuestionDraft, setStandaloneQuestionDraft] = useState<QuestionDraft | null>(null)

  useEffect(() => {
    const shouldLock = editorOpen || standaloneQuestionOpen
    if (!shouldLock) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [editorOpen, standaloneQuestionOpen])

  const filteredQuizzes = useMemo(
    () => quizzesState.filter((q) => statusTab === "All" || q.status === statusTab),
    [quizzesState, statusTab],
  )

  const avgScoreAcrossQuizzes = useMemo(() => {
    const values = Object.values(quizAnalytics).map((a) => a.avgScore)
    if (values.length === 0) return 0
    return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
  }, [])

  function openCreateQuiz() {
    setEditorDraft(emptyQuizDraft())
    setEditorIsNew(true)
    setEditorOpen(true)
  }

  function openEditQuiz(quiz: Quiz) {
    setEditorDraft(quizToDraft(quiz))
    setEditorIsNew(false)
    setEditorOpen(true)
  }

  function closeEditor() {
    setEditorOpen(false)
    setEditorDraft(null)
  }

  function saveEditor() {
    if (!editorDraft) return
    const quiz = draftToQuiz(editorDraft)
    setQuizzesState((prev) => {
      const exists = prev.some((q) => q.id === quiz.id)
      return exists ? prev.map((q) => (q.id === quiz.id ? quiz : q)) : [quiz, ...prev]
    })
    closeEditor()
  }

  function duplicateQuiz(quiz: Quiz) {
    const copy: Quiz = { ...quiz, id: uid("quiz"), title: `${quiz.title} (copy)`, status: "Draft" }
    setQuizzesState((prev) => [copy, ...prev])
  }

  function deleteQuiz(id: string) {
    setQuizzesState((prev) => prev.filter((q) => q.id !== id))
    if (resultsOpenId === id) setResultsOpenId(null)
  }

  function openAddStandaloneQuestion() {
    setStandaloneQuestionDraft(emptyQuestionDraft(units[0].id))
    setStandaloneQuestionOpen(true)
  }

  function editBankQuestion(q: BankQuestion) {
    setStandaloneQuestionDraft(bankQuestionToDraft(q))
    setStandaloneQuestionOpen(true)
  }

  function saveStandaloneQuestion() {
    if (!standaloneQuestionDraft || !standaloneQuestionDraft.prompt.trim()) return
    const existing = standaloneQuestionDraft.id ? bank.find((q) => q.id === standaloneQuestionDraft.id) : undefined
    const saved = draftToBankQuestion(standaloneQuestionDraft, existing)
    setBank((prev) => (existing ? prev.map((q) => (q.id === saved.id ? saved : q)) : [...prev, saved]))
    setStandaloneQuestionOpen(false)
    setStandaloneQuestionDraft(null)
  }

  function deleteBankQuestion(id: string) {
    setBank((prev) => prev.filter((q) => q.id !== id))
  }

  const activeCount = quizzesState.filter((q) => q.status === "Active").length
  const draftCount = quizzesState.filter((q) => q.status === "Draft").length

  return (
    <main className="relative z-0 mx-auto max-w-7xl px-5 py-9 md:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg border border-[#F5B942]/30 bg-[#F5B942]/10 text-[#F5B942]">
              <Atom className="size-4" />
            </span>
            <p className="text-xs uppercase tracking-[.24em] text-[#F5B942]">Instructor view</p>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Quiz manager</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
            Create assessments, manage your question bank, assign quizzes, and analyze results across the cohort.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-xs text-white/55">
          <Zap className="size-3.5 text-[#F5B942]" /> Data synced from learner activity · just now
        </div>
      </div>

      {/* Stat cards */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active quizzes"
          value={String(quizzesState.length)}
          detail={`${activeCount} assigned · ${draftCount} drafts`}
          icon={ClipboardCheck}
          accent="#00D4FF"
        />
        <StatCard label="Question bank" value={String(bank.length)} detail="Across 9 units" icon={HelpCircle} accent="#A78BFA" />
        <StatCard label="Avg. score" value={`${avgScoreAcrossQuizzes}%`} detail="Across all submissions" icon={Gauge} accent="#4ADE80" />
        <StatCard label="Most missed" value="Grover speedup" detail="38% wrong answer rate" icon={AlertTriangle} accent="#FB7185" />
      </section>

      {/* Quiz list */}
      <section className="mt-10">
        <SectionHeading eyebrow="Assessments" title="All quizzes" actionLabel="Create quiz" onAction={openCreateQuiz} />

        <div className="mb-5">
          <FilterPillGroup label="Status" options={STATUS_TABS} value={statusTab} onChange={setStatusTab} />
        </div>

        <div className="flex flex-col gap-4">
          {filteredQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              bank={bank}
              resultsOpen={resultsOpenId === quiz.id}
              onToggleResults={() => setResultsOpenId((prev) => (prev === quiz.id ? null : quiz.id))}
              onEdit={() => openEditQuiz(quiz)}
              onAssign={() => openEditQuiz(quiz)}
              onDuplicate={() => duplicateQuiz(quiz)}
              onDelete={() => deleteQuiz(quiz.id)}
            />
          ))}
          {filteredQuizzes.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[.02] px-5 py-10 text-center text-sm text-white/40">
              No quizzes match this filter.
            </div>
          )}
        </div>
      </section>

      {/* Question bank */}
      <QuestionBankSection bank={bank} onAdd={openAddStandaloneQuestion} onEdit={editBankQuestion} onDelete={deleteBankQuestion} />

      {editorOpen && editorDraft && (
        <QuizEditorModal
          draft={editorDraft}
          setDraft={(fn) => setEditorDraft((d) => (d ? fn(d) : d))}
          isNew={editorIsNew}
          bank={bank}
          setBank={setBank}
          onCancel={closeEditor}
          onSave={saveEditor}
        />
      )}

      {standaloneQuestionOpen && standaloneQuestionDraft && (
        <ModalShell
          onClose={() => setStandaloneQuestionOpen(false)}
          eyebrow={standaloneQuestionDraft.id ? "Edit question" : "New question"}
          title={standaloneQuestionDraft.id ? "Edit question" : "Add question to bank"}
          maxWidth="max-w-xl"
          footer={
            <>
              <button type="button" onClick={() => setStandaloneQuestionOpen(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:text-white">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveStandaloneQuestion}
                disabled={!standaloneQuestionDraft.prompt.trim()}
                className="rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#07101a] transition hover:bg-[#00D4FF]/85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save question
              </button>
            </>
          }
        >
          <QuestionForm draft={standaloneQuestionDraft} setDraft={(fn) => setStandaloneQuestionDraft((d) => (d ? fn(d) : d))} />
        </ModalShell>
      )}
    </main>
  )
}
