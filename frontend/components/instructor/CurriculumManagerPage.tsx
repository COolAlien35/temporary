"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Atom,
  Beaker,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
  Zap,
} from "lucide-react"
import { units as seedUnits } from "@/lib/curriculum/units"
import type { ContentBlock, Checkpoint, Lesson, LessonType, Unit, UnitLevel } from "@/lib/curriculum/types"
import { ALGORITHMS } from "@/lib/lab-data"

/* ---------------------------------- Types --------------------------------- */

type LabAlgorithm = {
  slug: string
  name: string
  qubits: number
  basisStates: string[]
  learn: { calloutTitle: string; equation: string; body: string[] }
  correctDistribution: Record<string, number>
  correctGates: { id: string; step: number; qubit: number; gate: string; target?: number }[]
  seededFault: { gateId: string; description: string }
  challenge: {
    difficulty: "EASY" | "MEDIUM" | "HARD"
    gateBudget: number
    iterationCap: number
    targetDistribution: Record<string, number>
    tolerance: number
    goal: string
    hints: string[]
  }
}

type UnitDraft = {
  id: string
  title: string
  tagline: string
  level: UnitLevel
  prerequisites: string[]
  badge: string
  tools: string[]
}

type LessonDraft = {
  id: string
  title: string
  type: LessonType
  minutes: number
  xp: number
  takeaways: string[]
  links: { label: string; href: string }[]
  sections: ContentBlock[]
  checkpoints: Checkpoint[]
}

type LessonTab = "Metadata" | "Content blocks" | "Checkpoints"

/* --------------------------------- Constants -------------------------------- */

const LEVELS: UnitLevel[] = ["Beginner", "Intermediate", "Advanced"]
const LESSON_TYPES: LessonType[] = ["Concept", "Interactive", "Studio task", "Lab"]
const TOOL_OPTIONS = ["Lab", "Circuit Studio", "Hardware Studio"]
const BLOCK_TYPES: ContentBlock["type"][] = ["heading", "paragraph", "math", "callout", "code"]
const TONES: NonNullable<ContentBlock["tone"]>[] = ["key", "mistake", "try"]
const GATE_TYPES = ["H", "X", "Y", "Z", "S", "T", "CNOT", "CZ", "SWAP", "CP"]
const LESSON_TABS: LessonTab[] = ["Metadata", "Content blocks", "Checkpoints"]

const levelColors: Record<UnitLevel, string> = { Beginner: "#4ADE80", Intermediate: "#F5B942", Advanced: "#FB7185" }
const lessonTypeColors: Record<LessonType, string> = {
  Concept: "#00D4FF",
  Interactive: "#4ADE80",
  "Studio task": "#F5B942",
  Lab: "#A78BFA",
}
const blockColors: Record<ContentBlock["type"], string> = {
  heading: "#00D4FF",
  paragraph: "#E5E7EB",
  math: "#A78BFA",
  callout: "#F5B942",
  code: "#4ADE80",
}
const difficultyColors: Record<LabAlgorithm["challenge"]["difficulty"], string> = {
  EASY: "#4ADE80",
  MEDIUM: "#F5B942",
  HARD: "#FB7185",
}

// Mock "students completed" counts keyed by unit id — stable regardless of reordering.
const unitCompletionMock: Record<string, number> = {
  u1: 112,
  u2: 98,
  u3: 74,
  u4: 61,
  u5: 45,
  u6: 33,
  u7: 21,
  u8: 58,
  u9: 15,
}

let uidCounter = 0
function uid(prefix: string) {
  uidCounter += 1
  return `${prefix}-${uidCounter}`
}

function basisStatesFor(qubits: number) {
  const count = 2 ** Math.max(1, Math.min(qubits, 4))
  return Array.from({ length: count }, (_, i) => i.toString(2).padStart(Math.max(1, Math.min(qubits, 4)), "0"))
}

function algorithmToDraft(algo: LabAlgorithm): LabAlgorithm {
  return {
    ...algo,
    basisStates: [...algo.basisStates],
    learn: { ...algo.learn, body: [...algo.learn.body] },
    correctDistribution: { ...algo.correctDistribution },
    correctGates: algo.correctGates.map((g) => ({ ...g })),
    seededFault: { ...algo.seededFault },
    challenge: { ...algo.challenge, targetDistribution: { ...algo.challenge.targetDistribution }, hints: [...algo.challenge.hints] },
  }
}

function unitToDraft(unit: Unit): UnitDraft {
  return {
    id: unit.id,
    title: unit.title,
    tagline: unit.tagline,
    level: unit.level,
    prerequisites: [...unit.prerequisites],
    badge: unit.badge,
    tools: [...unit.tools],
  }
}

function lessonToDraft(lesson: Lesson): LessonDraft {
  return {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type,
    minutes: lesson.minutes,
    xp: lesson.xp,
    takeaways: [...lesson.takeaways],
    links: lesson.links.map((l) => ({ ...l })),
    sections: lesson.sections.map((s) => ({ ...s })),
    checkpoints: lesson.checkpoints.map((c) => ({ ...c, options: [...c.options] })),
  }
}

function emptyUnitDraft(): UnitDraft {
  return { id: uid("u"), title: "", tagline: "", level: "Beginner", prerequisites: [], badge: "", tools: [] }
}

