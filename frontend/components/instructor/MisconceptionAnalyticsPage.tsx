"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Atom,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Gauge,
  HelpCircle,
  Link2,
  MessageSquareCode,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Users,
  Wand2,
  X,
  XCircle,
  Zap,
} from "lucide-react"
import { units } from "@/lib/curriculum/units"
import {
  conceptHealthScores,
  misconceptionTags,
  predictionEvidence,
  riskColorClass,
  severityBadgeClass,
  sourceIconLabel,
  statusBadgeClass,
  studentMisconceptionInstances,
  trendColor,
  trendIcon,
  unclassifiedEntries,
  type ConceptHealthScore,
  type MisconceptionSeverity,
  type MisconceptionStatus,
  type MisconceptionTag,
  type StudentMisconceptionInstance,
} from "@/lib/instructor-misconceptions"

/* --------------------------------- Constants --------------------------------- */

type StatusFilter = "All" | MisconceptionStatus
type DetailTab = "Overview" | "Affected students" | "Prediction evidence"

const STATUS_FILTERS: StatusFilter[] = ["All", "Classified", "Unclassified", "Under Review"]
const SEVERITY_OPTIONS: MisconceptionSeverity[] = ["Critical", "Moderate", "Low"]
const DETAIL_TABS: DetailTab[] = ["Overview", "Affected students", "Prediction evidence"]

function unitLabel(unitId: string) {
  const unit = units.find((u) => u.id === unitId)
  return unit ? `${unitId} · ${unit.title}` : unitId
}

/* --------------------------------- Shared building blocks --------------------------------- */

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
  badge,
}: {
  eyebrow?: string
  title: string
  actionLabel?: string
  onAction?: () => void
  badge?: string
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-end gap-3">
        <div>
          {eyebrow && <p className="text-[11px] uppercase tracking-[.22em] text-[#00D4FF]">{eyebrow}</p>}
          <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
        </div>
        {badge && (
          <span className="mb-0.5 inline-flex items-center rounded-full bg-[#F5B942]/15 px-2.5 py-1 text-[11px] font-semibold text-[#F5B942]">{badge}</span>
        )}
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

const inputClass =
  "w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00D4FF]/40"
const selectClass = "rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#00D4FF]/40"
const textareaClass = `${inputClass} min-h-20 resize-none`
const ghostBtn =
  "rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-[#00D4FF]/40 hover:text-[#00D4FF]"
const dangerGhostBtn =
  "rounded-lg border border-[#FB7185]/30 px-3 py-1.5 text-xs font-medium text-[#FB7185] transition hover:bg-[#FB7185]/10"

function StatusBadge({ status }: { status: MisconceptionStatus }) {
  const style = statusBadgeClass(status)
  const pulsing = status === "Unclassified"
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${style.text} ${style.bg}`}>
      <span className={`size-1.5 rounded-full ${pulsing ? "animate-pulse" : ""}`} style={{ backgroundColor: pulsing ? "#F5B942" : "currentColor" }} />
      {status}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: MisconceptionSeverity }) {
  const style = severityBadgeClass(severity)
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.text} ${style.bg}`}>
      {severity}
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

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("")
}

/* --------------------------------- Concept health card --------------------------------- */

function ConceptHealthCard({
  score,
  active,
  onClick,
}: {
  score: ConceptHealthScore
  active: boolean
  onClick: () => void
}) {
  const risk = riskColorClass(score.riskLevel)
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition ${
        active ? "border-[#00D4FF]/50 bg-[#00D4FF]/[.06]" : "border-white/10 bg-white/[.025] hover:border-white/20"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{score.concept}</p>
          <p className="mt-0.5 text-[11px] text-white/40">{score.unitId}</p>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: trendColor(score.trend) }}>
          {trendIcon(score.trend)} {score.trend}
        </span>
      </div>
      <div>
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>Avg mastery</span>
          <span className="font-medium text-white">{score.avgMastery}%</span>
        </div>
        <div className="mt-1.5">
          <ProgressBar value={score.avgMastery} color={risk} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: risk, backgroundColor: `${risk}18` }}>
          {score.misconceptionCount} misconception{score.misconceptionCount === 1 ? "" : "s"}
        </span>
      </div>
      <p className="truncate text-[11px] text-white/40">Top: {score.topMisconception}</p>
    </button>
  )
}

