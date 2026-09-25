"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowUpDown,
  Atom,
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Edit3,
  Eye,
  Filter,
  Gauge,
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  Sliders,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
  XCircle,
} from "lucide-react"
import {
  accentHex,
  allowedGateOptions,
  batchOptions,
  cohortOptions,
  contests as seedContests,
  difficultyBadgeClass,
  fidelityColor,
  statusBadgeClass,
  submissionStatusBadgeClass,
  submissions as seedSubmissions,
  type ContestAccent,
  type ContestAccessType,
  type ContestDifficulty,
  type ContestScoringRule,
  type ContestSubmission,
  type InstructorContest,
  type InstructorContestStatus,
  type SubmissionStatus,
} from "@/lib/instructor-contests"

/* --------------------------------- Constants -------------------------------- */

type StatusTab = "All Contests" | "Live" | "Upcoming" | "Ended" | "Drafts"
type EditorTab = "Details" | "Scoring" | "Scheduling"
type SubmissionTab = "All" | SubmissionStatus

const STATUS_TABS: StatusTab[] = ["All Contests", "Live", "Upcoming", "Ended", "Drafts"]
const EDITOR_TABS: EditorTab[] = ["Details", "Scoring", "Scheduling"]
const DIFFICULTIES: ContestDifficulty[] = ["Beginner", "Intermediate", "Advanced"]
const ACCENTS: ContestAccent[] = ["cyan", "violet", "amber", "green", "fuchsia"]

let uidCounter = 0
function uid(prefix: string) {
  uidCounter += 1
  return `${prefix}-${Date.now()}-${uidCounter}`
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
}

function formatTimestamp(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
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
  secondaryLabel,
  onSecondary,
}: {
  eyebrow?: string
  title: string
  actionLabel?: string
  onAction?: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-[11px] uppercase tracking-[.22em] text-[#00D4FF]">{eyebrow}</p>}
        <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/60 transition hover:border-white/25 hover:text-white"
          >
            {secondaryLabel}
          </button>
        )}
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
    </div>
  )
}

function FilterPillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  counts,
}: {
  label?: string
  options: T[]
  value: T
  onChange: (value: T) => void
  counts?: Partial<Record<T, number>>
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="text-[11px] uppercase tracking-[.14em] text-white/35">{label}</span>}
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
          {counts && counts[option] != null && <span className="ml-1 text-white/35">({counts[option]})</span>}
        </button>
      ))}
    </div>
  )
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00D4FF]/40"
const selectClass = "rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#00D4FF]/40"
const textareaClass = `${inputClass} min-h-20 resize-none`
const ghostBtn =
  "rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-[#00D4FF]/40 hover:text-[#00D4FF]"
const dangerGhostBtn =
  "rounded-lg border border-[#FB7185]/30 px-3 py-1.5 text-xs font-medium text-[#FB7185] transition hover:bg-[#FB7185]/10"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-white/50">{children}</span>
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