function emptyLessonDraft(): LessonDraft {
  return { id: uid("lesson"), title: "", type: "Concept", minutes: 10, xp: 10, takeaways: [], links: [], sections: [], checkpoints: [] }
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
  icon: typeof BookOpen
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
    <div className="mb-5 flex items-end justify-between gap-4">
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

function AmberNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#F5B942]/20 bg-[#F5B942]/[.05] p-4 text-sm leading-6 text-white/60">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#F5B942]" />
        <p>{children}</p>
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-white/50">{children}</span>
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00D4FF]/40"
const selectClass = "rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#00D4FF]/40"
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
  footer: React.ReactNode
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
        <div className="flex justify-end gap-2 border-t border-white/10 p-4">{footer}</div>
      </div>
    </div>
  )
}

/* ---------------------------------- Unit editor ---------------------------------- */

function UnitEditorModal({
  draft,
  setDraft,
  isNew,
  allUnits,
  onCancel,
  onSave,
}: {
  draft: UnitDraft
  setDraft: (updater: (d: UnitDraft) => UnitDraft) => void
  isNew: boolean
  allUnits: Unit[]
  onCancel: () => void
  onSave: () => void
}) {
  function toggleTool(tool: string) {
    setDraft((d) => ({ ...d, tools: d.tools.includes(tool) ? d.tools.filter((t) => t !== tool) : [...d.tools, tool] }))
  }
  function togglePrereq(id: string) {
    setDraft((d) => ({
      ...d,
      prerequisites: d.prerequisites.includes(id) ? d.prerequisites.filter((p) => p !== id) : [...d.prerequisites, id],
    }))
  }

  return (
    <ModalShell
      onClose={onCancel}
      eyebrow={isNew ? "New unit" : "Edit unit"}
      title={isNew ? "Add new unit" : "Edit unit"}
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
            Save unit
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!isNew && (
          <AmberNotice>
            Editing this unit will create a new version. {unitCompletionMock[draft.id] ?? 47} students have progress tied to the current
            version.
          </AmberNotice>
        )}

        <label className="flex flex-col gap-1.5">
          <FieldLabel>Unit title</FieldLabel>
          <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className={inputClass} placeholder="e.g. Quantum Foundations" />
        </label>

        <label className="flex flex-col gap-1.5">
          <FieldLabel>Tagline</FieldLabel>
          <input value={draft.tagline} onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))} className={inputClass} placeholder="Short one-line summary" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Level</FieldLabel>
            <select value={draft.level} onChange={(e) => setDraft((d) => ({ ...d, level: e.target.value as UnitLevel }))} className={selectClass}>
              {LEVELS.map((level) => (
                <option key={level} value={level} className="bg-[#0f1420]">
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Badge name</FieldLabel>
            <input value={draft.badge} onChange={(e) => setDraft((d) => ({ ...d, badge: e.target.value }))} className={inputClass} placeholder="e.g. Foundations Cadet" />
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Prerequisites</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {allUnits
              .filter((u) => u.id !== draft.id)
              .map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => togglePrereq(u.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    draft.prerequisites.includes(u.id) ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/50 hover:text-white"
                  }`}
                >
                  {u.title}
                </button>
              ))}
            {allUnits.length <= 1 && <p className="text-xs text-white/35">No other units yet.</p>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Tools</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {TOOL_OPTIONS.map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => toggleTool(tool)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  draft.tools.includes(tool) ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/50 hover:text-white"
                }`}
              >
                {tool}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ModalShell>
  )
}

/* --------------------------------- Lesson editor --------------------------------- */

function EditableList({
  items,
  onChange,
  placeholder,
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            value={item}
            onChange={(e) => onChange(items.map((v, i) => (i === index ? e.target.value : v)))}
            className={inputClass}
            placeholder={placeholder}
          />
          <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} className="shrink-0 rounded-md p-1.5 text-white/40 hover:text-[#FB7185]">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="flex items-center gap-1.5 self-start text-xs text-[#00D4FF] hover:text-white">
        <Plus className="size-3.5" /> Add item
      </button>
    </div>
  )
}

function LessonMetadataTab({ draft, setDraft }: { draft: LessonDraft; setDraft: (updater: (d: LessonDraft) => LessonDraft) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <FieldLabel>Lesson title</FieldLabel>
        <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className={inputClass} />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Type</FieldLabel>
          <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as LessonType }))} className={selectClass}>
            {LESSON_TYPES.map((type) => (
              <option key={type} value={type} className="bg-[#0f1420]">
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Minutes</FieldLabel>
          <input
            type="number"
            value={draft.minutes}
            onChange={(e) => setDraft((d) => ({ ...d, minutes: Number(e.target.value) || 0 }))}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>XP value</FieldLabel>
          <input type="number" value={draft.xp} onChange={(e) => setDraft((d) => ({ ...d, xp: Number(e.target.value) || 0 }))} className={inputClass} />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Takeaways</FieldLabel>
        <EditableList items={draft.takeaways} onChange={(v) => setDraft((d) => ({ ...d, takeaways: v }))} placeholder="Key takeaway" />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Related links</FieldLabel>
        <div className="flex flex-col gap-2">
          {draft.links.map((link, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={link.label}
                onChange={(e) => setDraft((d) => ({ ...d, links: d.links.map((l, i) => (i === index ? { ...l, label: e.target.value } : l)) }))}
                className={inputClass}
                placeholder="Label"
              />
              <input
                value={link.href}
                onChange={(e) => setDraft((d) => ({ ...d, links: d.links.map((l, i) => (i === index ? { ...l, href: e.target.value } : l)) }))}
                className={inputClass}
                placeholder="/href"
              />
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, links: d.links.filter((_, i) => i !== index) }))}
                className="shrink-0 rounded-md p-1.5 text-white/40 hover:text-[#FB7185]"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, links: [...d.links, { label: "", href: "" }] }))}
            className="flex items-center gap-1.5 self-start text-xs text-[#00D4FF] hover:text-white"
          >
            <Plus className="size-3.5" /> Add link
          </button>
        </div>
      </div>
    </div>
  )
}