/* --------------------------------- New misconception draft --------------------------------- */

type NewTagDraft = {
  slug: string
  title: string
  description: string
  correction: string
  severity: MisconceptionSeverity
  concept: string
  unitId: string
}

function emptyDraft(concept: string, unitId: string): NewTagDraft {
  return { slug: "", title: "", description: "", correction: "", severity: "Moderate", concept, unitId }
}

/* --------------------------------- Detail drawer --------------------------------- */

function MisconceptionDetailModal({
  tag,
  onClose,
}: {
  tag: MisconceptionTag
  onClose: () => void
}) {
  const [tab, setTab] = useState<DetailTab>("Overview")
  const [sourceFilter, setSourceFilter] = useState<"All" | StudentMisconceptionInstance["source"]>("All")
  const [resolvedFilter, setResolvedFilter] = useState<"All" | "Resolved" | "Unresolved">("All")
  const [resolvedOverrides, setResolvedOverrides] = useState<Record<string, boolean>>({})

  const instances = useMemo(
    () => studentMisconceptionInstances.filter((i) => i.misconceptionSlug === tag.slug),
    [tag.slug],
  )
  const filteredInstances = useMemo(
    () =>
      instances.filter((i) => {
        if (sourceFilter !== "All" && i.source !== sourceFilter) return false
        const resolved = resolvedOverrides[`${i.studentId}-${i.timestamp}`] ?? i.resolved
        if (resolvedFilter === "Resolved" && !resolved) return false
        if (resolvedFilter === "Unresolved" && resolved) return false
        return true
      }),
    [instances, sourceFilter, resolvedFilter, resolvedOverrides],
  )

  const evidence = useMemo(
    () => predictionEvidence.filter((e) => e.misconceptionTriggered === tag.slug),
    [tag.slug],
  )

  function toggleResolved(key: string, current: boolean) {
    setResolvedOverrides((prev) => ({ ...prev, [key]: !current }))
  }

  return (
    <ModalShell onClose={onClose} eyebrow="Misconception detail" title={tag.title} maxWidth="max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={tag.severity} />
        <span className="rounded-full bg-[#00D4FF]/12 px-2.5 py-1 text-[11px] font-medium text-[#00D4FF]">{tag.concept}</span>
        <StatusBadge status={tag.status} />
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/60">{tag.studentCount} students</span>
      </div>

      <div className="mt-5 flex gap-2 border-b border-white/8 pb-4">
        {DETAIL_TABS.map((t) => (
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
        {tab === "Overview" && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs uppercase tracking-[.16em] text-white/40">Description</p>
              <p className="mt-2 text-sm leading-6 text-white/70">{tag.description}</p>
            </div>
            <div className="rounded-xl border border-[#4ADE80]/20 bg-[#4ADE80]/[.06] p-4">
              <p className="text-xs uppercase tracking-[.16em] text-[#4ADE80]">Correction</p>
              <p className="mt-2 text-sm leading-6 text-white/80">{tag.correction}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[.16em] text-white/40">Related algorithms</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tag.relatedAlgorithms.map((alg) => (
                  <Link
                    key={alg}
                    href={`/lab/${alg.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/60 transition hover:border-[#00D4FF]/40 hover:text-[#00D4FF]"
                  >
                    {alg}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[.16em] text-white/40">Linked quiz questions</p>
              {tag.linkedQuizQuestionIds.length ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  {tag.linkedQuizQuestionIds.map((qid) => (
                    <div key={qid} className="flex items-center justify-between rounded-lg border border-white/8 bg-black/10 px-3 py-2 text-xs">
                      <span className="text-white/60">{qid}</span>
                      <span className="text-white/40">Avg correct 58%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-white/40">No quiz questions linked yet.</p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/8 bg-black/10 px-3 py-2 text-xs text-white/50">
              <span>First seen {tag.firstSeen}</span>
              <span>Last seen {tag.lastSeen}</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[.16em] text-white/40">Severity</p>
              <div className="mt-2 flex gap-2">
                {SEVERITY_OPTIONS.map((s) => (
                  <span
                    key={s}
                    className={`rounded-lg border px-3 py-1.5 text-xs ${
                      s === tag.severity ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/40"
                    }`}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Affected students" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <FilterPillGroup
                options={["All", "prediction", "quiz", "debug", "manual"] as const}
                value={sourceFilter}
                onChange={(v) => setSourceFilter(v)}
              />
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[.14em] text-white/35">Status</span>
                <select value={resolvedFilter} onChange={(e) => setResolvedFilter(e.target.value as typeof resolvedFilter)} className={selectClass}>
                  <option value="All" className="bg-[#0f1420]">All</option>
                  <option value="Resolved" className="bg-[#0f1420]">Resolved</option>
                  <option value="Unresolved" className="bg-[#0f1420]">Unresolved</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {filteredInstances.length === 0 && <p className="text-xs text-white/40">No matching instances.</p>}
              {filteredInstances.map((instance) => {
                const key = `${instance.studentId}-${instance.timestamp}`
                const resolved = resolvedOverrides[key] ?? instance.resolved
                return (
                  <div key={key} className="flex flex-col gap-3 rounded-xl border border-white/8 bg-black/10 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/75">
                        {initials(instance.studentName)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-white">{instance.studentName}</p>
                          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/45">Batch {instance.batch}</span>
                          <span className="rounded-full bg-[#00D4FF]/12 px-1.5 py-0.5 text-[10px] text-[#00D4FF]">{sourceIconLabel(instance.source)}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-white/45">{instance.evidenceDetail}</p>
                        <p className="mt-0.5 text-[11px] text-white/30">{instance.timestamp}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleResolved(key, resolved)}
                      className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs transition ${
                        resolved ? "border-[#4ADE80]/40 bg-[#4ADE80]/10 text-[#4ADE80]" : "border-white/10 text-white/50 hover:text-white"
                      }`}
                    >
                      {resolved ? "Resolved" : "Mark resolved"}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === "Prediction evidence" && (
          <div className="flex flex-col gap-3">
            {evidence.length === 0 && <p className="text-xs text-white/40">No prediction evidence linked to this misconception yet.</p>}
            {evidence.map((entry) => (
              <div key={`${entry.studentName}-${entry.timestamp}`} className="rounded-xl border border-white/8 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">
                    {entry.studentName} <span className="text-white/40">· {entry.algorithmSlug}</span>
                  </p>
                  <span className="text-xs text-white/40">Δ {entry.deltaScore.toFixed(2)}</span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[.14em] text-white/35">Predicted</p>
                    <div className="mt-1.5 flex flex-col gap-1">
                      {Object.entries(entry.predictedDistribution).map(([state, pct]) => (
                        <div key={state} className="flex items-center gap-2 text-[11px]">
                          <span className="w-14 shrink-0 text-white/40">{"|"}{state}{"⟩"}</span>
                          <ProgressBar value={pct} color="#A78BFA" />
                          <span className="w-8 shrink-0 text-right text-white/50">{pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[.14em] text-white/35">Actual</p>
                    <div className="mt-1.5 flex flex-col gap-1">
                      {Object.entries(entry.actualDistribution).map(([state, pct]) => (
                        <div key={state} className="flex items-center gap-2 text-[11px]">
                          <span className="w-14 shrink-0 text-white/40">{"|"}{state}{"⟩"}</span>
                          <ProgressBar value={pct} color="#00D4FF" />
                          <span className="w-8 shrink-0 text-right text-white/50">{pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  )
}

/* --------------------------------- Create tag modal --------------------------------- */

function CreateTagModal({
  draft,
  setDraft,
  onCancel,
  onSave,
}: {
  draft: NewTagDraft
  setDraft: (updater: (d: NewTagDraft) => NewTagDraft) => void
  onCancel: () => void
  onSave: () => void
}) {
  const conceptOptions = Array.from(new Set(conceptHealthScores.map((c) => c.concept)))
  return (
    <ModalShell
      onClose={onCancel}
      eyebrow="New misconception"
      title="Create misconception tag"
      maxWidth="max-w-xl"
      footer={
        <>
          <button type="button" onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!draft.title.trim() || !draft.slug.trim()}
            className="rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#07101a] transition hover:bg-[#00D4FF]/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save tag
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50">Title</span>
          <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className={inputClass} placeholder="e.g. Ansatz depth confused with precision" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50">Slug</span>
          <input value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))} className={inputClass} placeholder="ansatz-depth-vs-precision" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50">Description</span>
          <textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} className={textareaClass} placeholder="What do students believe, and why is it wrong?" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50">Correction</span>
          <textarea value={draft.correction} onChange={(e) => setDraft((d) => ({ ...d, correction: e.target.value }))} className={textareaClass} placeholder="What is the accurate mental model?" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-white/50">Severity</span>
            <select value={draft.severity} onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value as MisconceptionSeverity }))} className={selectClass}>
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-[#0f1420]">
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-white/50">Concept</span>
            <select value={draft.concept} onChange={(e) => setDraft((d) => ({ ...d, concept: e.target.value }))} className={selectClass}>
              {conceptOptions.map((c) => (
                <option key={c} value={c} className="bg-[#0f1420]">
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50">Unit</span>
          <select value={draft.unitId} onChange={(e) => setDraft((d) => ({ ...d, unitId: e.target.value }))} className={selectClass}>
            {units.map((u) => (
              <option key={u.id} value={u.id} className="bg-[#0f1420]">
                {u.id} · {u.title}
              </option>
            ))}
          </select>
        </label>
      </div>
    </ModalShell>
  )
}

/* --------------------------------- Main page --------------------------------- */

export function MisconceptionAnalyticsPage() {
  const [tags, setTags] = useState<MisconceptionTag[]>(misconceptionTags)
  const [unclassified, setUnclassified] = useState(unclassifiedEntries)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All")
  const [conceptFilter, setConceptFilter] = useState<string>("All")
  const [severityFilter, setSeverityFilter] = useState<"All" | MisconceptionSeverity>("All")
  const [search, setSearch] = useState("")
  const [activeConceptCard, setActiveConceptCard] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailTag, setDetailTag] = useState<MisconceptionTag | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createDraft, setCreateDraft] = useState<NewTagDraft>(emptyDraft("Superposition", "u1"))
  const [linkTarget, setLinkTarget] = useState<string | null>(null)
  const [linkChoice, setLinkChoice] = useState<string>(tags[0]?.slug ?? "")
  const [dismissTarget, setDismissTarget] = useState<string | null>(null)
  const [pendingUnclassifiedEntry, setPendingUnclassifiedEntry] = useState<string | null>(null)

  const conceptOptions = useMemo(() => Array.from(new Set(tags.map((t) => t.concept))).sort(), [tags])

  const filteredTags = useMemo(() => {
    return tags.filter((tag) => {
      if (statusFilter !== "All" && tag.status !== statusFilter) return false
      if (conceptFilter !== "All" && tag.concept !== conceptFilter) return false
      if (severityFilter !== "All" && tag.severity !== severityFilter) return false
      if (activeConceptCard && tag.concept !== activeConceptCard) return false
      if (search.trim() && !tag.title.toLowerCase().includes(search.toLowerCase()) && !tag.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [tags, statusFilter, conceptFilter, severityFilter, activeConceptCard, search])

  const totalStudentsAffected = useMemo(
    () => new Set(studentMisconceptionInstances.map((i) => i.studentId)).size + unclassified.reduce((n, e) => n + e.students.length, 0),
    [unclassified],
  )
  const criticalCount = tags.filter((t) => t.severity === "Critical").length
  const resolvedCount = studentMisconceptionInstances.filter((i) => i.resolved).length
  const resolutionRate = Math.round((resolvedCount / studentMisconceptionInstances.length) * 100)

  function createTagFromDraft() {
    const newTag: MisconceptionTag = {
      id: `mc-${tags.length + 1}`,
      slug: createDraft.slug || createDraft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: createDraft.title,
      description: createDraft.description,
      concept: createDraft.concept,
      unitId: createDraft.unitId,
      status: "Classified",
      severity: createDraft.severity,
      studentCount: pendingUnclassifiedEntry ? unclassified.find((e) => e.id === pendingUnclassifiedEntry)?.students.length ?? 1 : 1,
      occurrences: 1,
      firstSeen: "Just now",
      lastSeen: "Just now",
      correction: createDraft.correction,
      relatedAlgorithms: [],
      linkedQuizQuestionIds: [],
    }
    setTags((prev) => [newTag, ...prev])
    if (pendingUnclassifiedEntry) {
      setUnclassified((prev) => prev.filter((e) => e.id !== pendingUnclassifiedEntry))
    }
    setShowCreate(false)
    setPendingUnclassifiedEntry(null)
    setCreateDraft(emptyDraft("Superposition", "u1"))
  }

  function linkEntryToExisting(entryId: string, slug: string) {
    setUnclassified((prev) => prev.filter((e) => e.id !== entryId))
    setTags((prev) =>
      prev.map((t) => (t.slug === slug ? { ...t, studentCount: t.studentCount + 1, occurrences: t.occurrences + 1, lastSeen: "Just now" } : t)),
    )
    setLinkTarget(null)
  }

  function dismissEntry(entryId: string) {
    setUnclassified((prev) => prev.filter((e) => e.id !== entryId))
    setDismissTarget(null)
  }

  return (
    <main className="relative z-0 mx-auto max-w-7xl px-5 py-9 md:px-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg border border-[#F5B942]/30 bg-[#F5B942]/10 text-[#F5B942]">
              <Atom className="size-4" />
            </span>
            <p className="text-xs uppercase tracking-[.24em] text-[#F5B942]">Instructor view</p>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Misconception analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
            Explore the full misconception taxonomy, drill into student evidence, and review unclassified entries the system couldn&apos;t auto-tag.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-xs text-white/55">
          <Zap className="size-3.5 text-[#F5B942]" /> Data synced from learner activity · just now
        </div>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Tracked misconceptions" value={String(tags.filter((t) => t.status === "Classified").length)} detail="Classified tags" icon={BrainCircuit} accent="#00D4FF" />
        <StatCard label="Students affected" value={String(totalStudentsAffected)} detail="Instances across cohort" icon={Users} accent="#FB7185" />
        <StatCard label="Critical severity" value={String(criticalCount)} detail="Misconceptions flagged critical" icon={AlertTriangle} accent="#F43F5E" />
        <StatCard label="Unclassified entries" value={String(unclassified.length)} detail="Awaiting your review" icon={HelpCircle} accent="#F5B942" />
        <StatCard label="Resolution rate" value={`${resolutionRate}%`} detail="Of instances resolved" icon={CheckCircle2} accent="#4ADE80" />
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
        <SectionHeading eyebrow="Concept pulse" title="Concept health scores" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {conceptHealthScores.map((score) => (
            <ConceptHealthCard
              key={score.concept}
              score={score}
              active={activeConceptCard === score.concept}
              onClick={() => setActiveConceptCard((prev) => (prev === score.concept ? null : score.concept))}
            />
          ))}
        </div>
        {activeConceptCard && (
          <p className="mt-3 text-xs text-white/40">
            Filtering taxonomy below to <span className="text-[#00D4FF]">{activeConceptCard}</span>.{" "}
            <button type="button" onClick={() => setActiveConceptCard(null)} className="text-[#00D4FF] hover:text-white">
              Clear
            </button>
          </p>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
        <SectionHeading eyebrow="Taxonomy" title="All misconceptions" actionLabel="Add misconception" onAction={() => setShowCreate(true)} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <FilterPillGroup options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
          <div className="flex flex-wrap items-center gap-2">
            <select value={conceptFilter} onChange={(e) => setConceptFilter(e.target.value)} className={selectClass}>
              <option value="All" className="bg-[#0f1420]">All concepts</option>
              {conceptOptions.map((c) => (
                <option key={c} value={c} className="bg-[#0f1420]">
                  {c}
                </option>
              ))}
            </select>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as typeof severityFilter)} className={selectClass}>
              <option value="All" className="bg-[#0f1420]">All severities</option>
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-[#0f1420]">
                  {s}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search misconceptions" className={`${inputClass} w-52 pl-8`} />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {filteredTags.length === 0 && <p className="text-sm text-white/40">No misconceptions match these filters.</p>}
          {filteredTags.map((tag) => {
            const expanded = expandedId === tag.id
            return (
              <div key={tag.id} className="rounded-xl border border-white/8 bg-black/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={tag.status} />
                      <SeverityBadge severity={tag.severity} />
                      <span className="rounded-full bg-[#00D4FF]/12 px-2 py-0.5 text-[10px] font-medium text-[#00D4FF]">{tag.concept}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/45">{unitLabel(tag.unitId)}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-white">{tag.title}</p>
                    <p className={`mt-1 text-xs leading-5 text-white/45 ${expanded ? "" : "line-clamp-2"}`}>{tag.correction}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    <span className="rounded-full bg-[#FB7185]/12 px-2.5 py-1 text-[11px] font-medium text-[#FB7185]">{tag.studentCount} students</span>
                    <span className="text-[11px] text-white/35">{tag.occurrences} occurrences</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-3">
                  <div className="flex items-center gap-3 text-[11px] text-white/35">
                    <span>First {tag.firstSeen}</span>
                    <span>Last {tag.lastSeen}</span>
                    <span>{tag.linkedQuizQuestionIds.length} linked questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setExpandedId(expanded ? null : tag.id)} className="text-xs text-[#00D4FF] hover:text-white">
                      {expanded ? "Collapse" : "Expand"}
                    </button>
                    <button type="button" onClick={() => setDetailTag(tag)} className={ghostBtn}>
                      View details
                    </button>
                    <button type="button" className={ghostBtn}>
                      <Pencil className="mr-1 inline size-3" /> Edit
                    </button>
                    <button type="button" className={dangerGhostBtn}>
                      Archive
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-[#F5B942]/25 bg-[#F5B942]/[.04] p-5 sm:p-6">
        <SectionHeading eyebrow="Needs your input" title="Unclassified entries" badge={`${unclassified.length} pending`} />
        {unclassified.length === 0 ? (
          <p className="text-sm text-white/40">All caught up — nothing awaiting classification.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {unclassified.map((entry) => (
              <div key={entry.id} className="animate-pulse-border rounded-xl border border-[#F5B942]/40 bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={entry.status} />
                      <span className="rounded-full bg-[#00D4FF]/12 px-2 py-0.5 text-[10px] font-medium text-[#00D4FF]">{entry.concept}</span>
                      <span className="text-[11px] text-white/35">{entry.timestamp}</span>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-white/70">{entry.evidenceDetail}</p>
                    <p className="mt-1 text-xs text-white/40">Triggered by {entry.students.join(", ")}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateDraft(emptyDraft(entry.concept, entry.unitId))
                      setPendingUnclassifiedEntry(entry.id)
                      setShowCreate(true)
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-[#00D4FF]/40 bg-[#00D4FF]/10 px-3 py-1.5 text-xs font-semibold text-[#00D4FF] transition hover:bg-[#00D4FF]/20"
                  >
                    <Wand2 className="size-3.5" /> Create new misconception tag
                  </button>
                  {linkTarget === entry.id ? (
                    <div className="flex items-center gap-2">
                      <select value={linkChoice} onChange={(e) => setLinkChoice(e.target.value)} className={selectClass}>
                        {tags.map((t) => (
                          <option key={t.slug} value={t.slug} className="bg-[#0f1420]">
                            {t.title}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => linkEntryToExisting(entry.id, linkChoice)} className="rounded-lg bg-[#00D4FF] px-3 py-1.5 text-xs font-semibold text-[#07101a]">
                        Confirm
                      </button>
                      <button type="button" onClick={() => setLinkTarget(null)} className={ghostBtn}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setLinkTarget(entry.id)} className={ghostBtn}>
                      <Link2 className="mr-1 inline size-3" /> Link to existing tag
                    </button>
                  )}
                  {dismissTarget === entry.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50">Dismiss as noise?</span>
                      <button type="button" onClick={() => dismissEntry(entry.id)} className={dangerGhostBtn}>
                        Confirm dismiss
                      </button>
                      <button type="button" onClick={() => setDismissTarget(null)} className={ghostBtn}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setDismissTarget(entry.id)} className={dangerGhostBtn}>
                      <XCircle className="mr-1 inline size-3" /> Dismiss
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#A78BFA]/12 text-[#A78BFA]">
            <MessageSquareCode className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white">How the predict→observe pipeline tags misconceptions</h3>
            <p className="mt-1.5 max-w-3xl text-xs leading-5 text-white/45">
              When a student&apos;s predicted distribution diverges from the simulated actual distribution, the system checks the delta against known misconception
              signatures. A confident match tags the misconception automatically; when nothing fits well, the entry is left <span className="text-[#F5B942]">null</span>{" "}
              rather than force-fit, and surfaces in the unclassified review panel above.
            </p>
          </div>
        </div>
      </section>

      {detailTag && <MisconceptionDetailModal tag={detailTag} onClose={() => setDetailTag(null)} />}
      {showCreate && (
        <CreateTagModal
          draft={createDraft}
          setDraft={setCreateDraft}
          onCancel={() => {
            setShowCreate(false)
            setPendingUnclassifiedEntry(null)
          }}
          onSave={createTagFromDraft}
        />
      )}
    </main>
  )
}