function StatusPill({ status }: { status: InstructorContestStatus }) {
  const dotColor =
    status === "Live" ? "#4ADE80" : status === "Upcoming" ? "#F5B942" : status === "Draft" ? "#8B5CF6" : "#9CA3AF"
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(status)}`}>
      <span className={`size-1.5 rounded-full ${status === "Live" ? "animate-pulse" : ""}`} style={{ backgroundColor: dotColor }} />
      {status}
    </span>
  )
}

/* --------------------------------- Contest draft --------------------------------- */

type ContestDraft = {
  id: string
  title: string
  slug: string
  description: string
  problem: string
  difficulty: ContestDifficulty
  accent: ContestAccent
  maxQubits: number
  gateBudgetText: string
  allowedGates: string[]
  rubric: ContestScoringRule[]
  accessType: ContestAccessType
  targetCohort: string
  targetBatch: string
  startDate: string
  endDate: string
  autoPublish: boolean
  status: InstructorContestStatus
}

function contestToDraft(contest: InstructorContest): ContestDraft {
  return {
    id: contest.id,
    title: contest.title,
    slug: contest.id,
    description: contest.description,
    problem: contest.problem,
    difficulty: contest.difficulty,
    accent: contest.accent,
    maxQubits: contest.maxQubits,
    gateBudgetText: contest.gateBudget != null ? String(contest.gateBudget) : "",
    allowedGates: [...contest.allowedGates],
    rubric: contest.scoringRubric.map((r) => ({ ...r })),
    accessType: contest.accessType,
    targetCohort: contest.targetCohorts[0] ?? cohortOptions[0],
    targetBatch: contest.targetBatches[0] ?? batchOptions[0],
    startDate: contest.startDate.slice(0, 16),
    endDate: contest.endDate.slice(0, 16),
    autoPublish: contest.status !== "Draft",
    status: contest.status,
  }
}

function emptyContestDraft(): ContestDraft {
  return {
    id: uid("contest"),
    title: "",
    slug: "",
    description: "",
    problem: "",
    difficulty: "Intermediate",
    accent: "cyan",
    maxQubits: 2,
    gateBudgetText: "",
    allowedGates: ["H", "X", "CNOT"],
    rubric: [
      { id: uid("rule"), label: "State fidelity", maxPoints: 60, description: "" },
      { id: uid("rule"), label: "Gate efficiency", maxPoints: 25, description: "" },
      { id: uid("rule"), label: "Submission speed", maxPoints: 15, description: "" },
    ],
    accessType: "Public",
    targetCohort: cohortOptions[0],
    targetBatch: batchOptions[0],
    startDate: "",
    endDate: "",
    autoPublish: false,
    status: "Draft",
  }
}

function draftToContest(draft: ContestDraft, existing?: InstructorContest): InstructorContest {
  const gateBudget = draft.gateBudgetText.trim() === "" ? undefined : Number(draft.gateBudgetText)
  return {
    id: draft.id,
    title: draft.title,
    status: draft.autoPublish ? (existing?.status === "Live" ? "Live" : "Upcoming") : "Draft",
    difficulty: draft.difficulty,
    accent: draft.accent,
    description: draft.description,
    problem: draft.problem,
    rules: draft.rubric.map((r) => `${r.label}: ${r.maxPoints} points`),
    scoringRubric: draft.rubric,
    totalPoints: draft.rubric.reduce((sum, r) => sum + r.maxPoints, 0),
    startDate: draft.startDate || existing?.startDate || new Date().toISOString(),
    endDate: draft.endDate || existing?.endDate || new Date().toISOString(),
    countdown: existing?.countdown ?? "Scheduled",
    accessType: draft.accessType,
    targetCohorts: draft.accessType === "Cohort" ? [draft.targetCohort] : [],
    targetBatches: draft.accessType === "Batch" ? [draft.targetBatch] : [],
    maxQubits: draft.maxQubits,
    gateBudget,
    allowedGates: draft.allowedGates,
    participantsCount: existing?.participantsCount ?? 0,
    submissionsCount: existing?.submissionsCount ?? 0,
    avgFidelity: existing?.avgFidelity ?? 0,
    flaggedCount: existing?.flaggedCount ?? 0,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  }
}

/* --------------------------------- Contest editor form --------------------------------- */

function ContestEditorForm({
  draft,
  setDraft,
  tab,
}: {
  draft: ContestDraft
  setDraft: (updater: (d: ContestDraft) => ContestDraft) => void
  tab: EditorTab
}) {
  function toggleGate(gate: string) {
    setDraft((d) => ({
      ...d,
      allowedGates: d.allowedGates.includes(gate) ? d.allowedGates.filter((g) => g !== gate) : [...d.allowedGates, gate],
    }))
  }

  function updateRule(id: string, patch: Partial<ContestScoringRule>) {
    setDraft((d) => ({ ...d, rubric: d.rubric.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
  }

  function addRule() {
    setDraft((d) => ({ ...d, rubric: [...d.rubric, { id: uid("rule"), label: "New criterion", maxPoints: 10, description: "" }] }))
  }

  function removeRule(id: string) {
    setDraft((d) => ({ ...d, rubric: d.rubric.filter((r) => r.id !== id) }))
  }

  const totalPoints = draft.rubric.reduce((sum, r) => sum + r.maxPoints, 0)

  if (tab === "Details") {
    return (
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Title</FieldLabel>
          <input
            value={draft.title}
            onChange={(e) =>
              setDraft((d) => ({ ...d, title: e.target.value, slug: d.slug === slugify(d.title) || d.slug === "" ? slugify(e.target.value) : d.slug }))
            }
            className={inputClass}
            placeholder="e.g. Entanglement Speed Challenge"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Slug</FieldLabel>
          <input value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: slugify(e.target.value) }))} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Short description</FieldLabel>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            className={textareaClass}
            placeholder="One-line summary shown on the contest card"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Problem statement (Markdown supported)</FieldLabel>
          <textarea
            value={draft.problem}
            onChange={(e) => setDraft((d) => ({ ...d, problem: e.target.value }))}
            className={`${textareaClass} min-h-32`}
            placeholder="Describe the circuit-building task in detail"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Difficulty</FieldLabel>
          <select value={draft.difficulty} onChange={(e) => setDraft((d) => ({ ...d, difficulty: e.target.value as ContestDifficulty }))} className={selectClass}>
            {DIFFICULTIES.map((diff) => (
              <option key={diff} value={diff} className="bg-[#0f1420]">
                {diff}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Visual accent theme</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((accent) => (
              <button
                key={accent}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, accent }))}
                className={`flex size-9 items-center justify-center rounded-full border-2 transition ${
                  draft.accent === accent ? "border-white" : "border-transparent"
                }`}
                style={{ backgroundColor: accentHex[accent] }}
                aria-label={accent}
              >
                {draft.accent === accent && <CheckCircle2 className="size-4 text-[#07101a]" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (tab === "Scoring") {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Qubit count limit</FieldLabel>
            <input
              type="number"
              min={1}
              max={12}
              value={draft.maxQubits}
              onChange={(e) => setDraft((d) => ({ ...d, maxQubits: Number(e.target.value) || 1 }))}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Max gate budget (optional)</FieldLabel>
            <input
              value={draft.gateBudgetText}
              onChange={(e) => setDraft((d) => ({ ...d, gateBudgetText: e.target.value }))}
              className={inputClass}
              placeholder="e.g. 8"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Allowed gates</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {allowedGateOptions.map((gate) => (
              <button
                key={gate}
                type="button"
                onClick={() => toggleGate(gate)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-mono transition ${
                  draft.allowedGates.includes(gate) ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/50 hover:text-white"
                }`}
              >
                {gate}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FieldLabel>Scoring rubric</FieldLabel>
            <span className={`text-xs font-semibold ${totalPoints === 100 ? "text-[#4ADE80]" : "text-[#F5B942]"}`}>{totalPoints} / 100 pts</span>
          </div>
          <div className="flex flex-col gap-2">
            {draft.rubric.map((rule) => (
              <div key={rule.id} className="rounded-xl border border-white/8 bg-black/15 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={rule.label}
                    onChange={(e) => updateRule(rule.id, { label: e.target.value })}
                    className={`${inputClass} flex-1`}
                    placeholder="Criterion name"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={rule.maxPoints}
                    onChange={(e) => updateRule(rule.id, { maxPoints: Number(e.target.value) || 0 })}
                    className={`${inputClass} w-20 text-center`}
                  />
                  <span className="text-xs text-white/35">pts</span>
                  <button type="button" onClick={() => removeRule(rule.id)} className="shrink-0 rounded-md p-1.5 text-white/40 hover:text-[#FB7185]">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <input
                  value={rule.description}
                  onChange={(e) => updateRule(rule.id, { description: e.target.value })}
                  className={`${inputClass} mt-2`}
                  placeholder="Description of how this criterion is scored"
                />
              </div>
            ))}
            <button type="button" onClick={addRule} className="flex items-center gap-1.5 self-start text-xs text-[#00D4FF] hover:text-white">
              <Plus className="size-3.5" /> Add criterion
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <FieldLabel>Access type</FieldLabel>
        <div className="flex flex-col gap-2">
          {(["Public", "Cohort", "Batch"] as ContestAccessType[]).map((type) => (
            <label
              key={type}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                draft.accessType === type ? "border-[#00D4FF]/40 bg-[#00D4FF]/10" : "border-white/10 hover:border-white/20"
              }`}
            >
              <input
                type="radio"
                name="access-type"
                checked={draft.accessType === type}
                onChange={() => setDraft((d) => ({ ...d, accessType: type }))}
                className="size-4 accent-[#00D4FF]"
              />
              <span className="text-white">
                {type === "Public" ? "Public (Open to all students)" : type === "Cohort" ? "Restrict to Specific Cohort" : "Restrict to Specific Batch"}
              </span>
            </label>
          ))}
        </div>
      </div>

      {draft.accessType === "Cohort" && (
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Target cohort</FieldLabel>
          <select value={draft.targetCohort} onChange={(e) => setDraft((d) => ({ ...d, targetCohort: e.target.value }))} className={selectClass}>
            {cohortOptions.map((c) => (
              <option key={c} value={c} className="bg-[#0f1420]">
                {c}
              </option>
            ))}
          </select>
        </label>
      )}

      {draft.accessType === "Batch" && (
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Target batch</FieldLabel>
          <select value={draft.targetBatch} onChange={(e) => setDraft((d) => ({ ...d, targetBatch: e.target.value }))} className={selectClass}>
            {batchOptions.map((b) => (
              <option key={b} value={b} className="bg-[#0f1420]">
                {b}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Start date &amp; time</FieldLabel>
          <input
            type="datetime-local"
            value={draft.startDate}
            onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>End date &amp; time</FieldLabel>
          <input type="datetime-local" value={draft.endDate} onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))} className={inputClass} />
        </label>
      </div>

      {draft.startDate && draft.endDate && new Date(draft.endDate) > new Date(draft.startDate) && (
        <p className="rounded-lg border border-white/8 bg-black/15 px-3 py-2 text-xs text-white/50">
          Duration: {Math.round((new Date(draft.endDate).getTime() - new Date(draft.startDate).getTime()) / (1000 * 60 * 60))} hours
        </p>
      )}

      <label className="flex items-center justify-between rounded-xl border border-white/8 bg-black/15 px-3 py-2.5">
        <div>
          <p className="text-sm text-white">Auto-publish</p>
          <p className="text-xs text-white/45">Publish immediately instead of saving as a draft</p>
        </div>
        <button
          type="button"
          onClick={() => setDraft((d) => ({ ...d, autoPublish: !d.autoPublish }))}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${draft.autoPublish ? "bg-[#00D4FF]" : "bg-white/15"}`}
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-white transition ${draft.autoPublish ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </label>
    </div>
  )
}