function ContentBlocksTab({ draft, setDraft }: { draft: LessonDraft; setDraft: (updater: (d: LessonDraft) => LessonDraft) => void }) {
  const [newBlockType, setNewBlockType] = useState<ContentBlock["type"]>("paragraph")

  function moveBlock(index: number, dir: -1 | 1) {
    setDraft((d) => {
      const next = [...d.sections]
      const target = index + dir
      if (target < 0 || target >= next.length) return d
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...d, sections: next }
    })
  }
  function updateBlock(index: number, patch: Partial<ContentBlock>) {
    setDraft((d) => ({ ...d, sections: d.sections.map((b, i) => (i === index ? { ...b, ...patch } : b)) }))
  }
  function removeBlock(index: number) {
    setDraft((d) => ({ ...d, sections: d.sections.filter((_, i) => i !== index) }))
  }
  function addBlock() {
    const block: ContentBlock = newBlockType === "callout" ? { type: "callout", text: "", tone: "key" } : { type: newBlockType, text: "" }
    setDraft((d) => ({ ...d, sections: [...d.sections, block] }))
  }

  return (
    <div className="flex flex-col gap-3">
      {draft.sections.map((block, index) => (
        <div key={index} className="rounded-xl border border-white/8 bg-black/10 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: blockColors[block.type], backgroundColor: `${blockColors[block.type]}18` }}>
              {block.type}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0} className="rounded-md p-1 text-white/40 hover:text-white disabled:opacity-30">
                <ChevronUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveBlock(index, 1)}
                disabled={index === draft.sections.length - 1}
                className="rounded-md p-1 text-white/40 hover:text-white disabled:opacity-30"
              >
                <ChevronDown className="size-3.5" />
              </button>
              <button type="button" onClick={() => removeBlock(index)} className="rounded-md p-1 text-white/40 hover:text-[#FB7185]">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>

          {block.type === "callout" && (
            <div className="mt-2 flex flex-wrap gap-2">
              {TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => updateBlock(index, { tone })}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] capitalize transition ${
                    block.tone === tone ? "border-[#F5B942]/40 bg-[#F5B942]/10 text-[#F5B942]" : "border-white/10 text-white/45 hover:text-white"
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          )}

          <textarea
            value={block.text}
            onChange={(e) => updateBlock(index, { text: e.target.value })}
            rows={block.type === "paragraph" ? 3 : 2}
            className={`mt-2 resize-none ${inputClass} ${block.type === "math" || block.type === "code" ? "font-mono" : ""}`}
            placeholder={`${block.type} content…`}
          />
        </div>
      ))}

      {draft.sections.length === 0 && <p className="text-sm text-white/40">No content blocks yet. Add one below.</p>}

      <div className="flex items-center gap-2 border-t border-white/8 pt-3">
        <select value={newBlockType} onChange={(e) => setNewBlockType(e.target.value as ContentBlock["type"])} className={selectClass}>
          {BLOCK_TYPES.map((type) => (
            <option key={type} value={type} className="bg-[#0f1420]">
              {type}
            </option>
          ))}
        </select>
        <button type="button" onClick={addBlock} className="flex items-center gap-1.5 text-xs font-medium text-[#00D4FF] hover:text-white">
          <Plus className="size-3.5" /> Add block
        </button>
      </div>
    </div>
  )
}

