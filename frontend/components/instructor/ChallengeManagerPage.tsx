"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Atom,
  Ban,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Eye,
  Gauge,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react"
import { GATE_GROUPS } from "@/lib/studio/gates"
import type { StudioGateType } from "@/lib/studio/types"
import { TEMPLATES } from "@/lib/studio/templates"
import { units } from "@/lib/curriculum/units"
import { students as rosterStudents } from "@/lib/instructor-students"
import {
  algorithmOptions,
  basisStates,
  batchOptions,
  challengeAnalytics as seedAnalytics,
  challenges as seedChallenges,
  overrideReasons,
  type AssignmentMode,
  type Challenge,
  type ChallengeAnalytics,
  type ChallengeDifficulty,
  type ChallengeStatus,
  type ChallengeSubmission,
  type ScoringWeights,
  type SubmissionStatus,
} from "@/lib/instructor-challenges"

/* --------------------------------- Constants -------------------------------- */

type StatusTab = "All" | ChallengeStatus
type EditorTab = "Problem" | "Target & Grading" | "Assignment"

const STATUS_TABS: StatusTab[] = ["All", "Active", "Draft", "Closed"]
const EDITOR_TABS: EditorTab[] = ["Problem", "Target & Grading", "Assignment"]
const DIFFICULTY_OPTIONS: ChallengeDifficulty[] = ["Beginner", "Intermediate", "Advanced"]
const ALLOWED_GATE_GROUPS = GATE_GROUPS.filter((g) => g.category === "single" || g.category === "multi")

const statusStyles: Record<ChallengeStatus, { text: string; bg: string; dot: string }> = {
  Active: { text: "text-[#4ADE80]", bg: "bg-[#4ADE80]/12", dot: "#4ADE80" },
  Draft: { text: "text-[#F5B942]", bg: "bg-[#F5B942]/12", dot: "#F5B942" },
  Closed: { text: "text-white/60", bg: "bg-white/10", dot: "#9CA3AF" },
}

const difficultyStyles: Record<ChallengeDifficulty, string> = {
  Beginner: "#34D399",
  Intermediate: "#00D4FF",
  Advanced: "#E879F9",
}

const submissionStatusStyles: Record<SubmissionStatus, { text: string; bg: string }> = {
  "Auto-passed": { text: "text-[#4ADE80]", bg: "bg-[#4ADE80]/12" },
  "Auto-failed": { text: "text-[#FB7185]", bg: "bg-[#FB7185]/12" },
  "Needs review": { text: "text-[#F5B942]", bg: "bg-[#F5B942]/12" },
  Overridden: { text: "text-[#A78BFA]", bg: "bg-[#A78BFA]/12" },
}

function unitTitle(unitId?: string) {
  if (!unitId) return null
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
  options,
  value,
  onChange,
}: {
  options: T[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
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

function StatusBadge({ status }: { status: ChallengeStatus }) {
  const style = statusStyles[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${style.text} ${style.bg}`}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
      {status}
    </span>
  )
}

function DifficultyBadge({ difficulty }: { difficulty: ChallengeDifficulty }) {
  const color = difficultyStyles[difficulty]
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ color, backgroundColor: `${color}18` }}
    >
      {difficulty}
    </span>
  )
}

function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const style = submissionStatusStyles[status]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${style.text} ${style.bg}`}>{status}</span>
}

function ProgressBar({ value, color = "#00D4FF" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }} />
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-white/50">{children}</span>
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00D4FF]/40"
const selectClass = "rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#00D4FF]/40"
const textareaClass = `${inputClass} min-h-24 resize-none`
const ghostBtn =
  "rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-[#00D4FF]/40 hover:text-[#00D4FF]"
const dangerGhostBtn =
  "rounded-lg border border-[#FB7185]/30 px-3 py-1.5 text-xs font-medium text-[#FB7185] transition hover:bg-[#FB7185]/10"
const avatarGradient = "bg-gradient-to-br from-[#5B8CFF] to-[#A78BFA]"

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("")
}

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

/* --------------------------------- Challenge draft --------------------------------- */