/* --------------------------------- Contest card --------------------------------- */

function ContestManagerCard({
  contest,
  onModerate,
  onEdit,
  onDuplicate,
  onToggleLive,
}: {
  contest: InstructorContest
  onModerate: () => void
  onEdit: () => void
  onDuplicate: () => void
  onToggleLive: () => void
}) {
  const accent = accentHex[contest.accent]
  const accessLabel =
    contest.accessType === "Public"
      ? "Public"
      : contest.accessType === "Cohort"
        ? contest.targetCohorts[0]
        : contest.accessType === "Batch"
          ? contest.targetBatches[0]
          : "Invite Only"

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-white/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={contest.status} />
          <span className={`text-xs font-medium ${difficultyBadgeClass(contest.difficulty)}`}>{contest.difficulty}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/50">{accessLabel}</span>
        </div>
        <span className="flex items-center gap-1 text-xs text-white/40">
          <Clock3 className="size-3.5" />
          {contest.countdown}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-semibold text-white">{contest.title}</h3>
      <p className="mt-1.5 min-h-10 text-sm leading-5 text-white/55">{contest.description}</p>

      <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl border border-white/8 bg-black/15 p-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35">Participants</p>
          <p className="mt-1 text-sm font-semibold text-white">{contest.participantsCount}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35">Submissions</p>
          <p className="mt-1 text-sm font-semibold text-white">{contest.submissionsCount}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35">Avg fidelity</p>
          <p className="mt-1 text-sm font-semibold" style={{ color: contest.avgFidelity > 0 ? fidelityColor(contest.avgFidelity) : undefined }}>
            {contest.avgFidelity > 0 ? `${contest.avgFidelity}%` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35">Flagged</p>
          <p className={`mt-1 text-sm font-semibold ${contest.flaggedCount > 0 ? "text-[#F5B942]" : "text-white/70"}`}>{contest.flaggedCount}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onModerate}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition"
          style={{ borderColor: `${accent}40`, backgroundColor: `${accent}14`, color: accent }}
        >
          <ShieldAlert className="size-3.5" /> Moderate Submissions
        </button>
        <button type="button" onClick={onEdit} className={ghostBtn}>
          <span className="flex items-center gap-1.5">
            <Edit3 className="size-3.5" /> Edit
          </span>
        </button>
        <button type="button" onClick={onDuplicate} className={ghostBtn}>
          <span className="flex items-center gap-1.5">
            <Copy className="size-3.5" /> Duplicate
          </span>
        </button>
        {contest.status === "Live" && (
          <button type="button" onClick={onToggleLive} className={dangerGhostBtn}>
            End Contest Early
          </button>
        )}
        {contest.status === "Draft" && (
          <button
            type="button"
            onClick={onToggleLive}
            className="flex items-center gap-1.5 rounded-lg border border-[#4ADE80]/30 bg-[#4ADE80]/10 px-3 py-1.5 text-xs font-medium text-[#4ADE80] transition hover:bg-[#4ADE80]/20"
          >
            <Sparkles className="size-3.5" /> Publish Now
          </button>
        )}
      </div>
    </div>
  )
}