function CheckpointsTab({ draft, setDraft }: { draft: LessonDraft; setDraft: (updater: (d: LessonDraft) => LessonDraft) => void }) {
  function updateCheckpoint(index: number, patch: Partial<Checkpoint>) {
    setDraft((d) => ({ ...d, checkpoints: d.checkpoints.map((c, i) => (i === index ? { ...c, ...patch } : c)) }))
  }
  function removeCheckpoint(index: number) {
    setDraft((d) => ({ ...d, checkpoints: d.checkpoints.filter((_, i) => i !== index) }))
  }
  function addCheckpoint() {
    setDraft((d) => ({
      ...d,
      checkpoints: [...d.checkpoints, { id: uid("cp"), prompt: "", options: ["", ""], answer: 0, explanation: "" }],
    }))
  }
  function updateOption(cpIndex: number, optIndex: number, value: string) {
    setDraft((d) => ({
      ...d,
      checkpoints: d.checkpoints.map((c, i) => (i === cpIndex ? { ...c, options: c.options.map((o, oi) => (oi === optIndex ? value : o)) } : c)),
    }))
  }
  function addOption(cpIndex: number) {
    setDraft((d) => ({ ...d, checkpoints: d.checkpoints.map((c, i) => (i === cpIndex ? { ...c, options: [...c.options, ""] } : c)) }))
  }
  function removeOption(cpIndex: number, optIndex: number) {
    setDraft((d) => ({
      ...d,
      checkpoints: d.checkpoints.map((c, i) =>
        i === cpIndex
          ? { ...c, options: c.options.filter((_, oi) => oi !== optIndex), answer: c.answer >= optIndex && c.answer > 0 ? c.answer - 1 : c.answer }
          : c,
      ),
    }))
  }

  return (
    <div className="flex flex-col gap-3">
      {draft.checkpoints.map((checkpoint, cpIndex) => (
        <div key={checkpoint.id} className="rounded-xl border border-white/8 bg-black/10 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <FieldLabel>Checkpoint {cpIndex + 1}</FieldLabel>
            <button type="button" onClick={() => removeCheckpoint(cpIndex)} className="rounded-md p-1 text-white/40 hover:text-[#FB7185]">
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <textarea
            value={checkpoint.prompt}
            onChange={(e) => updateCheckpoint(cpIndex, { prompt: e.target.value })}
            rows={2}
            className={`mt-2 resize-none ${inputClass}`}
            placeholder="Question prompt"
          />

          <div className="mt-3 flex flex-col gap-2">
            {checkpoint.options.map((option, optIndex) => (
              <div key={optIndex} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateCheckpoint(cpIndex, { answer: optIndex })}
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                    checkpoint.answer === optIndex ? "border-[#4ADE80] bg-[#4ADE80]/20" : "border-white/20"
                  }`}
                  title="Mark as correct answer"
                >
                  {checkpoint.answer === optIndex && <span className="size-2 rounded-full bg-[#4ADE80]" />}
                </button>
                <input value={option} onChange={(e) => updateOption(cpIndex, optIndex, e.target.value)} className={inputClass} placeholder={`Option ${optIndex + 1}`} />
                <button type="button" onClick={() => removeOption(cpIndex, optIndex)} className="shrink-0 rounded-md p-1.5 text-white/40 hover:text-[#FB7185]">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addOption(cpIndex)} className="flex items-center gap-1.5 self-start text-xs text-[#00D4FF] hover:text-white">
              <Plus className="size-3.5" /> Add option
            </button>
          </div>

          <textarea
            value={checkpoint.explanation}
            onChange={(e) => updateCheckpoint(cpIndex, { explanation: e.target.value })}
            rows={2}
            className={`mt-3 resize-none ${inputClass}`}
            placeholder="Explanation shown after answering"
          />
        </div>
      ))}

      {draft.checkpoints.length === 0 && <p className="text-sm text-white/40">No checkpoints yet.</p>}

      <button type="button" onClick={addCheckpoint} className="flex items-center gap-1.5 self-start text-xs font-medium text-[#00D4FF] hover:text-white">
        <Plus className="size-3.5" /> Add checkpoint
      </button>
    </div>
  )
}

function LessonEditorModal({
  draft,
  setDraft,
  isNew,
  unitTitle,
  onCancel,
  onSave,
}: {
  draft: LessonDraft
  setDraft: (updater: (d: LessonDraft) => LessonDraft) => void
  isNew: boolean
  unitTitle: string
  onCancel: () => void
  onSave: () => void
}) {
  const [activeTab, setActiveTab] = useState<LessonTab>("Metadata")

  return (
    <ModalShell
      onClose={onCancel}
      eyebrow={isNew ? `New lesson · ${unitTitle}` : `Edit lesson · ${unitTitle}`}
      title={isNew ? "Add lesson" : "Edit lesson content"}
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
            Save lesson
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2 border-b border-white/8 pb-4">
          {LESSON_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                activeTab === tab ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/50 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Metadata" && <LessonMetadataTab draft={draft} setDraft={setDraft} />}
        {activeTab === "Content blocks" && <ContentBlocksTab draft={draft} setDraft={setDraft} />}
        {activeTab === "Checkpoints" && <CheckpointsTab draft={draft} setDraft={setDraft} />}

        {!isNew && (
          <AmberNotice>
            This lesson has been completed by 23 students. Saving creates version 2 — existing completions are preserved on version 1.
          </AmberNotice>
        )}
      </div>
    </ModalShell>
  )
}

/* -------------------------------- Unit + lesson rows ------------------------------- */

function UnitRow({
  unit,
  index,
  total,
  expanded,
  onMove,
  onToggleLessons,
  onEdit,
  onDelete,
  onAddLesson,
  onEditLesson,
  onMoveLesson,
  onRemoveLesson,
}: {
  unit: Unit
  index: number
  total: number
  expanded: boolean
  onMove: (dir: -1 | 1) => void
  onToggleLessons: () => void
  onEdit: () => void
  onDelete: () => void
  onAddLesson: () => void
  onEditLesson: (lesson: Lesson) => void
  onMoveLesson: (lessonId: string, dir: -1 | 1) => void
  onRemoveLesson: (lessonId: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const completions = unitCompletionMock[unit.id] ?? Math.max(4, 60 - index * 6)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035]">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="rounded-md p-0.5 text-white/30 hover:text-white disabled:opacity-20">
              <ChevronUp className="size-3.5" />
            </button>
            <GripVertical className="size-3.5 text-white/25" />
            <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="rounded-md p-0.5 text-white/30 hover:text-white disabled:opacity-20">
              <ChevronDown className="size-3.5" />
            </button>
          </div>
          <span className="mt-0.5 text-sm font-semibold text-white/35">{index + 1}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: levelColors[unit.level], backgroundColor: `${levelColors[unit.level]}18` }}
              >
                {unit.level}
              </span>
              <h3 className="truncate text-lg font-semibold text-white">{unit.title}</h3>
            </div>
            <p className="mt-1 truncate text-sm text-white/55">{unit.tagline}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/40">
              <span>
                {unit.lessons.length} lesson{unit.lessons.length === 1 ? "" : "s"}
              </span>
              <span>{unit.xpTotal} XP</span>
              <span>{completions} students completed</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onEdit} className={ghostBtn}>
            <span className="flex items-center gap-1.5">
              <Pencil className="size-3.5" /> Edit
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleLessons}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              expanded ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/60 hover:border-[#00D4FF]/40 hover:text-[#00D4FF]"
            }`}
          >
            Manage lessons
          </button>
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)} className={dangerGhostBtn}>
              <span className="flex items-center gap-1.5">
                <Trash2 className="size-3.5" /> Delete
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={onDelete} className="rounded-lg bg-[#FB7185] px-3 py-1.5 text-xs font-semibold text-[#1a0a0d] transition hover:bg-[#FB7185]/85">
                Confirm
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/8 p-4 sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <p className="text-sm font-medium text-white">Lessons in {unit.title}</p>
            <button type="button" onClick={onAddLesson} className="flex items-center gap-1.5 rounded-lg border border-[#00D4FF]/40 bg-[#00D4FF]/10 px-3 py-1.5 text-xs font-semibold text-[#00D4FF] transition hover:bg-[#00D4FF]/20">
              <Plus className="size-3.5" /> Add lesson
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {unit.lessons.map((lesson, lessonIndex) => (
              <div key={lesson.id} className="flex flex-col gap-3 rounded-xl border border-white/8 bg-black/10 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onMoveLesson(lesson.id, -1)}
                      disabled={lessonIndex === 0}
                      className="rounded-md p-0.5 text-white/30 hover:text-white disabled:opacity-20"
                    >
                      <ChevronUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveLesson(lesson.id, 1)}
                      disabled={lessonIndex === unit.lessons.length - 1}
                      className="rounded-md p-0.5 text-white/30 hover:text-white disabled:opacity-20"
                    >
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
                  <span className="text-xs font-semibold text-white/35">{lessonIndex + 1}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">{lesson.title}</p>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ color: lessonTypeColors[lesson.type], backgroundColor: `${lessonTypeColors[lesson.type]}18` }}
                      >
                        {lesson.type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-white/40">
                      {lesson.minutes} min · {lesson.xp} XP
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => onEditLesson(lesson)} className={ghostBtn}>
                    Edit content
                  </button>
                  <button type="button" onClick={() => onRemoveLesson(lesson.id)} className={dangerGhostBtn}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {unit.lessons.length === 0 && <p className="text-sm text-white/40">No lessons yet. Add the first one above.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------- Algorithm section -------------------------------- */

function AlgorithmEditorModal({
  draft,
  setDraft,
  isNew,
  onCancel,
  onSave,
}: {
  draft: LabAlgorithm
  setDraft: (updater: (d: LabAlgorithm) => LabAlgorithm) => void
  isNew: boolean
  onCancel: () => void
  onSave: () => void
}) {
  function setQubits(qubits: number) {
    const clamped = Math.max(1, Math.min(qubits, 4))
    const states = basisStatesFor(clamped)
    setDraft((d) => ({
      ...d,
      qubits: clamped,
      basisStates: states,
      correctDistribution: states.reduce((acc, s) => ({ ...acc, [s]: d.correctDistribution[s] ?? 0 }), {} as Record<string, number>),
      challenge: {
        ...d.challenge,
        targetDistribution: states.reduce((acc, s) => ({ ...acc, [s]: d.challenge.targetDistribution[s] ?? 0 }), {} as Record<string, number>),
      },
    }))
  }

  function updateGate(index: number, patch: Partial<LabAlgorithm["correctGates"][number]>) {
    setDraft((d) => ({ ...d, correctGates: d.correctGates.map((g, i) => (i === index ? { ...g, ...patch } : g)) }))
  }
  function removeGate(index: number) {
    setDraft((d) => ({ ...d, correctGates: d.correctGates.filter((_, i) => i !== index) }))
  }
  function addGate() {
    setDraft((d) => ({ ...d, correctGates: [...d.correctGates, { id: uid("gate"), step: 0, qubit: 0, gate: "H" }] }))
  }

  return (
    <ModalShell
      onClose={onCancel}
      eyebrow={isNew ? "New algorithm" : "Edit algorithm"}
      title={isNew ? "Add algorithm lab" : `Edit ${draft.name}`}
      maxWidth="max-w-2xl"
      footer={
        <>
          <button type="button" onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!draft.name.trim()}
            className="rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#07101a] transition hover:bg-[#00D4FF]/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save algorithm
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Name</FieldLabel>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value, slug: e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }))}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Slug</FieldLabel>
            <input value={draft.slug} readOnly className={`${inputClass} opacity-60`} />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <FieldLabel>Qubit count</FieldLabel>
          <input type="number" min={1} max={4} value={draft.qubits} onChange={(e) => setQubits(Number(e.target.value) || 1)} className={`${inputClass} max-w-[120px]`} />
        </label>

        <div className="rounded-xl border border-white/8 bg-black/10 p-4">
          <p className="text-xs uppercase tracking-[.14em] text-white/35">Learn section</p>
          <div className="mt-3 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Callout title</FieldLabel>
              <input value={draft.learn.calloutTitle} onChange={(e) => setDraft((d) => ({ ...d, learn: { ...d.learn, calloutTitle: e.target.value } }))} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Equation</FieldLabel>
              <input
                value={draft.learn.equation}
                onChange={(e) => setDraft((d) => ({ ...d, learn: { ...d.learn, equation: e.target.value } }))}
                className={`${inputClass} font-mono`}
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Body paragraphs</FieldLabel>
              <div className="flex flex-col gap-2">
                {draft.learn.body.map((para, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <textarea
                      value={para}
                      onChange={(e) => setDraft((d) => ({ ...d, learn: { ...d.learn, body: d.learn.body.map((p, i) => (i === index ? e.target.value : p)) } }))}
                      rows={2}
                      className={`resize-none ${inputClass}`}
                    />
                    <button
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, learn: { ...d.learn, body: d.learn.body.filter((_, i) => i !== index) } }))}
                      className="shrink-0 rounded-md p-1.5 text-white/40 hover:text-[#FB7185]"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, learn: { ...d.learn, body: [...d.learn.body, ""] } }))}
                  className="flex items-center gap-1.5 self-start text-xs text-[#00D4FF] hover:text-white"
                >
                  <Plus className="size-3.5" /> Add paragraph
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/10 p-4">
          <p className="text-xs uppercase tracking-[.14em] text-white/35">Correct distribution</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {draft.basisStates.map((state) => (
              <label key={state} className="flex flex-col gap-1.5">
                <FieldLabel>|{state}⟩</FieldLabel>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.correctDistribution[state] ?? 0}
                  onChange={(e) => setDraft((d) => ({ ...d, correctDistribution: { ...d.correctDistribution, [state]: Number(e.target.value) || 0 } }))}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/10 p-4">
          <p className="text-xs uppercase tracking-[.14em] text-white/35">Correct gates</p>
          <div className="mt-3 flex flex-col gap-2">
            {draft.correctGates.map((gate, index) => (
              <div key={gate.id} className="flex items-center gap-2">
                <span className="text-xs text-white/35">Step</span>
                <input type="number" min={0} value={gate.step} onChange={(e) => updateGate(index, { step: Number(e.target.value) || 0 })} className={`${inputClass} w-16`} />
                <span className="text-xs text-white/35">Qubit</span>
                <input type="number" min={0} value={gate.qubit} onChange={(e) => updateGate(index, { qubit: Number(e.target.value) || 0 })} className={`${inputClass} w-16`} />
                <span className="text-xs text-white/35">Gate</span>
                <select value={gate.gate} onChange={(e) => updateGate(index, { gate: e.target.value })} className={selectClass}>
                  {GATE_TYPES.map((g) => (
                    <option key={g} value={g} className="bg-[#0f1420]">
                      {g}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => removeGate(index)} className="shrink-0 rounded-md p-1.5 text-white/40 hover:text-[#FB7185]">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addGate} className="flex items-center gap-1.5 self-start text-xs text-[#00D4FF] hover:text-white">
              <Plus className="size-3.5" /> Add gate
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/10 p-4">
          <p className="text-xs uppercase tracking-[.14em] text-white/35">Seeded fault</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Gate ID reference</FieldLabel>
              <input value={draft.seededFault.gateId} onChange={(e) => setDraft((d) => ({ ...d, seededFault: { ...d.seededFault, gateId: e.target.value } }))} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Description</FieldLabel>
              <input
                value={draft.seededFault.description}
                onChange={(e) => setDraft((d) => ({ ...d, seededFault: { ...d.seededFault, description: e.target.value } }))}
                className={inputClass}
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/10 p-4">
          <p className="text-xs uppercase tracking-[.14em] text-white/35">Challenge config</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Difficulty</FieldLabel>
              <select
                value={draft.challenge.difficulty}
                onChange={(e) => setDraft((d) => ({ ...d, challenge: { ...d.challenge, difficulty: e.target.value as LabAlgorithm["challenge"]["difficulty"] } }))}
                className={selectClass}
              >
                {(["EASY", "MEDIUM", "HARD"] as const).map((option) => (
                  <option key={option} value={option} className="bg-[#0f1420]">
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Gate budget</FieldLabel>
              <input
                type="number"
                value={draft.challenge.gateBudget}
                onChange={(e) => setDraft((d) => ({ ...d, challenge: { ...d.challenge, gateBudget: Number(e.target.value) || 0 } }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Iteration cap</FieldLabel>
              <input
                type="number"
                value={draft.challenge.iterationCap}
                onChange={(e) => setDraft((d) => ({ ...d, challenge: { ...d.challenge, iterationCap: Number(e.target.value) || 0 } }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Tolerance</FieldLabel>
              <input
                type="number"
                value={draft.challenge.tolerance}
                onChange={(e) => setDraft((d) => ({ ...d, challenge: { ...d.challenge, tolerance: Number(e.target.value) || 0 } }))}
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {draft.basisStates.map((state) => (
              <label key={state} className="flex flex-col gap-1.5">
                <FieldLabel>Target |{state}⟩</FieldLabel>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.challenge.targetDistribution[state] ?? 0}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      challenge: { ...d.challenge, targetDistribution: { ...d.challenge.targetDistribution, [state]: Number(e.target.value) || 0 } },
                    }))
                  }
                  className={inputClass}
                />
              </label>
            ))}
          </div>

          <label className="mt-3 flex flex-col gap-1.5">
            <FieldLabel>Goal</FieldLabel>
            <textarea
              value={draft.challenge.goal}
              onChange={(e) => setDraft((d) => ({ ...d, challenge: { ...d.challenge, goal: e.target.value } }))}
              rows={2}
              className={`resize-none ${inputClass}`}
            />
          </label>

          <div className="mt-3 flex flex-col gap-1.5">
            <FieldLabel>Hints</FieldLabel>
            <EditableList
              items={draft.challenge.hints}
              onChange={(hints) => setDraft((d) => ({ ...d, challenge: { ...d.challenge, hints } }))}
              placeholder="Hint text"
            />
          </div>
        </div>
      </div>
    </ModalShell>
  )
}

function AlgorithmCard({ algo, onEdit, onDelete }: { algo: LabAlgorithm; onEdit: () => void; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{algo.name}</h3>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: difficultyColors[algo.challenge.difficulty], backgroundColor: `${difficultyColors[algo.challenge.difficulty]}18` }}
            >
              {algo.challenge.difficulty}
            </span>
          </div>
          <p className="mt-1 text-xs text-white/40">
            /{algo.slug} · {algo.qubits} qubits
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">{algo.learn.body[0]}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onEdit} className={ghostBtn}>
            <span className="flex items-center gap-1.5">
              <Pencil className="size-3.5" /> Edit
            </span>
          </button>
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)} className={dangerGhostBtn}>
              <span className="flex items-center gap-1.5">
                <Trash2 className="size-3.5" /> Delete
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={onDelete} className="rounded-lg bg-[#FB7185] px-3 py-1.5 text-xs font-semibold text-[#1a0a0d] transition hover:bg-[#FB7185]/85">
                Confirm
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {algo.basisStates.map((state) => (
          <div key={state} className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/10 px-3 py-1.5 text-xs">
            <span className="font-mono text-white/50">|{state}⟩</span>
            <span className="font-semibold text-[#00D4FF]">{algo.correctDistribution[state] ?? 0}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------ Page ------------------------------------ */

export function CurriculumManagerPage() {
  const [unitList, setUnitList] = useState<Unit[]>(() => seedUnits.map((u) => ({ ...u, lessons: u.lessons.map((l) => ({ ...l })) })))
  const [algorithms, setAlgorithms] = useState<LabAlgorithm[]>(() => Object.values(ALGORITHMS).map((a) => algorithmToDraft(a as unknown as LabAlgorithm)))

  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null)

  const [unitModal, setUnitModal] = useState<{ open: boolean; isNew: boolean; draft: UnitDraft } | null>(null)
  const [lessonModal, setLessonModal] = useState<{ open: boolean; isNew: boolean; unitId: string; draft: LessonDraft } | null>(null)
  const [algoModal, setAlgoModal] = useState<{ open: boolean; isNew: boolean; draft: LabAlgorithm } | null>(null)

  const anyModalOpen = Boolean(unitModal?.open || lessonModal?.open || algoModal?.open)

  useEffect(() => {
    if (!anyModalOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [anyModalOpen])

  const totalLessons = useMemo(() => unitList.reduce((n, u) => n + u.lessons.length, 0), [unitList])
  const levelCounts = useMemo(() => {
    const counts: Record<UnitLevel, number> = { Beginner: 0, Intermediate: 0, Advanced: 0 }
    unitList.forEach((u) => (counts[u.level] += 1))
    return counts
  }, [unitList])

  function moveUnit(index: number, dir: -1 | 1) {
    setUnitList((list) => {
      const target = index + dir
      if (target < 0 || target >= list.length) return list
      const next = [...list]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function deleteUnit(id: string) {
    setUnitList((list) => list.filter((u) => u.id !== id))
    if (expandedUnitId === id) setExpandedUnitId(null)
  }

  function openAddUnit() {
    setUnitModal({ open: true, isNew: true, draft: emptyUnitDraft() })
  }
  function openEditUnit(unit: Unit) {
    setUnitModal({ open: true, isNew: false, draft: unitToDraft(unit) })
  }
  function saveUnit() {
    if (!unitModal) return
    const { draft, isNew } = unitModal
    setUnitList((list) => {
      if (isNew) {
        const newUnit: Unit = { ...draft, prerequisites: draft.prerequisites, lessons: [], xpTotal: 0, minutes: 0 }
        return [...list, newUnit]
      }
      return list.map((u) => (u.id === draft.id ? { ...u, ...draft } : u))
    })
    setUnitModal(null)
  }

  function openAddLesson(unitId: string) {
    setLessonModal({ open: true, isNew: true, unitId, draft: emptyLessonDraft() })
  }
  function openEditLesson(unitId: string, lesson: Lesson) {
    setLessonModal({ open: true, isNew: false, unitId, draft: lessonToDraft(lesson) })
  }
  function saveLesson() {
    if (!lessonModal) return
    const { draft, isNew, unitId } = lessonModal
    setUnitList((list) =>
      list.map((u) => {
        if (u.id !== unitId) return u
        const lessons = isNew ? [...u.lessons, draft] : u.lessons.map((l) => (l.id === draft.id ? draft : l))
        return { ...u, lessons, xpTotal: lessons.reduce((n, l) => n + l.xp, 0), minutes: lessons.reduce((n, l) => n + l.minutes, 0) }
      }),
    )
    setLessonModal(null)
  }
  function moveLesson(unitId: string, lessonId: string, dir: -1 | 1) {
    setUnitList((list) =>
      list.map((u) => {
        if (u.id !== unitId) return u
        const index = u.lessons.findIndex((l) => l.id === lessonId)
        const target = index + dir
        if (index < 0 || target < 0 || target >= u.lessons.length) return u
        const lessons = [...u.lessons]
        ;[lessons[index], lessons[target]] = [lessons[target], lessons[index]]
        return { ...u, lessons }
      }),
    )
  }
  function removeLesson(unitId: string, lessonId: string) {
    setUnitList((list) =>
      list.map((u) => {
        if (u.id !== unitId) return u
        const lessons = u.lessons.filter((l) => l.id !== lessonId)
        return { ...u, lessons, xpTotal: lessons.reduce((n, l) => n + l.xp, 0), minutes: lessons.reduce((n, l) => n + l.minutes, 0) }
      }),
    )
  }

  function openAddAlgorithm() {
    setAlgoModal({
      open: true,
      isNew: true,
      draft: {
        slug: "",
        name: "",
        qubits: 2,
        basisStates: basisStatesFor(2),
        learn: { calloutTitle: "", equation: "", body: [] },
        correctDistribution: basisStatesFor(2).reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<string, number>),
        correctGates: [],
        seededFault: { gateId: "", description: "" },
        challenge: {
          difficulty: "MEDIUM",
          gateBudget: 6,
          iterationCap: 3,
          targetDistribution: basisStatesFor(2).reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<string, number>),
          tolerance: 5,
          goal: "",
          hints: [],
        },
      },
    })
  }
  function openEditAlgorithm(algo: LabAlgorithm) {
    setAlgoModal({ open: true, isNew: false, draft: algorithmToDraft(algo) })
  }
  function saveAlgorithm() {
    if (!algoModal) return
    const { draft, isNew } = algoModal
    setAlgorithms((list) => (isNew ? [...list, draft] : list.map((a) => (a.slug === draft.slug ? draft : a))))
    setAlgoModal(null)
  }
  function deleteAlgorithm(slug: string) {
    setAlgorithms((list) => list.filter((a) => a.slug !== slug))
  }

  const lessonModalUnitTitle = lessonModal ? unitList.find((u) => u.id === lessonModal.unitId)?.title ?? "" : ""

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
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Curriculum manager</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
            Author and organize units, lessons, and algorithm labs. Edits are version-tracked to protect existing student progress.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-xs text-white/55">
          <Zap className="size-3.5 text-[#F5B942]" /> Data synced from learner activity · just now
        </div>
      </div>

      {/* Stat cards */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total units"
          value={String(unitList.length)}
          detail={`${levelCounts.Beginner} Beginner · ${levelCounts.Intermediate} Intermediate · ${levelCounts.Advanced} Advanced`}
          icon={BookOpen}
          accent="#00D4FF"
        />
        <StatCard label="Total lessons" value={String(totalLessons)} detail="Across all units" icon={FileText} accent="#4ADE80" />
        <StatCard label="Algorithm labs" value={String(algorithms.length)} detail="Deutsch-Jozsa active" icon={Atom} accent="#A78BFA" />
        <StatCard label="Pending review" value="6" detail="Lessons awaiting faculty sign-off" icon={AlertTriangle} accent="#F5B942" />
      </section>

      {/* Units */}
      <section className="mt-8">
        <SectionHeading eyebrow="Course structure" title="Units" actionLabel="Add unit" onAction={openAddUnit} />
        <div className="flex flex-col gap-3">
          {unitList.map((unit, index) => (
            <UnitRow
              key={unit.id}
              unit={unit}
              index={index}
              total={unitList.length}
              expanded={expandedUnitId === unit.id}
              onMove={(dir) => moveUnit(index, dir)}
              onToggleLessons={() => setExpandedUnitId((id) => (id === unit.id ? null : unit.id))}
              onEdit={() => openEditUnit(unit)}
              onDelete={() => deleteUnit(unit.id)}
              onAddLesson={() => openAddLesson(unit.id)}
              onEditLesson={(lesson) => openEditLesson(unit.id, lesson)}
              onMoveLesson={(lessonId, dir) => moveLesson(unit.id, lessonId, dir)}
              onRemoveLesson={(lessonId) => removeLesson(unit.id, lessonId)}
            />
          ))}
          {unitList.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[.025] p-10 text-center text-sm text-white/40">
              No units yet. Add the first one to get started.
            </div>
          )}
        </div>
      </section>

      {/* Algorithm labs */}
      <section className="mt-10">
        <SectionHeading eyebrow="Algorithm labs" title="Lab tracks" actionLabel="Add algorithm" onAction={openAddAlgorithm} />
        <div className="flex flex-col gap-3">
          {algorithms.map((algo) => (
            <AlgorithmCard key={algo.slug} algo={algo} onEdit={() => openEditAlgorithm(algo)} onDelete={() => deleteAlgorithm(algo.slug)} />
          ))}
          {algorithms.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[.025] p-10 text-center text-sm text-white/40">
              No algorithm labs yet.
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      {unitModal?.open && (
        <UnitEditorModal
          draft={unitModal.draft}
          setDraft={(updater) => setUnitModal((m) => (m ? { ...m, draft: updater(m.draft) } : m))}
          isNew={unitModal.isNew}
          allUnits={unitList}
          onCancel={() => setUnitModal(null)}
          onSave={saveUnit}
        />
      )}

      {lessonModal?.open && (
        <LessonEditorModal
          draft={lessonModal.draft}
          setDraft={(updater) => setLessonModal((m) => (m ? { ...m, draft: updater(m.draft) } : m))}
          isNew={lessonModal.isNew}
          unitTitle={lessonModalUnitTitle}
          onCancel={() => setLessonModal(null)}
          onSave={saveLesson}
        />
      )}

      {algoModal?.open && (
        <AlgorithmEditorModal
          draft={algoModal.draft}
          setDraft={(updater) => setAlgoModal((m) => (m ? { ...m, draft: updater(m.draft) } : m))}
          isNew={algoModal.isNew}
          onCancel={() => setAlgoModal(null)}
          onSave={saveAlgorithm}
        />
      )}
    </main>
  )
}