type ChallengeDraft = {
  id: string
  title: string
  description: string
  unitId: string
  algorithm: (typeof algorithmOptions)[number]
  difficulty: ChallengeDifficulty
  estimatedMinutes: number
  status: ChallengeStatus
  qubits: number
  gateBudget: number
  allowedGates: StudioGateType[]
  targetDistributionText: Record<string, string>
  tolerance: number
  templateKey: string
  scoring: ScoringWeights
  hintsText: string[]
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

function challengeToDraft(challenge: Challenge): ChallengeDraft {
  const distText: Record<string, string> = {}
  for (const state of basisStates(challenge.qubits)) {
    distText[state] = String(challenge.targetDistribution[state] ?? 0)
  }
  return {
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    unitId: challenge.unitId ?? "",
    algorithm: challenge.algorithm ?? "Custom",
    difficulty: challenge.difficulty,
    estimatedMinutes: challenge.estimatedMinutes,
    status: challenge.status,
    qubits: challenge.qubits,
    gateBudget: challenge.gateBudget,
    allowedGates: [...challenge.allowedGates],
    targetDistributionText: distText,
    tolerance: challenge.tolerance,
    templateKey: challenge.templateKey,
    scoring: { ...challenge.scoring },
    hintsText: [...challenge.hints],
    assignment: {
      mode: challenge.assignment.mode,
      batch: challenge.assignment.batch ?? batchOptions[0],
      studentIds: [...challenge.assignment.studentIds],
      dueDate: challenge.assignment.dueDate,
      allowRetakes: challenge.assignment.allowRetakes,
      maxRetakes: challenge.assignment.maxRetakes,
      latePenalty: challenge.assignment.latePenalty,
      latePenaltyPercent: challenge.assignment.latePenaltyPercent,
    },
  }
}

function emptyChallengeDraft(): ChallengeDraft {
  const qubits = 2
  const distText: Record<string, string> = {}
  for (const state of basisStates(qubits)) distText[state] = state === "00" || state === "11" ? "50" : "0"
  return {
    id: uid("ch"),
    title: "",
    description: "",
    unitId: "",
    algorithm: "Custom",
    difficulty: "Beginner",
    estimatedMinutes: 15,
    status: "Draft",
    qubits,
    gateBudget: 6,
    allowedGates: ["H", "X", "CNOT"],
    targetDistributionText: distText,
    tolerance: 5,
    templateKey: "blank",
    scoring: { correctness: 60, efficiency: 25, speed: 15, passThreshold: 70 },
    hintsText: [],
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

function draftToChallenge(draft: ChallengeDraft): Challenge {
  const targetDistribution: Record<string, number> = {}
  for (const state of basisStates(draft.qubits)) {
    targetDistribution[state] = Number(draft.targetDistributionText[state]) || 0
  }
  return {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    unitId: draft.unitId || undefined,
    algorithm: draft.algorithm,
    difficulty: draft.difficulty,
    estimatedMinutes: draft.estimatedMinutes,
    status: draft.status,
    qubits: draft.qubits,
    gateBudget: draft.gateBudget,
    allowedGates: draft.allowedGates,
    targetDistribution,
    tolerance: draft.tolerance,
    templateKey: draft.templateKey,
    scoring: draft.scoring,
    hints: draft.hintsText.filter((h) => h.trim() !== ""),
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

function resizeDistribution(draft: ChallengeDraft, qubits: number): Record<string, string> {
  const states = basisStates(qubits)
  const next: Record<string, string> = {}
  for (const state of states) next[state] = draft.targetDistributionText[state] ?? "0"
  return next
}

/* --------------------------------- Challenge editor modal --------------------------------- */

function ChallengeEditorModal({
  draft,
  setDraft,
  isNew,
  onCancel,
  onSave,
}: {
  draft: ChallengeDraft
  setDraft: (updater: (d: ChallengeDraft) => ChallengeDraft) => void
  isNew: boolean
  onCancel: () => void
  onSave: () => void
}) {
  const [tab, setTab] = useState<EditorTab>("Problem")
  const [studentSearch, setStudentSearch] = useState("")

  const weightSum = draft.scoring.correctness + draft.scoring.efficiency + draft.scoring.speed
  const weightValid = weightSum === 100

  function updateGate(gate: StudioGateType, checked: boolean) {
    setDraft((d) => ({
      ...d,
      allowedGates: checked ? [...d.allowedGates, gate] : d.allowedGates.filter((g) => g !== gate),
    }))
  }

  function updateQubits(qubits: number) {
    setDraft((d) => ({ ...d, qubits, targetDistributionText: resizeDistribution(d, qubits) }))
  }

  function updateHint(index: number, value: string) {
    setDraft((d) => ({ ...d, hintsText: d.hintsText.map((h, i) => (i === index ? value : h)) }))
  }
  function addHint() {
    setDraft((d) => ({ ...d, hintsText: [...d.hintsText, ""] }))
  }
  function removeHint(index: number) {
    setDraft((d) => ({ ...d, hintsText: d.hintsText.filter((_, i) => i !== index) }))
  }

  const toggleableStudents = rosterStudents.filter((s) => s.name.toLowerCase().includes(studentSearch.toLowerCase()))

  return (
    <ModalShell
      onClose={onCancel}
      eyebrow={isNew ? "New challenge" : "Edit challenge"}
      title={isNew ? "Create challenge" : draft.title || "Edit challenge"}
      maxWidth="max-w-3xl"
      footer={
        <>
          <button type="button" onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!draft.title.trim() || !weightValid}
            className="rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#07101a] transition hover:bg-[#00D4FF]/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save challenge
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
        {tab === "Problem" && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Challenge title</FieldLabel>
              <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className={inputClass} placeholder="e.g. Bell State Builder" />
            </label>

            <label className="flex flex-col gap-1.5">
              <FieldLabel>Problem description</FieldLabel>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                className={`${textareaClass} min-h-28`}
                placeholder="Describe the goal, the setup, and what a successful circuit looks like. Markdown-style emphasis is supported."
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Linked curriculum unit (optional)</FieldLabel>
                <select value={draft.unitId} onChange={(e) => setDraft((d) => ({ ...d, unitId: e.target.value }))} className={selectClass}>
                  <option value="" className="bg-[#0f1420]">
                    None
                  </option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id} className="bg-[#0f1420]">
                      {u.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Linked algorithm (optional)</FieldLabel>
                <select value={draft.algorithm} onChange={(e) => setDraft((d) => ({ ...d, algorithm: e.target.value as ChallengeDraft["algorithm"] }))} className={selectClass}>
                  {algorithmOptions.map((a) => (
                    <option key={a} value={a} className="bg-[#0f1420]">
                      {a}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Difficulty</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_OPTIONS.map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, difficulty: diff }))}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                      draft.difficulty === diff ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/50 hover:text-white"
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Estimated time (minutes)</FieldLabel>
                <input
                  type="number"
                  value={draft.estimatedMinutes}
                  onChange={(e) => setDraft((d) => ({ ...d, estimatedMinutes: Number(e.target.value) || 0 }))}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Status</FieldLabel>
                <select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as ChallengeStatus }))} className={selectClass}>
                  {(["Draft", "Active", "Closed"] as ChallengeStatus[]).map((s) => (
                    <option key={s} value={s} className="bg-[#0f1420]">
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        {tab === "Target & Grading" && (
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-white/8 bg-black/15 p-4">
              <p className="mb-3 text-xs uppercase tracking-[.14em] text-white/40">Circuit specification</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <FieldLabel>Number of qubits</FieldLabel>
                  <select value={draft.qubits} onChange={(e) => updateQubits(Number(e.target.value))} className={selectClass}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n} className="bg-[#0f1420]">
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <FieldLabel>Gate budget</FieldLabel>
                  <input
                    type="number"
                    value={draft.gateBudget}
                    onChange={(e) => setDraft((d) => ({ ...d, gateBudget: Number(e.target.value) || 0 }))}
                    className={inputClass}
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <FieldLabel>Allowed gates</FieldLabel>
                <div className="flex flex-col gap-3">
                  {ALLOWED_GATE_GROUPS.map((group) => (
                    <div key={group.category}>
                      <p className="mb-1.5 text-[11px] text-white/35">{group.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.gates.map((gate) => {
                          const checked = draft.allowedGates.includes(gate)
                          return (
                            <label
                              key={gate}
                              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                                checked ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/50 hover:text-white"
                              }`}
                            >
                              <input type="checkbox" checked={checked} onChange={(e) => updateGate(gate, e.target.checked)} className="size-3.5 accent-[#00D4FF]" />
                              {gate}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-black/15 p-4">
              <p className="mb-3 text-xs uppercase tracking-[.14em] text-white/40">Target behavior</p>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Target distribution</FieldLabel>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {basisStates(draft.qubits).map((state) => (
                    <label key={state} className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5">
                      <span className="font-mono text-xs text-white/50">{"|" + state + "\u27e9"}</span>
                      <input
                        type="number"
                        value={draft.targetDistributionText[state] ?? "0"}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, targetDistributionText: { ...d.targetDistributionText, [state]: e.target.value } }))
                        }
                        className="w-full min-w-0 bg-transparent text-right text-sm text-white outline-none"
                      />
                      <span className="text-xs text-white/40">%</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <FieldLabel>Fidelity tolerance (%)</FieldLabel>
                  <input
                    type="number"
                    value={draft.tolerance}
                    onChange={(e) => setDraft((d) => ({ ...d, tolerance: Number(e.target.value) || 0 }))}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <FieldLabel>Starter template</FieldLabel>
                  <select value={draft.templateKey} onChange={(e) => setDraft((d) => ({ ...d, templateKey: e.target.value }))} className={selectClass}>
                    <option value="blank" className="bg-[#0f1420]">
                      Blank
                    </option>
                    {TEMPLATES.map((t) => (
                      <option key={t.key} value={t.key} className="bg-[#0f1420]">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-black/15 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[.14em] text-white/40">Scoring criteria</p>
                <span className={`text-xs font-medium ${weightValid ? "text-[#4ADE80]" : "text-[#FB7185]"}`}>
                  Weights total {weightSum}% {weightValid ? "\u2713" : "\u2014 must equal 100%"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col gap-1.5">
                  <FieldLabel>Correctness (fidelity) %</FieldLabel>
                  <input
                    type="number"
                    value={draft.scoring.correctness}
                    onChange={(e) => setDraft((d) => ({ ...d, scoring: { ...d.scoring, correctness: Number(e.target.value) || 0 } }))}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <FieldLabel>Gate efficiency %</FieldLabel>
                  <input
                    type="number"
                    value={draft.scoring.efficiency}
                    onChange={(e) => setDraft((d) => ({ ...d, scoring: { ...d.scoring, efficiency: Number(e.target.value) || 0 } }))}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <FieldLabel>Speed bonus %</FieldLabel>
                  <input
                    type="number"
                    value={draft.scoring.speed}
                    onChange={(e) => setDraft((d) => ({ ...d, scoring: { ...d.scoring, speed: Number(e.target.value) || 0 } }))}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="mt-3 flex flex-col gap-1.5">
                <FieldLabel>Pass threshold (%)</FieldLabel>
                <input
                  type="number"
                  value={draft.scoring.passThreshold}
                  onChange={(e) => setDraft((d) => ({ ...d, scoring: { ...d.scoring, passThreshold: Number(e.target.value) || 0 } }))}
                  className={`${inputClass} max-w-40`}
                />
              </label>
            </div>

            <div className="rounded-xl border border-white/8 bg-black/15 p-4">
              <p className="mb-3 text-xs uppercase tracking-[.14em] text-white/40">Hints (optional)</p>
              <div className="flex flex-col gap-2">
                {draft.hintsText.map((hint, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input value={hint} onChange={(e) => updateHint(index, e.target.value)} className={inputClass} placeholder={`Hint ${index + 1}`} />
                    <button type="button" onClick={() => removeHint(index)} className="shrink-0 rounded-md p-1.5 text-white/40 hover:text-[#FB7185]">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addHint} className="flex items-center gap-1.5 self-start text-xs text-[#00D4FF] hover:text-white">
                  <Plus className="size-3.5" /> Add hint
                </button>
              </div>
            </div>
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
                                studentIds: checked ? d.assignment.studentIds.filter((id) => id !== s.id) : [...d.assignment.studentIds, s.id],
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
                <p className="text-xs text-white/40">Students can resubmit their circuit</p>
              </div>
              <div className="flex items-center gap-3">
                {draft.assignment.allowRetakes && (
                  <input
                    type="number"
                    value={draft.assignment.maxRetakes}
                    onChange={(e) => setDraft((d) => ({ ...d, assignment: { ...d.assignment, maxRetakes: Number(e.target.value) || 1 } }))}
                    className={`${inputClass} w-16`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, assignment: { ...d.assignment, allowRetakes: !d.assignment.allowRetakes } }))}
                  className={`relative h-6 w-11 rounded-full transition ${draft.assignment.allowRetakes ? "bg-[#00D4FF]" : "bg-white/15"}`}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${draft.assignment.allowRetakes ? "left-[22px]" : "left-0.5"}`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/8 p-3">
              <div>
                <p className="text-sm text-white">Late penalty</p>
                <p className="text-xs text-white/40">Deduct points for late submissions</p>
              </div>
              <div className="flex items-center gap-3">
                {draft.assignment.latePenalty && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={draft.assignment.latePenaltyPercent}
                      onChange={(e) => setDraft((d) => ({ ...d, assignment: { ...d.assignment, latePenaltyPercent: Number(e.target.value) || 0 } }))}
                      className={`${inputClass} w-16`}
                    />
                    <span className="text-xs text-white/40">%</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, assignment: { ...d.assignment, latePenalty: !d.assignment.latePenalty } }))}
                  className={`relative h-6 w-11 rounded-full transition ${draft.assignment.latePenalty ? "bg-[#00D4FF]" : "bg-white/15"}`}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${draft.assignment.latePenalty ? "left-[22px]" : "left-0.5"}`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  )
}

/* --------------------------------- Challenge card --------------------------------- */

function assignmentSummary(challenge: Challenge) {
  if (challenge.status === "Draft") return "Not assigned yet"
  const who = challenge.assignment.mode === "cohort" ? "Whole cohort" : challenge.assignment.mode === "batch" ? challenge.assignment.batch : "Selected students"
  const due = challenge.assignment.dueDate ? `Due ${new Date(challenge.assignment.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "No due date"
  return `Assigned to ${who} \u00b7 ${due}`
}

function ChallengeCard({
  challenge,
  analytics,
  onEdit,
  onViewSubmissions,
  onAssign,
  onDuplicate,
  onDelete,
  showingSubmissions,
}: {
  challenge: Challenge
  analytics?: ChallengeAnalytics
  onEdit: () => void
  onViewSubmissions: () => void
  onAssign: () => void
  onDuplicate: () => void
  onDelete: () => void
  showingSubmissions: boolean
}) {
  const dist = analytics?.distribution

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{challenge.title}</h3>
            <DifficultyBadge difficulty={challenge.difficulty} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {unitTitle(challenge.unitId) && (
              <span className="rounded-full bg-[#00D4FF]/12 px-2 py-0.5 text-[11px] font-medium text-[#00D4FF]">{unitTitle(challenge.unitId)}</span>
            )}
            {challenge.algorithm && challenge.algorithm !== "Custom" && (
              <span className="rounded-full bg-[#A78BFA]/12 px-2 py-0.5 text-[11px] font-medium text-[#A78BFA]">{challenge.algorithm}</span>
            )}
          </div>
        </div>
        <StatusBadge status={challenge.status} />
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-white/55">{challenge.description}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div>
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Qubits</p>
          <p className="mt-0.5 text-sm font-medium text-white">{challenge.qubits}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Gate budget</p>
          <p className="mt-0.5 text-sm font-medium text-white">{challenge.gateBudget}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Fidelity target</p>
                <p className="mt-0.5 text-sm font-medium text-white">{"\u00b1" + challenge.tolerance + "%"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Submissions</p>
          <p className="mt-0.5 text-sm font-medium text-white">{analytics?.totalSubmissions ?? 0}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Avg. score</p>
          <p className="mt-0.5 text-sm font-medium text-white">{analytics ? `${analytics.avgFidelity}%` : "\u2014"}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-white/40">{assignmentSummary(challenge)}</p>

      {dist && (
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10">
          {dist.map((seg) => (
            <div key={seg.label} title={`${seg.label}: ${seg.pct}%`} style={{ width: `${seg.pct}%`, backgroundColor: seg.color }} />
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
        <button type="button" onClick={onEdit} className={ghostBtn}>
          <Pencil className="mr-1 inline size-3.5" /> Edit
        </button>
        <button type="button" onClick={onViewSubmissions} className={showingSubmissions ? `${ghostBtn} border-[#00D4FF]/40 text-[#00D4FF]` : ghostBtn}>
          <Eye className="mr-1 inline size-3.5" /> {showingSubmissions ? "Hide submissions" : "View submissions"}
        </button>
        <button type="button" onClick={onAssign} className={ghostBtn}>
          <Users className="mr-1 inline size-3.5" /> Assign
        </button>
        <button type="button" onClick={onDuplicate} className={ghostBtn}>
          <Copy className="mr-1 inline size-3.5" /> Duplicate
        </button>
        <button type="button" onClick={onDelete} className={dangerGhostBtn}>
          <Trash2 className="mr-1 inline size-3.5" /> Delete
        </button>
      </div>
    </div>
  )
}

/* --------------------------------- Submissions panel --------------------------------- */

function SubmissionsPanel({
  challenge,
  analytics,
  onViewCircuit,
  onOverride,
}: {
  challenge: Challenge
  analytics: ChallengeAnalytics
  onViewCircuit: (submission: ChallengeSubmission) => void
  onOverride: (submission: ChallengeSubmission) => void
}) {
  return (
    <div className="rounded-2xl border border-[#00D4FF]/25 bg-[#00D4FF]/[.04] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[.16em] text-[#00D4FF]">{"Submissions & auto-grading \u2014 " + challenge.title}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Total submissions</p>
          <p className="mt-1 text-xl font-semibold text-white">{analytics.totalSubmissions}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Auto-pass rate</p>
          <p className="mt-1 text-xl font-semibold text-[#4ADE80]">{analytics.autoPassRate}%</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Manual overrides</p>
          <p className="mt-1 text-xl font-semibold text-[#F5B942]">{analytics.manualOverrideCount}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Avg. fidelity</p>
          <p className="mt-1 text-xl font-semibold text-white">{analytics.avgFidelity}%</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Avg. gate count</p>
          <p className="mt-1 text-xl font-semibold text-white">{analytics.avgGateCount}</p>
        </div>
      </div>

      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10">
        {analytics.distribution.map((seg) => (
          <div key={seg.label} title={`${seg.label}: ${seg.pct}%`} style={{ width: `${seg.pct}%`, backgroundColor: seg.color }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {analytics.distribution.map((seg) => (
          <span key={seg.label} className="flex items-center gap-1.5 text-[11px] text-white/50">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: seg.color }} />
            {seg.label} ({seg.pct}%)
          </span>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/8 text-[11px] uppercase tracking-[.1em] text-white/40">
              <th className="px-3 py-2.5">#</th>
              <th className="px-3 py-2.5">Student</th>
              <th className="px-3 py-2.5">Fidelity</th>
              <th className="px-3 py-2.5">Gate count</th>
              <th className="px-3 py-2.5">Score</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Submitted</th>
              <th className="px-3 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {analytics.submissions.map((submission, index) => {
              const overBudget = submission.gateCount > challenge.gateBudget
              const atBudget = submission.gateCount === challenge.gateBudget
              const gateColor = overBudget ? "text-[#FB7185]" : atBudget ? "text-[#F5B942]" : "text-[#4ADE80]"
              const fidelityColor = submission.fidelity >= challenge.scoring.passThreshold ? "#4ADE80" : "#FB7185"
              return (
                <tr key={submission.id} className="border-b border-white/5 last:border-0 hover:bg-white/[.02]">
                  <td className="px-3 py-2.5 text-white/40">{index + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`flex size-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ${avatarGradient}`}>
                        {initials(submission.studentName)}
                      </span>
                      <span className="text-white">{submission.studentName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: fidelityColor }}>
                        {submission.fidelity}%
                      </span>
                      <div className="w-16">
                        <ProgressBar value={submission.fidelity} color={fidelityColor} />
                      </div>
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 font-medium ${gateColor}`}>
                    {submission.gateCount}/{challenge.gateBudget}
                  </td>
                  <td className="px-3 py-2.5 text-white">{submission.score}</td>
                  <td className="px-3 py-2.5">
                    <SubmissionStatusBadge status={submission.status} />
                  </td>
                  <td className="px-3 py-2.5 text-white/50">{submission.submittedDate}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => onViewCircuit(submission)} className="rounded-md p-1.5 text-white/40 hover:text-[#00D4FF]" title="View circuit">
                        <Eye className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => onOverride(submission)} className="rounded-md p-1.5 text-white/40 hover:text-[#A78BFA]" title="Override grade">
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* --------------------------------- Submission detail drawer --------------------------------- */

function SubmissionDrawer({
  challenge,
  submission,
  onClose,
  onOverride,
}: {
  challenge: Challenge
  submission: ChallengeSubmission
  onClose: () => void
  onOverride: () => void
}) {
  const states = basisStates(challenge.qubits)
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0b0f18] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <span className={`flex size-11 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarGradient}`}>
              {initials(submission.studentName)}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-white">{submission.studentName}</h3>
              <p className="text-xs text-white/45">{challenge.title}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-white/40 hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="flex flex-wrap gap-2">
            <SubmissionStatusBadge status={submission.status} />
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/50">Submitted {submission.submittedDate}</span>
          </div>

          {submission.status === "Needs review" && submission.reviewReason && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#F5B942]/30 bg-[#F5B942]/10 p-3 text-xs text-[#F5B942]">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>{submission.reviewReason}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onOverride}
            className="mt-4 w-full rounded-lg border border-[#A78BFA]/40 bg-[#A78BFA]/10 py-2.5 text-sm font-semibold text-[#A78BFA] transition hover:bg-[#A78BFA]/20"
          >
            Override grade
          </button>

          <div className="mt-5">
            <p className="mb-2 text-xs uppercase tracking-[.14em] text-white/40">Submitted circuit</p>
            <div className="overflow-hidden rounded-xl border border-white/8">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-[11px] uppercase tracking-[.1em] text-white/40">
                    <th className="px-3 py-2">Step</th>
                    <th className="px-3 py-2">Qubit</th>
                    <th className="px-3 py-2">Gate</th>
                  </tr>
                </thead>
                <tbody>
                  {submission.gates.map((gate, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="px-3 py-2 text-white/50">{gate.step}</td>
                      <td className="px-3 py-2 text-white/50">
                        {`q[${gate.qubit}]${gate.target !== undefined ? ` \u2192 q[${gate.target}]` : ""}`}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white">
                          {gate.gate}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs uppercase tracking-[.14em] text-white/40">Target vs. actual distribution</p>
            <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-black/15 p-3">
              {states.map((state) => (
                <div key={state} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 font-mono text-xs text-white/50">{"|" + state + "\u27e9"}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-[10px] text-white/35">Target</span>
                      <ProgressBar value={challenge.targetDistribution[state] ?? 0} color="#00D4FF" />
                      <span className="w-10 shrink-0 text-right text-[11px] text-white/50">{challenge.targetDistribution[state] ?? 0}%</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="w-14 shrink-0 text-[10px] text-white/35">Actual</span>
                      <ProgressBar value={submission.actualDistribution[state] ?? 0} color="#A78BFA" />
                      <span className="w-10 shrink-0 text-right text-[11px] text-white/50">{submission.actualDistribution[state] ?? 0}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <p className="mb-1 text-xs uppercase tracking-[.14em] text-white/40">Auto-grading breakdown</p>
            <div className="flex items-center justify-between rounded-lg border border-white/8 bg-black/15 p-3">
              <span className="text-sm text-white/60">Fidelity score ({submission.fidelity >= challenge.scoring.passThreshold ? "pass" : "fail"})</span>
              <span className="font-semibold text-white">
                {submission.correctnessScore}
                <span className="text-white/40"> / {challenge.scoring.correctness}</span>
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/8 bg-black/15 p-3">
              <span className="text-sm text-white/60">Gate efficiency score</span>
              <span className="font-semibold text-white">
                {submission.efficiencyScore}
                <span className="text-white/40"> / {challenge.scoring.efficiency}</span>
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/8 bg-black/15 p-3">
              <span className="text-sm text-white/60">Speed bonus score</span>
              <span className="font-semibold text-white">
                {submission.speedScore}
                <span className="text-white/40"> / {challenge.scoring.speed}</span>
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#00D4FF]/30 bg-[#00D4FF]/10 p-3">
              <span className="text-sm font-medium text-[#00D4FF]">Total weighted score</span>
              <span className="text-lg font-semibold text-[#00D4FF]">{submission.score}</span>
            </div>
          </div>

          {submission.status === "Overridden" && (
            <div className="mt-4 rounded-lg border border-[#A78BFA]/30 bg-[#A78BFA]/10 p-3 text-xs text-[#A78BFA]">
              <p className="font-medium">Override reason: {submission.overrideReason}</p>
              {submission.overrideNotes && <p className="mt-1 text-[#A78BFA]/80">{submission.overrideNotes}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* --------------------------------- Override modal --------------------------------- */

function OverrideModal({
  challenge,
  submission,
  onCancel,
  onSave,
}: {
  challenge: Challenge
  submission: ChallengeSubmission
  onCancel: () => void
  onSave: (score: number, reason: string, notes: string) => void
}) {
  const [score, setScore] = useState(submission.score)
  const [reason, setReason] = useState<string>(overrideReasons[0])
  const [notes, setNotes] = useState("")

  return (
    <ModalShell
      onClose={onCancel}
      eyebrow="Manual override"
      title="Override grade"
      maxWidth="max-w-md"
      footer={
        <>
          <button type="button" onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(score, reason, notes)}
            className="rounded-lg bg-[#A78BFA] px-4 py-2 text-sm font-semibold text-[#160f24] transition hover:bg-[#A78BFA]/85"
          >
            Save override
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Student</FieldLabel>
            <p className="mt-1 text-sm text-white">{submission.studentName}</p>
          </div>
          <div>
            <FieldLabel>Challenge</FieldLabel>
            <p className="mt-1 text-sm text-white">{challenge.title}</p>
          </div>
        </div>

        <div>
          <FieldLabel>Current auto-graded score</FieldLabel>
          <p className="mt-1 text-sm text-white/60">{submission.score} / 100</p>
        </div>

        <label className="flex flex-col gap-1.5">
          <FieldLabel>New adjusted score</FieldLabel>
          <input type="number" value={score} onChange={(e) => setScore(Number(e.target.value) || 0)} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1.5">
          <FieldLabel>Override reason</FieldLabel>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={selectClass}>
            {overrideReasons.map((r) => (
              <option key={r} value={r} className="bg-[#0f1420]">
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <FieldLabel>Instructor notes</FieldLabel>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClass} placeholder="Explain the reasoning behind this override" />
        </label>
      </div>
    </ModalShell>
  )
}

/* --------------------------------- Main page --------------------------------- */

export function ChallengeManagerPage() {
  const [challengeList, setChallengeList] = useState<Challenge[]>(seedChallenges)
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, ChallengeAnalytics>>(seedAnalytics)
  const [statusTab, setStatusTab] = useState<StatusTab>("All")
  const [editingDraft, setEditingDraft] = useState<ChallengeDraft | null>(null)
  const [isNewChallenge, setIsNewChallenge] = useState(false)
  const [expandedSubmissions, setExpandedSubmissions] = useState<string | null>(null)
  const [drawerSubmission, setDrawerSubmission] = useState<{ challenge: Challenge; submission: ChallengeSubmission } | null>(null)
  const [overrideTarget, setOverrideTarget] = useState<{ challenge: Challenge; submission: ChallengeSubmission } | null>(null)

  const filteredChallenges = useMemo(
    () => (statusTab === "All" ? challengeList : challengeList.filter((c) => c.status === statusTab)),
    [challengeList, statusTab],
  )

  const summary = useMemo(() => {
    const active = challengeList.filter((c) => c.status === "Active").length
    const drafts = challengeList.filter((c) => c.status === "Draft").length
    const totalSubmissions = Object.values(analyticsMap).reduce((n, a) => n + a.totalSubmissions, 0)
    const autoGraded = Object.values(analyticsMap).reduce((n, a) => n + a.totalSubmissions - a.manualOverrideCount, 0)
    const manualOverrides = Object.values(analyticsMap).reduce((n, a) => n + a.submissions.filter((s) => s.status === "Overridden").length, 0)
    const pendingReview = Object.values(analyticsMap).reduce((n, a) => n + a.submissions.filter((s) => s.status === "Needs review").length, 0)
    const fidelities = Object.values(analyticsMap).map((a) => a.avgFidelity)
    const avgFidelity = fidelities.length ? Math.round(fidelities.reduce((n, f) => n + f, 0) / fidelities.length) : 0
    return {
      active,
      drafts,
      totalSubmissions,
      autoGradedPct: totalSubmissions ? Math.round((autoGraded / totalSubmissions) * 100) : 0,
      manualOverrides: manualOverrides || pendingReview,
      avgFidelity,
    }
  }, [challengeList, analyticsMap])

  function openCreate() {
    setEditingDraft(emptyChallengeDraft())
    setIsNewChallenge(true)
  }

  function openEdit(challenge: Challenge) {
    setEditingDraft(challengeToDraft(challenge))
    setIsNewChallenge(false)
  }

  function saveChallenge() {
    if (!editingDraft) return
    const challenge = draftToChallenge(editingDraft)
    setChallengeList((list) => {
      if (isNewChallenge) return [challenge, ...list]
      return list.map((c) => (c.id === challenge.id ? challenge : c))
    })
    setEditingDraft(null)
  }

  function duplicateChallenge(challenge: Challenge) {
    const copy: Challenge = { ...challenge, id: uid("ch"), title: `${challenge.title} (copy)`, status: "Draft" }
    setChallengeList((list) => [copy, ...list])
  }

  function deleteChallenge(id: string) {
    setChallengeList((list) => list.filter((c) => c.id !== id))
    setAnalyticsMap((map) => {
      const next = { ...map }
      delete next[id]
      return next
    })
    if (expandedSubmissions === id) setExpandedSubmissions(null)
  }

  function saveOverride(score: number, reason: string, notes: string) {
    if (!overrideTarget) return
    const { challenge, submission } = overrideTarget
    setAnalyticsMap((map) => {
      const analytics = map[challenge.id]
      if (!analytics) return map
      return {
        ...map,
        [challenge.id]: {
          ...analytics,
          submissions: analytics.submissions.map((s) =>
            s.id === submission.id ? { ...s, score, status: "Overridden", overrideReason: reason, overrideNotes: notes } : s,
          ),
        },
      }
    })
    setOverrideTarget(null)
    setDrawerSubmission(null)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#F5B942]/15 text-[#F5B942]">
              <Atom className="size-5" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[.22em] text-white/45">Instructor view</p>
              <h1 className="text-2xl font-semibold text-white">Coding challenges</h1>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Create circuit-building challenges, configure auto-grading criteria, assign to students, and review results with manual override capability.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50">
          <span className="size-1.5 rounded-full bg-[#4ADE80]" /> Data synced 2m ago
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Active challenges" value={String(summary.active)} detail={`${summary.active} assigned \u00b7 ${summary.drafts} drafts`} icon={Code2} accent="#00D4FF" />
        <StatCard label="Total submissions" value={String(summary.totalSubmissions)} detail="Across all challenges" icon={Upload} accent="#4ADE80" />
        <StatCard label="Auto-graded" value={`${summary.autoGradedPct}%`} detail={`${summary.totalSubmissions - summary.manualOverrides} of ${summary.totalSubmissions} submissions`} icon={Zap} accent="#A78BFA" />
        <StatCard label="Manual overrides" value={String(summary.manualOverrides)} detail="Pending instructor review" icon={Pencil} accent="#F5B942" />
        <StatCard label="Avg. fidelity" value={`${summary.avgFidelity}%`} detail="Against target circuits" icon={Gauge} accent="#FB7185" />
      </div>

      <div>
        <SectionHeading eyebrow="Circuit challenges" title="All challenges" actionLabel="Create challenge" onAction={openCreate} />

        <div className="mb-5">
          <FilterPillGroup options={STATUS_TABS} value={statusTab} onChange={setStatusTab} />
        </div>

        <div className="flex flex-col gap-4">
          {filteredChallenges.map((challenge) => (
            <div key={challenge.id} className="flex flex-col gap-4">
              <ChallengeCard
                challenge={challenge}
                analytics={analyticsMap[challenge.id]}
                onEdit={() => openEdit(challenge)}
                onViewSubmissions={() => setExpandedSubmissions((cur) => (cur === challenge.id ? null : challenge.id))}
                onAssign={() => openEdit(challenge)}
                onDuplicate={() => duplicateChallenge(challenge)}
                onDelete={() => deleteChallenge(challenge.id)}
                showingSubmissions={expandedSubmissions === challenge.id}
              />
              {expandedSubmissions === challenge.id && (
                analyticsMap[challenge.id] ? (
                  <SubmissionsPanel
                    challenge={challenge}
                    analytics={analyticsMap[challenge.id]}
                    onViewCircuit={(submission) => setDrawerSubmission({ challenge, submission })}
                    onOverride={(submission) => setOverrideTarget({ challenge, submission })}
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.02] p-5 text-sm text-white/40">
                    <Ban className="size-4" /> No submissions yet for this challenge.
                  </div>
                )
              )}
            </div>
          ))}
          {filteredChallenges.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[.02] p-8 text-center text-sm text-white/40">No challenges match this filter.</div>
          )}
        </div>
      </div>

      {editingDraft && (
        <ChallengeEditorModal draft={editingDraft} setDraft={(fn) => setEditingDraft((d) => (d ? fn(d) : d))} isNew={isNewChallenge} onCancel={() => setEditingDraft(null)} onSave={saveChallenge} />
      )}

      {drawerSubmission && (
        <SubmissionDrawer
          challenge={drawerSubmission.challenge}
          submission={drawerSubmission.submission}
          onClose={() => setDrawerSubmission(null)}
          onOverride={() => {
            setOverrideTarget(drawerSubmission)
          }}
        />
      )}

      {overrideTarget && (
        <OverrideModal challenge={overrideTarget.challenge} submission={overrideTarget.submission} onCancel={() => setOverrideTarget(null)} onSave={saveOverride} />
      )}
    </div>
  )
}
