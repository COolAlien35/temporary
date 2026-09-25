"use client"

import type React from "react"
import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Ban,
  BrainCircuit,
  Clock,
  Copy,
  Eye,
  MessageCircleQuestion,
  Pencil,
  Plus,
  ShieldAlert,
  Target,
  Trash2,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react"
import { GATE_GROUPS } from "@/lib/studio/gates"
import type { StudioGateType } from "@/lib/studio/types"
import { students as rosterStudents } from "@/lib/instructor-students"
import {
  algorithmSlugOptions,
  basisStatesForQubits,
  conceptOptions,
  debugScenarios as seedScenarios,
  debugSetAnalytics as seedAnalytics,
  formatSeconds,
  type DebugScenario,
  type DebugSetAnalytics,
  type DebugSetDifficulty,
  type DebugSetStatus,
  type FaultedGate,
  type SocraticQuestion,
  type StudentAttempt,
} from "@/lib/instructor-debug-sets"

/* --------------------------------- Constants -------------------------------- */

type StatusTab = "All" | DebugSetStatus
type EditorTab = "Scenario" | "Fault & Circuit" | "Socratic Flow" | "Hints"

const STATUS_TABS: StatusTab[] = ["All", "Active", "Draft", "Archived"]
const EDITOR_TABS: EditorTab[] = ["Scenario", "Fault & Circuit", "Socratic Flow", "Hints"]
const DIFFICULTY_OPTIONS: DebugSetDifficulty[] = ["Beginner", "Intermediate", "Advanced"]
const PLACEABLE_GATE_GROUPS = GATE_GROUPS.filter((g) => g.category === "single" || g.category === "multi")

const statusStyles: Record<DebugSetStatus, { text: string; bg: string; dot: string }> = {
  Active: { text: "text-[#4ADE80]", bg: "bg-[#4ADE80]/12", dot: "#4ADE80" },
  Draft: { text: "text-[#F5B942]", bg: "bg-[#F5B942]/12", dot: "#F5B942" },
  Archived: { text: "text-white/60", bg: "bg-white/10", dot: "#9CA3AF" },
}