/* --------------------------------- Moderation drawer --------------------------------- */

function ModerationDrawer({
  contest,
  subs,
  onClose,
  onUpdateSubmission,
}: {
  contest: InstructorContest
  subs: ContestSubmission[]
  onClose: () => void
  onUpdateSubmission: (id: string, patch: Partial<ContestSubmission>) => void
}) {
  const [tab, setTab] = useState<SubmissionTab>("All")
  const [inspecting, setInspecting] = useState<ContestSubmission | null>(null)
  const [disqualifying, setDisqualifying] = useState<ContestSubmission | null>(null)
  const [dqReason, setDqReason] = useState("")
  const [overriding, setOverriding] = useState<ContestSubmission | null>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])
  const [overrideScore, setOverrideScore] = useState("")

  const counts = useMemo(() => {
    const base: Record<SubmissionTab, number> = { All: subs.length, Approved: 0, Flagged: 0, Disqualified: 0, "Under Review": 0 }
    for (const s of subs) base[s.status] += 1
    return base
  }, [subs])

  const filtered = useMemo(() => {
    const ranked = [...subs].sort((a, b) => b.score - a.score)
    return tab === "All" ? ranked : ranked.filter((s) => s.status === tab)
  }, [subs, tab])

  return (
  <div className="fixed inset-x-0 bottom-0 top-14 z-50 flex justify-end overscroll-none">
  <div className="absolute inset-0 bg-black/70" onClick={onClose} />
  <div className="relative flex h-full w-full max-w-4xl flex-col border-l border-white/10 bg-[#0b1220] shadow-2xl">

        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-6">
          <div>
            <p className="text-xs uppercase tracking-[.16em] text-[#00D4FF]">Submission &amp; leaderboard moderation</p>
            <h3 className="mt-1 text-xl font-semibold text-white">{contest.title}</h3>
            <div className="mt-2 flex items-center gap-3 text-xs text-white/45">
              <StatusPill status={contest.status} />
              <span>{subs.length} total submissions</span>
              <span className="text-[#F5B942]">{subs.filter((s) => s.status === "Flagged").length} flagged</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-white/40 hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b border-white/10 p-4">
          <FilterPillGroup
            options={["All", "Approved", "Flagged", "Disqualified", "Under Review"] as SubmissionTab[]}
            value={tab}
            onChange={setTab}
            counts={counts}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-color:rgba(0,212,255,0.45)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin]">
          <div className="flex flex-col gap-2">
            {filtered.length === 0 && <p className="p-6 text-center text-sm text-white/40">No submissions in this filter.</p>}
            {filtered.map((sub, index) => (
              <div key={sub.id} className="rounded-xl border border-white/8 bg-white/[.02] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-semibold text-white/40">{index + 1}</span>
                    <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] text-xs font-bold text-[#07101a]">
                      {sub.studentInitials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {sub.studentName} {sub.status === "Disqualified" && <span className="text-white/30 line-through">disqualified</span>}
                      </p>
                      <p className="text-xs text-white/45">{sub.batch}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${submissionStatusBadgeClass(sub.status)}`}>
                    {sub.status === "Flagged" && <AlertTriangle className="size-3" />}
                    {sub.status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/35">Submitted</p>
                    <p className="mt-0.5 text-xs text-white/70">{formatTimestamp(sub.submittedAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/35">Fidelity</p>
                    <p className="mt-0.5 text-xs font-semibold" style={{ color: fidelityColor(sub.fidelity) }}>
                      {sub.fidelity}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/35">Gates</p>
                    <p className="mt-0.5 text-xs text-white/70">{sub.gateCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/35">Depth</p>
                    <p className="mt-0.5 text-xs text-white/70">{sub.circuitDepth}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/35">Score</p>
                    <p className="mt-0.5 text-xs font-semibold text-white">
                      {sub.score} / {contest.totalPoints}
                    </p>
                  </div>
                </div>

                {sub.flagReason && (
                  <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-[#F5B942]/25 bg-[#F5B942]/10 px-2.5 py-1.5 text-xs text-[#F5B942]">
                    <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {sub.flagReason}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setInspecting(sub)} className={ghostBtn}>
                    <span className="flex items-center gap-1.5">
                      <Eye className="size-3.5" /> Inspect Circuit
                    </span>
                  </button>
                  {sub.status !== "Approved" && (
                    <button
                      type="button"
                      onClick={() => onUpdateSubmission(sub.id, { status: "Approved", flagReason: undefined })}
                      className="flex items-center gap-1.5 rounded-lg border border-[#4ADE80]/30 bg-[#4ADE80]/10 px-3 py-1.5 text-xs font-medium text-[#4ADE80] transition hover:bg-[#4ADE80]/20"
                    >
                      <CheckCircle2 className="size-3.5" /> Approve
                    </button>
                  )}
                  {sub.status !== "Disqualified" && (
                    <button
                      type="button"
                      onClick={() => {
                        setDisqualifying(sub)
                        setDqReason(sub.flagReason ?? "")
                      }}
                      className={dangerGhostBtn}
                    >
                      <span className="flex items-center gap-1.5">
                        <XCircle className="size-3.5" /> Disqualify
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOverriding(sub)
                      setOverrideScore(String(sub.score))
                    }}
                    className={ghostBtn}
                  >
                    <span className="flex items-center gap-1.5">
                      <Sliders className="size-3.5" /> Override Score
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {inspecting && (
        <ModalShell
          onClose={() => setInspecting(null)}
          eyebrow="Circuit AST & submission log"
          title={`${inspecting.studentName} — ${contest.title}`}
          maxWidth="max-w-lg"
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-white/8 bg-black/30 p-4 font-mono text-sm text-[#4ADE80]">{inspecting.circuitSummary}</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-white/8 bg-black/15 p-3">
                <p className="text-[10px] uppercase text-white/35">Fidelity</p>
                <p className="mt-1 text-lg font-semibold" style={{ color: fidelityColor(inspecting.fidelity) }}>
                  {inspecting.fidelity}%
                </p>
              </div>
              <div className="rounded-lg border border-white/8 bg-black/15 p-3">
                <p className="text-[10px] uppercase text-white/35">Gates</p>
                <p className="mt-1 text-lg font-semibold text-white">{inspecting.gateCount}</p>
              </div>
              <div className="rounded-lg border border-white/8 bg-black/15 p-3">
                <p className="text-[10px] uppercase text-white/35">Depth</p>
                <p className="mt-1 text-lg font-semibold text-white">{inspecting.circuitDepth}</p>
              </div>
            </div>
            {inspecting.instructorNotes && (
              <div className="rounded-lg border border-white/8 bg-black/15 p-3">
                <p className="text-[10px] uppercase text-white/35">Instructor notes</p>
                <p className="mt-1 text-sm text-white/70">{inspecting.instructorNotes}</p>
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {disqualifying && (
        <ModalShell
          onClose={() => setDisqualifying(null)}
          eyebrow="Disqualify entry"
          title={disqualifying.studentName}
          footer={
            <>
              <button type="button" onClick={() => setDisqualifying(null)} className={ghostBtn}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateSubmission(disqualifying.id, { status: "Disqualified", flagReason: dqReason, instructorNotes: dqReason })
                  setDisqualifying(null)
                }}
                className="rounded-lg bg-[#FB7185] px-3 py-1.5 text-xs font-semibold text-[#07101a] transition hover:bg-[#FB7185]/85"
              >
                Confirm disqualify
              </button>
            </>
          }
        >
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Reason / instructor feedback</FieldLabel>
            <textarea value={dqReason} onChange={(e) => setDqReason(e.target.value)} className={textareaClass} placeholder="Explain why this entry is disqualified" />
          </label>
        </ModalShell>
      )}

      {overriding && (
        <ModalShell
          onClose={() => setOverriding(null)}
          eyebrow="Override score"
          title={overriding.studentName}
          footer={
            <>
              <button type="button" onClick={() => setOverriding(null)} className={ghostBtn}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateSubmission(overriding.id, { score: Number(overrideScore) || 0 })
                  setOverriding(null)
                }}
                className="rounded-lg bg-[#00D4FF] px-3 py-1.5 text-xs font-semibold text-[#07101a] transition hover:bg-[#00D4FF]/85"
              >
                Save score
              </button>
            </>
          }
        >
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Score (out of {contest.totalPoints})</FieldLabel>
            <input type="number" min={0} max={contest.totalPoints} value={overrideScore} onChange={(e) => setOverrideScore(e.target.value)} className={inputClass} />
          </label>
        </ModalShell>
      )}
    </div>
  )
}

/* --------------------------------- Main page --------------------------------- */

export function ContestManagerPage() {
  const [contestList, setContestList] = useState<InstructorContest[]>(seedContests)
  const [subList, setSubList] = useState<ContestSubmission[]>(seedSubmissions)
  const [statusTab, setStatusTab] = useState<StatusTab>("All Contests")
  const [difficultyFilter, setDifficultyFilter] = useState<"All Difficulties" | ContestDifficulty>("All Difficulties")
  const [search, setSearch] = useState("")

  const [editing, setEditing] = useState<ContestDraft | null>(null)
  const [editorExisting, setEditorExisting] = useState<InstructorContest | undefined>(undefined)
  const [editorTab, setEditorTab] = useState<EditorTab>("Details")
  const [moderatingId, setModeratingId] = useState<string | null>(null)

  const summary = useMemo(() => {
    const live = contestList.filter((c) => c.status === "Live").length
    const totalParticipants = contestList.reduce((sum, c) => sum + c.participantsCount, 0)
    const totalSubmissions = contestList.reduce((sum, c) => sum + c.submissionsCount, 0)
    const withFidelity = contestList.filter((c) => c.avgFidelity > 0)
    const avgFidelity = withFidelity.length
      ? withFidelity.reduce((sum, c) => sum + c.avgFidelity, 0) / withFidelity.length
      : 0
    const flagged = contestList.reduce((sum, c) => sum + c.flaggedCount, 0)
    return { live, totalParticipants, totalSubmissions, avgFidelity, flagged }
  }, [contestList])

  const filteredContests = useMemo(() => {
    return contestList.filter((c) => {
      if (statusTab === "Live" && c.status !== "Live") return false
      if (statusTab === "Upcoming" && c.status !== "Upcoming") return false
      if (statusTab === "Ended" && c.status !== "Ended") return false
      if (statusTab === "Drafts" && c.status !== "Draft") return false
      if (difficultyFilter !== "All Difficulties" && c.difficulty !== difficultyFilter) return false
      if (search.trim() && !c.title.toLowerCase().includes(search.trim().toLowerCase())) return false
      return true
    })
  }, [contestList, statusTab, difficultyFilter, search])

  function openCreate() {
    setEditorExisting(undefined)
    setEditing(emptyContestDraft())
    setEditorTab("Details")
  }

  function openEdit(contest: InstructorContest) {
    setEditorExisting(contest)
    setEditing(contestToDraft(contest))
    setEditorTab("Details")
  }

  function saveDraft() {
    if (!editing) return
    const saved = draftToContest(editing, editorExisting)
    setContestList((list) => {
      const exists = list.some((c) => c.id === saved.id)
      return exists ? list.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...list]
    })
    setEditing(null)
  }

  function duplicateContest(contest: InstructorContest) {
    const copy: InstructorContest = {
      ...contest,
      id: uid("contest"),
      title: `${contest.title} (Copy)`,
      status: "Draft",
      participantsCount: 0,
      submissionsCount: 0,
      avgFidelity: 0,
      flaggedCount: 0,
      createdAt: new Date().toISOString(),
    }
    setContestList((list) => [copy, ...list])
  }

  function toggleLive(contest: InstructorContest) {
    setContestList((list) =>
      list.map((c) => {
        if (c.id !== contest.id) return c
        if (c.status === "Draft") return { ...c, status: "Upcoming", countdown: "Scheduled" }
        if (c.status === "Live") return { ...c, status: "Ended", countdown: "Ended early by instructor" }
        return c
      }),
    )
  }

  function updateSubmission(id: string, patch: Partial<ContestSubmission>) {
    setSubList((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const moderatingContest = moderatingId ? contestList.find((c) => c.id === moderatingId) : undefined
  const moderatingSubs = moderatingId ? subList.filter((s) => s.contestId === moderatingId) : []

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-10 py-14 md:px-12">
      {/* Header */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-[#F5B942]/40 bg-[#F5B942]/10 text-[#F5B942] shadow-[0_0_24px_rgba(245,185,66,0.08)]">
            <Atom className="size-8" />
          </div>
          <p className="text-sm uppercase tracking-[.28em] text-[#F5B942]">Instructor view</p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Contest arena</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-white/55">
              Run live quantum circuit competitions, track student progress, and keep every submission moving forward.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                /* export placeholder */
              }}
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-white/60 transition hover:border-white/25 hover:text-white"
            >
              Export Results
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg border border-[#00D4FF]/40 bg-[#00D4FF]/10 px-4 py-2.5 text-sm font-semibold text-[#00D4FF] transition hover:bg-[#00D4FF]/20"
            >
              <Plus className="size-4" /> Schedule Contest
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Live contests" value={String(summary.live)} detail="active right now" icon={Trophy} accent="#00D4FF" />
        <StatCard label="Total participants" value={String(summary.totalParticipants)} detail="registered across all contests" icon={Users} accent="#4ADE80" />
        <StatCard label="Submissions evaluated" value={String(summary.totalSubmissions)} detail="submitted total" icon={Award} accent="#A78BFA" />
        <StatCard label="Avg. fidelity score" value={`${summary.avgFidelity.toFixed(1)}%`} detail="across live & ended contests" icon={Gauge} accent="#F5B942" />
        <StatCard label="Flagged for review" value={String(summary.flagged)} detail="entries requiring attention" icon={AlertTriangle} accent="#FB7185" />
      </div>

      {/* Main section */}
      <div>
        <SectionHeading eyebrow="Circuit contests" title="All contests" />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <FilterPillGroup options={STATUS_TABS} value={statusTab} onChange={setStatusTab} />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contests..."
                className="w-48 rounded-lg border border-white/10 bg-black/20 py-2 pl-8 pr-3 text-xs text-white placeholder:text-white/35 outline-none focus:border-[#00D4FF]/40"
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/35" />
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as "All Difficulties" | ContestDifficulty)}
                className="rounded-lg border border-white/10 bg-black/20 py-2 pl-8 pr-3 text-xs text-white outline-none focus:border-[#00D4FF]/40"
              >
                {["All Difficulties", ...DIFFICULTIES].map((opt) => (
                  <option key={opt} value={opt} className="bg-[#0f1420]">
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {filteredContests.map((contest) => (
            <ContestManagerCard
              key={contest.id}
              contest={contest}
              onModerate={() => setModeratingId(contest.id)}
              onEdit={() => openEdit(contest)}
              onDuplicate={() => duplicateContest(contest)}
              onToggleLive={() => toggleLive(contest)}
            />
          ))}
          {filteredContests.length === 0 && (
            <div className="col-span-full rounded-2xl border border-white/10 bg-white/[.02] p-10 text-center text-sm text-white/40">
              No contests match these filters.
            </div>
          )}
        </div>
      </div>

      {/* Editor modal */}
      {editing && (
        <ModalShell
          onClose={() => setEditing(null)}
          eyebrow={editorExisting ? "Edit contest" : "Schedule contest"}
          title={editing.title || "Untitled contest"}
          maxWidth="max-w-2xl"
          footer={
            <>
              <button type="button" onClick={() => setEditing(null)} className={ghostBtn}>
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDraft}
                className="rounded-lg bg-[#00D4FF] px-4 py-1.5 text-xs font-semibold text-[#07101a] transition hover:bg-[#00D4FF]/85"
              >
                Save contest
              </button>
            </>
          }
        >
          <div className="mb-5 flex gap-2 border-b border-white/10 pb-3">
            {EDITOR_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setEditorTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  editorTab === t ? "bg-[#00D4FF]/10 text-[#00D4FF]" : "text-white/50 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <ContestEditorForm draft={editing} setDraft={(updater) => setEditing((d) => (d ? updater(d) : d))} tab={editorTab} />
        </ModalShell>
      )}

      {/* Moderation drawer */}
      {moderatingContest && (
        <ModerationDrawer
          contest={moderatingContest}
          subs={moderatingSubs}
          onClose={() => setModeratingId(null)}
          onUpdateSubmission={updateSubmission}
        />
      )}
    </div>
  )
}