const difficultyStyles: Record<DebugSetDifficulty, string> = {
  Beginner: "#34D399",
  Intermediate: "#00D4FF",
  Advanced: "#E879F9",
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

function StatusBadge({ status }: { status: DebugSetStatus }) {
  const style = statusStyles[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${style.text} ${style.bg}`}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
      {status}
    </span>
  )
}

function DifficultyBadge({ difficulty }: { difficulty: DebugSetDifficulty }) {
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
const textareaClass = `${inputClass} min-h-20 resize-none`
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

/* --------------------------------- Scenario draft --------------------------------- */

type ScenarioDraft = {
  id: string
  title: string
  description: string
  status: DebugSetStatus
  difficulty: DebugSetDifficulty
  concept: (typeof conceptOptions)[number]
  algorithmSlug: (typeof algorithmSlugOptions)[number]
  qubits: number
  correctGates: FaultedGate[]
  faultDescription: string
  socraticFlow: SocraticQuestion[]
  hintsText: string[]
  expectedFix: string
}

function emptyDraft(): ScenarioDraft {
  return {
    id: uid("ds"),
    title: "",
    description: "",
    status: "Draft",
    difficulty: "Beginner",
    concept: conceptOptions[0],
    algorithmSlug: "custom",
    qubits: 2,
    correctGates: [{ step: 0, qubit: 0, gate: "H", isFault: false }],
    faultDescription: "",
    socraticFlow: [],
    hintsText: [],
    expectedFix: "",
  }
}

function scenarioToDraft(scenario: DebugScenario): ScenarioDraft {
  return {
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    status: scenario.status,
    difficulty: scenario.difficulty,
    concept: scenario.concept,
    algorithmSlug: scenario.algorithmSlug,
    qubits: scenario.qubits,
    correctGates: scenario.correctGates.map((g) => ({ ...g })),
    faultDescription: scenario.faultDescription,
    socraticFlow: scenario.socraticFlow.map((q) => ({ ...q })),
    hintsText: [...scenario.hints],
    expectedFix: scenario.expectedFix,
  }
}

function draftToScenario(draft: ScenarioDraft): DebugScenario {
  return {
    id: draft.id,
    title: draft.title.trim() || "Untitled debug scenario",
    description: draft.description,
    status: draft.status,
    difficulty: draft.difficulty,
    concept: draft.concept,
    algorithmSlug: draft.algorithmSlug,
    qubits: draft.qubits,
    correctGates: draft.correctGates,
    faultDescription: draft.faultDescription,
    socraticFlow: draft.socraticFlow,
    hints: draft.hintsText.filter((h) => h.trim().length > 0),
    expectedFix: draft.expectedFix,
    createdDate: new Date().toISOString().slice(0, 10),
  }
}

/* --------------------------------- Scenario editor modal --------------------------------- */

function ScenarioEditorModal({
  draft,
  setDraft,
  isNew,
  onCancel,
  onSave,
}: {
  draft: ScenarioDraft
  setDraft: (fn: (d: ScenarioDraft) => ScenarioDraft) => void
  isNew: boolean
  onCancel: () => void
  onSave: () => void
}) {
  const [tab, setTab] = useState<EditorTab>("Scenario")
  const faultCount = draft.correctGates.filter((g) => g.isFault).length

  function updateQubits(qubits: number) {
    setDraft((d) => ({ ...d, qubits, correctGates: d.correctGates.filter((g) => g.qubit < qubits && (g.target === undefined || g.target < qubits)) }))
  }

  function addGate() {
    setDraft((d) => ({
      ...d,
      correctGates: [...d.correctGates, { step: d.correctGates.length, qubit: 0, gate: "H", isFault: false }],
    }))
  }

  function updateGate(index: number, patch: Partial<FaultedGate>) {
    setDraft((d) => ({ ...d, correctGates: d.correctGates.map((g, i) => (i === index ? { ...g, ...patch } : g)) }))
  }

  function removeGate(index: number) {
    setDraft((d) => ({ ...d, correctGates: d.correctGates.filter((_, i) => i !== index) }))
  }

  function addQuestion() {
    setDraft((d) => ({
      ...d,
      socraticFlow: [
        ...d.socraticFlow,
        { id: uid("sq"), question: "", expectedInsight: "", followUp: "", hintIfStuck: "" },
      ],
    }))
  }

  function updateQuestion(index: number, patch: Partial<SocraticQuestion>) {
    setDraft((d) => ({ ...d, socraticFlow: d.socraticFlow.map((q, i) => (i === index ? { ...q, ...patch } : q)) }))
  }

  function removeQuestion(index: number) {
    setDraft((d) => ({ ...d, socraticFlow: d.socraticFlow.filter((_, i) => i !== index) }))
  }

  function addHint() {
    setDraft((d) => ({ ...d, hintsText: [...d.hintsText, ""] }))
  }

  function updateHint(index: number, value: string) {
    setDraft((d) => ({ ...d, hintsText: d.hintsText.map((h, i) => (i === index ? value : h)) }))
  }

  function removeHint(index: number) {
    setDraft((d) => ({ ...d, hintsText: d.hintsText.filter((_, i) => i !== index) }))
  }

  return (
    <ModalShell
      onClose={onCancel}
      eyebrow={isNew ? "New debug scenario" : "Edit debug scenario"}
      title={draft.title || "Untitled debug scenario"}
      maxWidth="max-w-3xl"
      footer={
        <>
          <button type="button" onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#04222b] transition hover:bg-[#00D4FF]/85"
          >
            Save scenario
          </button>
        </>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2 border-b border-white/8 pb-4">
        {EDITOR_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === t ? "bg-[#00D4FF]/15 text-[#00D4FF]" : "text-white/50 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Scenario" && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Title</FieldLabel>
            <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className={inputClass} placeholder="e.g. Bell State Fault" />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className={textareaClass}
              placeholder="Describe the circuit's intended behavior and what the seeded fault disrupts."
            />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Concept</FieldLabel>
              <select value={draft.concept} onChange={(e) => setDraft((d) => ({ ...d, concept: e.target.value as (typeof conceptOptions)[number] }))} className={selectClass}>
                {conceptOptions.map((c) => (
                  <option key={c} value={c} className="bg-[#0f1420]">
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Difficulty</FieldLabel>
              <select value={draft.difficulty} onChange={(e) => setDraft((d) => ({ ...d, difficulty: e.target.value as DebugSetDifficulty }))} className={selectClass}>
                {DIFFICULTY_OPTIONS.map((d) => (
                  <option key={d} value={d} className="bg-[#0f1420]">
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Number of qubits</FieldLabel>
              <select value={draft.qubits} onChange={(e) => updateQubits(Number(e.target.value))} className={selectClass}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n} className="bg-[#0f1420]">
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Status</FieldLabel>
              <select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as DebugSetStatus }))} className={selectClass}>
                {(["Active", "Draft", "Archived"] as DebugSetStatus[]).map((s) => (
                  <option key={s} value={s} className="bg-[#0f1420]">
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Overall fault summary</FieldLabel>
            <textarea
              value={draft.faultDescription}
              onChange={(e) => setDraft((d) => ({ ...d, faultDescription: e.target.value }))}
              className={textareaClass}
              placeholder="Explain the seeded fault and why it breaks the expected behavior \u2014 shown to instructors, not students."
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Expected fix</FieldLabel>
            <textarea
              value={draft.expectedFix}
              onChange={(e) => setDraft((d) => ({ ...d, expectedFix: e.target.value }))}
              className={textareaClass}
              placeholder="Describe the exact correction a student should make to resolve the fault."
            />
          </label>
        </div>
      )}

      {tab === "Fault & Circuit" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[.14em] text-white/40">Circuit gates</p>
            <span className={`text-xs font-medium ${faultCount > 0 ? "text-[#F5B942]" : "text-[#FB7185]"}`}>
              {faultCount} gate{faultCount === 1 ? "" : "s"} flagged as fault
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {draft.correctGates.map((gate, index) => (
              <div key={index} className={`rounded-xl border p-3 ${gate.isFault ? "border-[#FB7185]/40 bg-[#FB7185]/[.06]" : "border-white/8 bg-black/15"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-white/40">Step</span>
                  <input
                    type="number"
                    value={gate.step}
                    onChange={(e) => updateGate(index, { step: Number(e.target.value) || 0 })}
                    className={`${inputClass} w-16`}
                  />
                  <span className="text-xs text-white/40">Qubit</span>
                  <select value={gate.qubit} onChange={(e) => updateGate(index, { qubit: Number(e.target.value) })} className={`${selectClass} w-20`}>
                    {Array.from({ length: draft.qubits }, (_, i) => i).map((q) => (
                      <option key={q} value={q} className="bg-[#0f1420]">
                        {`q[${q}]`}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-white/40">Gate</span>
                  <select
                    value={gate.gate}
                    onChange={(e) => updateGate(index, { gate: e.target.value as StudioGateType })}
                    className={`${selectClass} w-28`}
                  >
                    {PLACEABLE_GATE_GROUPS.map((group) => (
                      <optgroup key={group.category} label={group.label} className="bg-[#0f1420]">
                        {group.gates.map((g) => (
                          <option key={g} value={g} className="bg-[#0f1420]">
                            {g}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <span className="text-xs text-white/40">Target</span>
                  <select
                    value={gate.target ?? -1}
                    onChange={(e) => updateGate(index, { target: Number(e.target.value) === -1 ? undefined : Number(e.target.value) })}
                    className={`${selectClass} w-24`}
                  >
                  <option value={-1} className="bg-[#0f1420]">
                    {"\u2014"}
                  </option>
                    {Array.from({ length: draft.qubits }, (_, i) => i).map((q) => (
                      <option key={q} value={q} className="bg-[#0f1420]">
                        {`q[${q}]`}
                      </option>
                    ))}
                  </select>
                  <label className="ml-auto flex items-center gap-1.5 text-xs text-[#FB7185]">
                    <input type="checkbox" checked={gate.isFault} onChange={(e) => updateGate(index, { isFault: e.target.checked })} className="size-3.5 accent-[#FB7185]" />
                    Mark as fault
                  </label>
                  <button type="button" onClick={() => removeGate(index)} className="rounded-md p-1.5 text-white/40 hover:text-[#FB7185]">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {gate.isFault && (
                  <input
                    value={gate.faultDescription ?? ""}
                    onChange={(e) => updateGate(index, { faultDescription: e.target.value })}
                    className={`${inputClass} mt-2`}
                    placeholder="Describe what this specific fault does"
                  />
                )}
              </div>
            ))}
            <button type="button" onClick={addGate} className="flex items-center gap-1.5 self-start text-xs text-[#00D4FF] hover:text-white">
              <Plus className="size-3.5" /> Add gate
            </button>
          </div>
        </div>
      )}

      {tab === "Socratic Flow" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[.14em] text-white/40">Guided questioning sequence</p>
          <p className="text-xs text-white/40">
            Each step nudges the student toward discovering the fault themselves rather than revealing the answer outright.
          </p>
          {draft.socraticFlow.map((question, index) => (
            <div key={question.id} className="rounded-xl border border-white/8 bg-black/15 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-[#00D4FF]/12 px-2 py-0.5 text-[11px] font-medium text-[#00D4FF]">Step {index + 1}</span>
                <button type="button" onClick={() => removeQuestion(index)} className="rounded-md p-1.5 text-white/40 hover:text-[#FB7185]">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="flex flex-col gap-2.5">
                <label className="flex flex-col gap-1.5">
                  <FieldLabel>Question posed to student</FieldLabel>
                  <textarea value={question.question} onChange={(e) => updateQuestion(index, { question: e.target.value })} className={textareaClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <FieldLabel>Expected insight</FieldLabel>
                  <textarea value={question.expectedInsight} onChange={(e) => updateQuestion(index, { expectedInsight: e.target.value })} className={textareaClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <FieldLabel>Follow-up if correct</FieldLabel>
                  <input value={question.followUp} onChange={(e) => updateQuestion(index, { followUp: e.target.value })} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <FieldLabel>Hint if stuck</FieldLabel>
                  <input value={question.hintIfStuck} onChange={(e) => updateQuestion(index, { hintIfStuck: e.target.value })} className={inputClass} />
                </label>
              </div>
            </div>
          ))}
          <button type="button" onClick={addQuestion} className="flex items-center gap-1.5 self-start text-xs text-[#00D4FF] hover:text-white">
            <Plus className="size-3.5" /> Add Socratic step
          </button>
        </div>
      )}

      {tab === "Hints" && (
        <div className="flex flex-col gap-2">
          <p className="mb-1 text-xs uppercase tracking-[.14em] text-white/40">Hints (optional, in escalating order)</p>
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
      )}
    </ModalShell>
  )
}

/* --------------------------------- Scenario card --------------------------------- */

function ScenarioCard({
  scenario,
  analytics,
  onEdit,
  onViewAttempts,
  onDuplicate,
  onDelete,
  showingAttempts,
}: {
  scenario: DebugScenario
  analytics?: DebugSetAnalytics
  onEdit: () => void
  onViewAttempts: () => void
  onDuplicate: () => void
  onDelete: () => void
  showingAttempts: boolean
}) {
  const faultCount = scenario.correctGates.filter((g) => g.isFault).length

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{scenario.title}</h3>
            <DifficultyBadge difficulty={scenario.difficulty} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#00D4FF]/12 px-2 py-0.5 text-[11px] font-medium text-[#00D4FF]">{scenario.concept}</span>
            {scenario.algorithmSlug !== "custom" && (
              <span className="rounded-full bg-[#A78BFA]/12 px-2 py-0.5 text-[11px] font-medium text-[#A78BFA]">{scenario.algorithmSlug}</span>
            )}
          </div>
        </div>
        <StatusBadge status={scenario.status} />
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-white/55">{scenario.description}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div>
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Qubits</p>
          <p className="mt-0.5 text-sm font-medium text-white">{scenario.qubits}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Seeded faults</p>
          <p className="mt-0.5 text-sm font-medium text-white">{faultCount}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Socratic steps</p>
          <p className="mt-0.5 text-sm font-medium text-white">{scenario.socraticFlow.length}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Attempts</p>
          <p className="mt-0.5 text-sm font-medium text-white">{analytics?.totalAttempts ?? 0}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Solve rate</p>
          <p className="mt-0.5 text-sm font-medium text-white">{analytics ? `${analytics.solveRate}%` : "\u2014"}</p>
        </div>
      </div>

      {analytics && (
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10">
          <div style={{ width: `${analytics.solveRate}%`, backgroundColor: "#4ADE80" }} title={`Solved: ${analytics.solveRate}%`} />
          <div style={{ width: `${100 - analytics.solveRate}%`, backgroundColor: "#FB7185" }} title={`Unsolved: ${100 - analytics.solveRate}%`} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
        <button type="button" onClick={onEdit} className={ghostBtn}>
          <Pencil className="mr-1 inline size-3.5" /> Edit
        </button>
        <button type="button" onClick={onViewAttempts} className={showingAttempts ? `${ghostBtn} border-[#00D4FF]/40 text-[#00D4FF]` : ghostBtn}>
          <Eye className="mr-1 inline size-3.5" /> {showingAttempts ? "Hide attempts" : "View attempts"}
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

/* --------------------------------- Attempts panel --------------------------------- */

function AttemptsPanel({
  scenario,
  analytics,
  onViewAttempt,
}: {
  scenario: DebugScenario
  analytics: DebugSetAnalytics
  onViewAttempt: (attempt: StudentAttempt) => void
}) {
  return (
    <div className="rounded-2xl border border-[#00D4FF]/25 bg-[#00D4FF]/[.04] p-5">
      <p className="mb-4 text-xs uppercase tracking-[.16em] text-[#00D4FF]">{"Student attempts \u2014 " + scenario.title}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Total attempts</p>
          <p className="mt-1 text-xl font-semibold text-white">{analytics.totalAttempts}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Solve rate</p>
          <p className="mt-1 text-xl font-semibold text-[#4ADE80]">{analytics.solveRate}%</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Avg. attempts to solve</p>
          <p className="mt-1 text-xl font-semibold text-white">{analytics.avgAttempts}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Avg. hints used</p>
          <p className="mt-1 text-xl font-semibold text-[#F5B942]">{analytics.avgHintsUsed}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Avg. time to solve</p>
          <p className="mt-1 text-xl font-semibold text-white">{formatSeconds(analytics.avgTimeSeconds)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-white/50">
        <span className="flex items-center gap-1.5">
          <Zap className="size-3 text-[#4ADE80]" /> Fastest: {formatSeconds(analytics.fastestTimeSeconds)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3 text-[#FB7185]" /> Slowest: {formatSeconds(analytics.slowestTimeSeconds)}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/8 text-[11px] uppercase tracking-[.1em] text-white/40">
              <th className="px-3 py-2.5">#</th>
              <th className="px-3 py-2.5">Student</th>
              <th className="px-3 py-2.5">Outcome</th>
              <th className="px-3 py-2.5">Attempts</th>
              <th className="px-3 py-2.5">Hints used</th>
              <th className="px-3 py-2.5">Time to solve</th>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {analytics.studentAttempts.slice(0, 12).map((attempt, index) => (
              <tr key={`${attempt.studentName}-${index}`} className="border-b border-white/5 last:border-0 hover:bg-white/[.02]">
                <td className="px-3 py-2.5 text-white/40">{index + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`flex size-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ${avatarGradient}`}>
                      {initials(attempt.studentName)}
                    </span>
                    <span className="text-white">{attempt.studentName}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${attempt.solved ? "text-[#4ADE80] bg-[#4ADE80]/12" : "text-[#FB7185] bg-[#FB7185]/12"}`}>
                    {attempt.solved ? "Solved" : "Unsolved"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-white">{attempt.attempts}</td>
                <td className="px-3 py-2.5 text-white">{attempt.hintsUsed}</td>
                <td className="px-3 py-2.5 text-white/70">{formatSeconds(attempt.timeSeconds)}</td>
                <td className="px-3 py-2.5 text-white/50">{attempt.date}</td>
                <td className="px-3 py-2.5">
                  <button type="button" onClick={() => onViewAttempt(attempt)} className="rounded-md p-1.5 text-white/40 hover:text-[#00D4FF]" title="View fault path">
                    <Eye className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {analytics.studentAttempts.length > 12 && (
        <p className="mt-2 text-center text-xs text-white/35">Showing 12 of {analytics.studentAttempts.length} attempts.</p>
      )}
    </div>
  )
}

/* --------------------------------- Attempt detail drawer --------------------------------- */

function AttemptDrawer({
  scenario,
  attempt,
  onClose,
}: {
  scenario: DebugScenario
  attempt: StudentAttempt
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0b0f18] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <span className={`flex size-11 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarGradient}`}>
              {initials(attempt.studentName)}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-white">{attempt.studentName}</h3>
              <p className="text-xs text-white/45">{scenario.title}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-white/40 hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${attempt.solved ? "text-[#4ADE80] bg-[#4ADE80]/12" : "text-[#FB7185] bg-[#FB7185]/12"}`}>
              {attempt.solved ? "Solved" : "Unsolved"}
            </span>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/50">Submitted {attempt.date}</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/8 bg-black/15 p-3 text-center">
              <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Attempts</p>
              <p className="mt-1 text-lg font-semibold text-white">{attempt.attempts}</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-black/15 p-3 text-center">
              <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Hints used</p>
              <p className="mt-1 text-lg font-semibold text-[#F5B942]">{attempt.hintsUsed}</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-black/15 p-3 text-center">
              <p className="text-[11px] uppercase tracking-[.1em] text-white/35">Time</p>
              <p className="mt-1 text-lg font-semibold text-white">{formatSeconds(attempt.timeSeconds)}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs uppercase tracking-[.14em] text-white/40">Seeded fault</p>
            <div className="flex items-start gap-2 rounded-lg border border-[#FB7185]/30 bg-[#FB7185]/10 p-3 text-xs text-[#FB7185]">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>{scenario.faultDescription}</span>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs uppercase tracking-[.14em] text-white/40">Socratic path this student walked</p>
            <div className="flex flex-col gap-2">
              {scenario.socraticFlow.map((question, index) => (
                <div key={question.id} className="rounded-lg border border-white/8 bg-black/15 p-3">
                  <p className="text-[11px] font-medium text-[#00D4FF]">Step {index + 1}</p>
                  <p className="mt-1 text-sm text-white/75">{question.question}</p>
                  {index < attempt.hintsUsed && <p className="mt-1 text-xs text-[#F5B942]">Hint used: {question.hintIfStuck}</p>}
                </div>
              ))}
              {scenario.socraticFlow.length === 0 && <p className="text-xs text-white/35">No Socratic flow configured for this scenario yet.</p>}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs uppercase tracking-[.14em] text-white/40">Expected fix</p>
            <p className="rounded-lg border border-[#4ADE80]/30 bg-[#4ADE80]/10 p-3 text-xs text-[#4ADE80]">{scenario.expectedFix}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------- Main page --------------------------------- */

export function DebugSetManagerPage() {
  const [scenarioList, setScenarioList] = useState<DebugScenario[]>(seedScenarios)
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, DebugSetAnalytics>>(seedAnalytics)
  const [statusTab, setStatusTab] = useState<StatusTab>("All")
  const [editingDraft, setEditingDraft] = useState<ScenarioDraft | null>(null)
  const [isNewScenario, setIsNewScenario] = useState(false)
  const [expandedAttempts, setExpandedAttempts] = useState<string | null>(null)
  const [attemptDrawer, setAttemptDrawer] = useState<{ scenario: DebugScenario; attempt: StudentAttempt } | null>(null)

  const filteredScenarios = useMemo(
    () => (statusTab === "All" ? scenarioList : scenarioList.filter((s) => s.status === statusTab)),
    [scenarioList, statusTab],
  )

  const summary = useMemo(() => {
    const active = scenarioList.filter((s) => s.status === "Active").length
    const drafts = scenarioList.filter((s) => s.status === "Draft").length
    const analyticsValues = Object.values(analyticsMap)
    const totalAttempts = analyticsValues.reduce((n, a) => n + a.totalAttempts, 0)
    const solveRates = analyticsValues.map((a) => a.solveRate)
    const avgSolveRate = solveRates.length ? Math.round(solveRates.reduce((n, r) => n + r, 0) / solveRates.length) : 0
    const hintRates = analyticsValues.map((a) => a.avgHintsUsed)
    const avgHints = hintRates.length ? Math.round((hintRates.reduce((n, r) => n + r, 0) / hintRates.length) * 10) / 10 : 0
    const timeValues = analyticsValues.map((a) => a.avgTimeSeconds)
    const avgTime = timeValues.length ? Math.round(timeValues.reduce((n, t) => n + t, 0) / timeValues.length) : 0
    return { active, drafts, totalAttempts, avgSolveRate, avgHints, avgTime }
  }, [scenarioList, analyticsMap])

  function openCreate() {
    setEditingDraft(emptyDraft())
    setIsNewScenario(true)
  }

  function openEdit(scenario: DebugScenario) {
    setEditingDraft(scenarioToDraft(scenario))
    setIsNewScenario(false)
  }

  function saveScenario() {
    if (!editingDraft) return
    const scenario = draftToScenario(editingDraft)
    setScenarioList((list) => {
      if (isNewScenario) return [scenario, ...list]
      return list.map((s) => (s.id === scenario.id ? scenario : s))
    })
    setEditingDraft(null)
  }

  function duplicateScenario(scenario: DebugScenario) {
    const copy: DebugScenario = { ...scenario, id: uid("ds"), title: `${scenario.title} (copy)`, status: "Draft" }
    setScenarioList((list) => [copy, ...list])
  }

  function deleteScenario(id: string) {
    setScenarioList((list) => list.filter((s) => s.id !== id))
    setAnalyticsMap((map) => {
      const next = { ...map }
      delete next[id]
      return next
    })
    if (expandedAttempts === id) setExpandedAttempts(null)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#FB7185]/15 text-[#FB7185]">
              <ShieldAlert className="size-5" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[.22em] text-white/45">Instructor view</p>
              <h1 className="text-2xl font-semibold text-white">Debug sets</h1>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Author seeded-fault circuit scenarios, script the Socratic questioning flow that guides students to the fix, and review how
            students are performing on each one.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50">
          <span className="size-1.5 rounded-full bg-[#4ADE80]" /> Data synced 4m ago
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Active scenarios" value={String(summary.active)} detail={`${summary.active} live \u00b7 ${summary.drafts} drafts`} icon={ShieldAlert} accent="#00D4FF" />
        <StatCard label="Total attempts" value={String(summary.totalAttempts)} detail="Across all scenarios" icon={Users} accent="#4ADE80" />
        <StatCard label="Avg. solve rate" value={`${summary.avgSolveRate}%`} detail="Students who found the fix" icon={Trophy} accent="#A78BFA" />
        <StatCard label="Avg. hints used" value={String(summary.avgHints)} detail="Per attempt, before solving" icon={MessageCircleQuestion} accent="#F5B942" />
        <StatCard label="Avg. time to solve" value={formatSeconds(summary.avgTime)} detail="From first look to fix" icon={Target} accent="#FB7185" />
      </div>

      <div>
        <SectionHeading eyebrow="Seeded-fault scenarios" title="All debug sets" actionLabel="Create debug set" onAction={openCreate} />

        <div className="mb-5">
          <FilterPillGroup options={STATUS_TABS} value={statusTab} onChange={setStatusTab} />
        </div>

        <div className="flex flex-col gap-4">
          {filteredScenarios.map((scenario) => (
            <div key={scenario.id} className="flex flex-col gap-4">
              <ScenarioCard
                scenario={scenario}
                analytics={analyticsMap[scenario.id]}
                onEdit={() => openEdit(scenario)}
                onViewAttempts={() => setExpandedAttempts((cur) => (cur === scenario.id ? null : scenario.id))}
                onDuplicate={() => duplicateScenario(scenario)}
                onDelete={() => deleteScenario(scenario.id)}
                showingAttempts={expandedAttempts === scenario.id}
              />
              {expandedAttempts === scenario.id && (
                analyticsMap[scenario.id] ? (
                  <AttemptsPanel
                    scenario={scenario}
                    analytics={analyticsMap[scenario.id]}
                    onViewAttempt={(attempt) => setAttemptDrawer({ scenario, attempt })}
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.02] p-5 text-sm text-white/40">
                    <Ban className="size-4" /> No attempts yet for this scenario.
                  </div>
                )
              )}
            </div>
          ))}
          {filteredScenarios.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[.02] p-8 text-center text-sm text-white/40">No debug sets match this filter.</div>
          )}
        </div>
      </div>

      {editingDraft && (
        <ScenarioEditorModal
          draft={editingDraft}
          setDraft={(fn) => setEditingDraft((d) => (d ? fn(d) : d))}
          isNew={isNewScenario}
          onCancel={() => setEditingDraft(null)}
          onSave={saveScenario}
        />
      )}

      {attemptDrawer && (
        <AttemptDrawer scenario={attemptDrawer.scenario} attempt={attemptDrawer.attempt} onClose={() => setAttemptDrawer(null)} />
      )}
    </div>
  )
}
