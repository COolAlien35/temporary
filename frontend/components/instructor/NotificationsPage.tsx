"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Atom,
  BellRing,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  Mail,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  ScrollText,
  Search,
  Send,
  Smartphone,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { students as roster } from "@/lib/instructor-students"
import {
  announcements as seedAnnouncements,
  audienceIcon,
  batchOptions,
  channelLabel,
  cohortOptions,
  CURRENT_DISPATCH_LABEL,
  DEFAULT_AUTHOR,
  emojiOptions,
  formatFullDate,
  formatShortDate,
  initials,
  logEventStyles,
  notificationLog as seedLog,
  NOW_MS,
  priorityBadgeClass,
  readRateColor,
  relativeTime,
  resolveRecipients,
  resolveTargetLabel,
  statusBadgeClass,
  timingLabel,
  withReadStats,
  type Announcement,
  type AnnouncementPriority,
  type AnnouncementStatus,
  type DeliveryChannel,
  type LogEvent,
  type NotificationLogEntry,
  type TargetAudience,
} from "@/lib/instructor-notifications"

/* --------------------------------- Constants -------------------------------- */

type StatusFilter = "All" | "Sent" | "Pinned" | "Scheduled" | "Drafts"
type PriorityFilter = "All" | AnnouncementPriority
type AudienceFilter = "All" | TargetAudience
type LogFilter = "All" | "Created" | "Sent" | "Scheduled" | "Pinned" | "Edited" | "Deleted"
type ComposeTab = "Content" | "Delivery & Targeting"

const STATUS_FILTERS: StatusFilter[] = ["All", "Sent", "Pinned", "Scheduled", "Drafts"]
const LOG_FILTERS: LogFilter[] = ["All", "Created", "Sent", "Scheduled", "Pinned", "Edited", "Deleted"]
const COMPOSE_TABS: ComposeTab[] = ["Content", "Delivery & Targeting"]
const PRIORITIES: AnnouncementPriority[] = ["Urgent", "Normal", "Low"]

const priorityColors: Record<AnnouncementPriority, string> = {
  Urgent: "#FB7185",
  Normal: "#00D4FF",
  Low: "#9CA3AF",
}

const logFilterEvents: Record<Exclude<LogFilter, "All">, LogEvent[]> = {
  Created: ["created"],
  Sent: ["sent"],
  Scheduled: ["scheduled"],
  Pinned: ["pinned", "unpinned"],
  Edited: ["edited"],
  Deleted: ["deleted"],
}

const SESSION_START = typeof performance !== "undefined" ? performance.now() : 0
/** Advances the mock clock from the dataset's fixed "now" so runtime actions read as "just now". */
function nowIso() {
  const elapsed = typeof performance !== "undefined" ? performance.now() - SESSION_START : 0
  return new Date(NOW_MS + elapsed).toISOString()
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
  highlight = false,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Users
  accent: string
  highlight?: boolean
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-white/[.035] p-5 transition hover:border-white/20"
      style={{ borderColor: highlight ? `${accent}66` : "rgba(255,255,255,.1)" }}
    >
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
      <div className="absolute -bottom-10 -right-8 size-24 rounded-full blur-2xl" style={{ backgroundColor: `${accent}${highlight ? "30" : "12"}` }} />
    </div>
  )
}

function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-[11px] uppercase tracking-[.22em] text-[#00D4FF]">{eyebrow}</p>}
        <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function FilterPillGroup<T extends string>({
  options,
  value,
  onChange,
  counts,
}: {
  options: T[]
  value: T
  onChange: (value: T) => void
  counts?: Partial<Record<T, number>>
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="tablist">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          onClick={() => onChange(option)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
            value === option ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/50 hover:text-white"
          }`}
        >
          {option}
          {counts?.[option] !== undefined && <span className="text-[10px] opacity-60">{counts[option]}</span>}
        </button>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: AnnouncementStatus }) {
  const Icon = status === "Pinned" ? Pin : status === "Scheduled" ? Clock : null
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(status)}`}>
      {Icon ? <Icon className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
      {status}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: AnnouncementPriority }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priorityBadgeClass(priority)}`}>
      {priority}
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

function Avatar({ name, size = "size-8", gradient = avatarGradient }: { name: string; size?: string; gradient?: string }) {
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${gradient}`}>
      {initials(name)}
    </span>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-[#A78BFA]" : "bg-white/15"}`}
    >
      <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
    </button>
  )
}

function RadioCard({
  checked,
  onSelect,
  title,
  detail,
  accent = "#00D4FF",
  children,
}: {
  checked: boolean
  onSelect: () => void
  title: string
  detail?: string
  accent?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl border p-3 transition"
      style={{ borderColor: checked ? `${accent}66` : "rgba(255,255,255,.1)", backgroundColor: checked ? `${accent}0d` : "rgba(0,0,0,.15)" }}
    >
      <button type="button" role="radio" aria-checked={checked} onClick={onSelect} className="flex w-full items-center gap-3 text-left">
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: checked ? accent : "rgba(255,255,255,.3)" }}>
          {checked && <span className="size-2 rounded-full" style={{ backgroundColor: accent }} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-white">{title}</span>
          {detail && <span className="block text-[11px] text-white/40">{detail}</span>}
        </span>
      </button>
      {checked && children && <div className="mt-3 pl-7">{children}</div>}
    </div>
  )
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00D4FF]/40"
const selectClass = "rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#00D4FF]/40"
const textareaClass = `${inputClass} min-h-24 resize-none`
const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-[#00D4FF]/40 hover:text-[#00D4FF]"
const dangerGhostBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#FB7185]/30 px-3 py-1.5 text-xs font-medium text-[#FB7185] transition hover:bg-[#FB7185]/10"
const violetGhostBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#A78BFA]/30 px-3 py-1.5 text-xs font-medium text-[#A78BFA] transition hover:bg-[#A78BFA]/10"
const primaryBtn =
  "inline-flex items-center gap-1.5 rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#07101a] transition hover:bg-[#00D4FF]/85 disabled:cursor-not-allowed disabled:opacity-40"
const secondaryBtn = "inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:text-white"
const avatarGradient = "bg-gradient-to-br from-[#5B8CFF] to-[#A78BFA]"
const authorGradient = "bg-gradient-to-br from-[#4FD1E8] to-[#00D4FF] !text-[#0A0E17]"

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className={`relative flex max-h-[85vh] w-full ${maxWidth} flex-col rounded-2xl border border-white/10 bg-[#0f1420] shadow-2xl`}>
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-6">
          <div>
            <p className="text-xs uppercase tracking-[.16em] text-[#00D4FF]">{eyebrow}</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-white/40 hover:text-white" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 p-4">{footer}</div>}
      </div>
    </div>
  )
}

function DrawerShell({
  onClose,
  title,
  eyebrow,
  children,
  headerExtra,
}: {
  onClose: () => void
  title: string
  eyebrow: string
  children: React.ReactNode
  headerExtra?: React.ReactNode
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-[70] flex justify-end overscroll-contain" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0b0f18] shadow-2xl">
        <div className="border-b border-white/10 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[.16em] text-[#00D4FF]">{eyebrow}</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
            </div>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-white/40 hover:text-white" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>
          {headerExtra}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

/* ------------------------------ Markdown (minimal) ------------------------------ */

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean)
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={key} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={key} className="rounded bg-white/10 px-1 font-mono text-[0.9em] text-[#00D4FF]">
          {part.slice(1, -1)}
        </code>
      )
    if (part.startsWith("*") && part.endsWith("*")) return <em key={key}>{part.slice(1, -1)}</em>
    return <Fragment key={key}>{part}</Fragment>
  })
}

function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n")
        if (lines.every((l) => l.trim().startsWith("- ")))
          return (
            <ul key={bi} className="list-disc space-y-0.5 pl-4">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.trim().slice(2), `${bi}-${li}`)}</li>
              ))}
            </ul>
          )
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(l, `${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function plainPreview(text: string) {
  return text.replace(/\*\*|`/g, "").replace(/(^|\s)\*([^*]+)\*/g, "$1$2").replace(/\n+/g, " ")
}

/* ------------------------------ Student-side preview ------------------------------ */

function DispatchPreview({ body, authorName, authorRole }: { body: string; authorName: string; authorRole: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <svg viewBox="0 0 60 60" aria-hidden="true" className="pointer-events-none absolute -right-2 bottom-2 h-16 w-16 text-[#00D4FF] opacity-10">
        <text x={0} y={48} fontSize={56} fontFamily="Georgia, serif" fill="currentColor">
          &rdquo;
        </text>
      </svg>
      <div className="relative flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4FD1E8] to-[#00D4FF] text-[11px] font-semibold text-[#0A0E17]">
          {initials(authorName || "?")}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white">{authorName || "Author name"}</p>
          <p className="truncate text-[11px] text-white/40">{authorRole || "Role"}</p>
        </div>
      </div>
      <blockquote className="relative mt-3 border-l-2 border-white/15 pl-3 text-xs italic leading-relaxed text-white/65">
        {body.trim() ? (
          <>
            &ldquo;{renderInline(body.trim().replace(/\n+/g, " "), "dispatch")}&rdquo;
          </>
        ) : (
          <span className="text-white/30">Your announcement body will appear here.</span>
        )}
      </blockquote>
      <p className="mt-2 text-[11px] text-white/35">{CURRENT_DISPATCH_LABEL}</p>
      <span className="mt-1 inline-block text-[11px] font-medium text-[#00D4FF]">Read dispatch &rarr;</span>
    </div>
  )
}

/* ------------------------------ Pinned strip ------------------------------ */

function PinnedStrip({ pinned, onUnpin, onEdit }: { pinned: Announcement[]; onUnpin: (a: Announcement) => void; onEdit: (a: Announcement) => void }) {
  if (pinned.length === 0) return null
  return (
    <section aria-labelledby="pinned-heading" className="flex flex-col gap-3">
      {pinned.map((a) => (
        <div
          key={a.id}
          className="grid gap-5 overflow-hidden rounded-2xl border border-[#A78BFA]/25 border-l-4 border-l-[#A78BFA] bg-[#A78BFA]/[.05] p-5 lg:grid-cols-[1fr_320px]"
        >
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#A78BFA]/15 text-[#A78BFA]">
                <Pin className="size-3.5" />
              </span>
              <p id="pinned-heading" className="text-[11px] uppercase tracking-[.22em] text-[#A78BFA]">
                Pinned to student home
              </p>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-white">{a.title}</h3>
            <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-white/55">{plainPreview(a.body)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45">
              {a.pinnedUntil && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-[#A78BFA]" /> Pinned until {formatShortDate(a.pinnedUntil)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Eye className="size-3.5" /> {a.readCount}/{a.totalRecipients} read
              </span>
              <span>{timingLabel(a)}</span>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <button type="button" onClick={() => onUnpin(a)} className={violetGhostBtn}>
                <PinOff className="size-3.5" /> Unpin
              </button>
              <button type="button" onClick={() => onEdit(a)} className={ghostBtn}>
                <Pencil className="size-3.5" /> Edit
              </button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[.16em] text-white/35">Student home preview</p>
            <DispatchPreview body={a.body} authorName={a.authorName} authorRole={a.authorRole} />
          </div>
        </div>
      ))}
    </section>
  )
}

/* ------------------------------ Announcement card ------------------------------ */

function AnnouncementCard({
  announcement: a,
  expanded,
  onToggleExpand,
  onTogglePin,
  onEdit,
  onDuplicate,
  onDelete,
  onResend,
  onViewReceipts,
  events,
}: {
  announcement: Announcement
  expanded: boolean
  onToggleExpand: () => void
  onTogglePin: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onResend: () => void
  onViewReceipts: () => void
  events: NotificationLogEntry[]
}) {
  const AudienceIcon = audienceIcon(a.targetAudience)
  const isDelivered = a.status === "Sent" || a.status === "Pinned"
  const rateColor = readRateColor(a.readRate)
  const ChannelIcon = a.channel === "Email" ? Mail : a.channel === "Both" ? BellRing : Smartphone

  return (
    <article
      id={`ann-${a.id}`}
      className={`scroll-mt-24 rounded-2xl border bg-white/[.025] p-5 transition hover:border-white/20 ${
        a.priority === "Urgent"
          ? "border-white/10 border-l-2 border-l-[#FB7185] shadow-[inset_6px_0_18px_-10px_rgba(251,113,133,.7)]"
          : "border-white/10"
      } ${a.priority === "Low" ? "opacity-80" : ""}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={a.status} />
            <PriorityBadge priority={a.priority} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-white/55">
              <AudienceIcon className="size-3" /> {a.targetLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-white/55">
              <ChannelIcon className="size-3" /> {channelLabel(a.channel)}
            </span>
          </div>

          <h3 className="mt-3 text-base font-semibold text-white">{a.title}</h3>

          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={expanded}
            className="mt-1.5 block w-full text-left text-sm leading-6 text-white/55 hover:text-white/70"
          >
            {expanded ? <Markdown text={a.body} /> : <span className="line-clamp-2">{plainPreview(a.body)}</span>}
          </button>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2">
              <Avatar name={a.authorName} size="size-7" gradient={authorGradient} />
              <div className="leading-tight">
                <p className="text-xs font-medium text-white/80">{a.authorName}</p>
                <p className="text-[11px] text-white/40">{a.authorRole}</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-white/45">
              {a.status === "Scheduled" ? <Clock className="size-3.5 text-[#F5B942]" /> : a.status === "Draft" ? <Pencil className="size-3.5" /> : <Send className="size-3.5" />}
              <span title={a.sentAt ? formatFullDate(a.sentAt) : a.scheduledFor ? formatFullDate(a.scheduledFor) : undefined}>{timingLabel(a)}</span>
            </span>
          </div>
        </div>

        <div className="w-full shrink-0 lg:w-56">
          {isDelivered ? (
            <button
              type="button"
              onClick={onViewReceipts}
              className="w-full rounded-xl border border-white/8 bg-black/15 p-3 text-left transition hover:border-white/20"
              aria-label={`View read receipts: ${a.readCount} of ${a.totalRecipients} read`}
            >
              <div className="flex items-center justify-between text-[11px] text-white/45">
                <span className="uppercase tracking-[.14em]">Read rate</span>
                <span className="font-semibold" style={{ color: rateColor }}>
                  {a.readRate}%
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar value={a.readRate} color={rateColor} />
              </div>
              <p className="mt-2 text-xs text-white/55">
                {a.readCount}/{a.totalRecipients} read <span className="text-white/30">({a.readRate}%)</span>
              </p>
            </button>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-white/40">
              <p className="uppercase tracking-[.14em] text-[11px]">Recipients</p>
              <p className="mt-2 text-white/60">{resolveRecipients(a.targetAudience, a.targetIds).length} students queued</p>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-5 grid gap-4 rounded-xl border border-white/8 bg-black/15 p-4 sm:grid-cols-2">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-white/40">Created</dt>
              <dd className="mt-0.5 text-white/75">{formatFullDate(a.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-white/40">{a.status === "Scheduled" ? "Scheduled for" : "Sent"}</dt>
              <dd className="mt-0.5 text-white/75">
                {a.sentAt ? formatFullDate(a.sentAt) : a.scheduledFor ? formatFullDate(a.scheduledFor) : "Not sent"}
              </dd>
            </div>
            <div>
              <dt className="text-white/40">Audience</dt>
              <dd className="mt-0.5 text-white/75">
                {a.targetAudience} &middot; {a.targetLabel}
              </dd>
            </div>
            <div>
              <dt className="text-white/40">Pinned</dt>
              <dd className="mt-0.5 text-white/75">{a.isPinned && a.pinnedUntil ? `Until ${formatShortDate(a.pinnedUntil)}` : "No"}</dd>
            </div>
          </dl>
          <div>
            <p className="text-xs text-white/40">Activity</p>
            {events.length === 0 ? (
              <p className="mt-2 text-xs text-white/35">No activity recorded yet.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {events.slice(0, 4).map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${logEventStyles[e.event].text} ${logEventStyles[e.event].bg}`}>
                      {e.event}
                    </span>
                    <span className="truncate text-white/55">{e.detail}</span>
                    <span className="ml-auto shrink-0 text-white/30">{relativeTime(e.timestamp)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
        <button type="button" onClick={onToggleExpand} className={ghostBtn}>
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          {expanded ? "Hide details" : "View details"}
        </button>
        {isDelivered && (
          <button type="button" onClick={onTogglePin} className={a.isPinned ? violetGhostBtn : ghostBtn}>
            {a.isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            {a.isPinned ? "Unpin" : "Pin to home"}
          </button>
        )}
        <button type="button" onClick={onEdit} className={ghostBtn}>
          <Pencil className="size-3.5" /> Edit
        </button>
        <button type="button" onClick={onDuplicate} className={ghostBtn}>
          <Copy className="size-3.5" /> Duplicate
        </button>
        {isDelivered && (
          <button type="button" onClick={onResend} className={ghostBtn}>
            <RotateCcw className="size-3.5" /> Resend
          </button>
        )}
        <button type="button" onClick={onDelete} className={`${dangerGhostBtn} sm:ml-auto`}>
          <Trash2 className="size-3.5" /> Delete
        </button>
      </div>
    </article>
  )
}

/* ------------------------------ Compose draft ------------------------------ */

type ComposeDraft = {
  id: string
  title: string
  body: string
  authorName: string
  authorRole: string
  priority: AnnouncementPriority
  audience: TargetAudience
  cohortId: string
  batchId: string
  studentId: string
  channel: DeliveryChannel
  scheduleMode: "now" | "later"
  scheduleDate: string
  scheduleTime: string
  pin: boolean
  pinUntil: string
}

function addDays(ms: number, days: number) {
  return new Date(ms + days * 86_400_000).toISOString().slice(0, 10)
}

function emptyDraft(): ComposeDraft {
  return {
    id: uid("ann"),
    title: "",
    body: "",
    authorName: DEFAULT_AUTHOR.name,
    authorRole: DEFAULT_AUTHOR.role,
    priority: "Normal",
    audience: "All Students",
    cohortId: cohortOptions[0].id,
    batchId: batchOptions[0].id,
    studentId: "",
    channel: "In-App",
    scheduleMode: "now",
    scheduleDate: addDays(NOW_MS, 1),
    scheduleTime: "09:00",
    pin: false,
    pinUntil: addDays(NOW_MS, 7),
  }
}

function announcementToDraft(a: Announcement): ComposeDraft {
  const base = emptyDraft()
  return {
    ...base,
    id: a.id,
    title: a.title,
    body: a.body,
    authorName: a.authorName,
    authorRole: a.authorRole,
    priority: a.priority,
    audience: a.targetAudience,
    cohortId: a.targetAudience === "Cohort" ? a.targetIds[0] : base.cohortId,
    batchId: a.targetAudience === "Batch" ? a.targetIds[0] : base.batchId,
    studentId: a.targetAudience === "Individual" ? a.targetIds[0] : "",
    channel: a.channel,
    scheduleMode: a.scheduledFor ? "later" : "now",
    scheduleDate: a.scheduledFor ? a.scheduledFor.slice(0, 10) : base.scheduleDate,
    scheduleTime: a.scheduledFor ? a.scheduledFor.slice(11, 16) : base.scheduleTime,
    pin: a.isPinned,
    pinUntil: a.pinnedUntil ? a.pinnedUntil.slice(0, 10) : base.pinUntil,
  }
}

function draftTargetIds(d: ComposeDraft): string[] {
  switch (d.audience) {
    case "All Students":
      return []
    case "Cohort":
      return [d.cohortId]
    case "Batch":
      return [d.batchId]
    case "Individual":
      return d.studentId ? [d.studentId] : []
  }
}

/* ------------------------------ Compose modal ------------------------------ */

type ComposeIntent = "send" | "schedule" | "draft" | "save"

function ComposeModal({
  draft,
  setDraft,
  mode,
  onCancel,
  onSubmit,
}: {
  draft: ComposeDraft
  setDraft: (updater: (d: ComposeDraft) => ComposeDraft) => void
  mode: "new" | "edit-draft" | "edit-sent"
  onCancel: () => void
  onSubmit: (intent: ComposeIntent) => void
}) {
  const [tab, setTab] = useState<ComposeTab>("Content")
  const [showPreview, setShowPreview] = useState(false)
  const [studentSearch, setStudentSearch] = useState("")

  const recipients = resolveRecipients(draft.audience, draftTargetIds(draft))
  const targetValid = draft.audience !== "Individual" || Boolean(draft.studentId)
  const canSubmit = draft.title.trim().length > 0 && draft.body.trim().length > 0 && targetValid
  const filteredStudents = roster.filter((s) => s.name.toLowerCase().includes(studentSearch.toLowerCase()))

  function applyEmoji(emoji: string) {
    setDraft((d) => {
      const stripped = d.title.replace(new RegExp(`^(${emojiOptions.join("|")})\\s*`, "u"), "")
      return { ...d, title: `${emoji} ${stripped}` }
    })
  }

  const primaryLabel = mode === "edit-sent" ? "Save changes" : draft.scheduleMode === "later" ? "Schedule" : "Send now"
  const primaryIntent: ComposeIntent = mode === "edit-sent" ? "save" : draft.scheduleMode === "later" ? "schedule" : "send"

  return (
    <ModalShell
      onClose={onCancel}
      eyebrow={mode === "new" ? "New broadcast" : "Edit broadcast"}
      title={mode === "new" ? "Compose announcement" : draft.title || "Edit announcement"}
      maxWidth="max-w-2xl"
      footer={
        <>
          <span className="mr-auto flex items-center gap-1.5 self-center text-xs text-white/40">
            <Users className="size-3.5" /> {recipients.length} {recipients.length === 1 ? "recipient" : "recipients"}
          </span>
          <button type="button" onClick={onCancel} className={secondaryBtn}>
            Cancel
          </button>
          {mode !== "edit-sent" && (
            <button type="button" onClick={() => onSubmit("draft")} disabled={!draft.title.trim()} className={`${secondaryBtn} disabled:opacity-40`}>
              Save as draft
            </button>
          )}
          <button type="button" onClick={() => onSubmit(primaryIntent)} disabled={!canSubmit} className={primaryBtn}>
            {primaryIntent === "schedule" ? <Calendar className="size-4" /> : primaryIntent === "save" ? <Check className="size-4" /> : <Send className="size-4" />}
            {primaryLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-2 border-b border-white/8 pb-4">
        {COMPOSE_TABS.map((t) => (
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
        {tab === "Content" && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Title</FieldLabel>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Midterm review session this Thursday"
              />
            </label>
            <div className="-mt-2 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] text-white/35">Prefix</span>
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => applyEmoji(emoji)}
                  aria-label={`Prefix title with ${emoji}`}
                  className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm transition hover:border-[#00D4FF]/40"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <FieldLabel>Body</FieldLabel>
                <div className="flex rounded-lg border border-white/10 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className={`rounded-md px-2.5 py-1 transition ${!showPreview ? "bg-white/10 text-white" : "text-white/45 hover:text-white"}`}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition ${showPreview ? "bg-white/10 text-white" : "text-white/45 hover:text-white"}`}
                  >
                    <Eye className="size-3" /> Student preview
                  </button>
                </div>
              </div>
              {showPreview ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white/70">
                    <p className="mb-2 font-semibold text-white">{draft.title || "Untitled announcement"}</p>
                    <Markdown text={draft.body || "Nothing to preview yet."} />
                  </div>
                  <DispatchPreview body={draft.body} authorName={draft.authorName} authorRole={draft.authorRole} />
                </div>
              ) : (
                <>
                  <textarea
                    value={draft.body}
                    onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                    className={`${textareaClass} min-h-36 font-mono text-[13px] leading-6`}
                    placeholder="Write your announcement. Supports **bold**, *italic*, `code`, and - bullet lists."
                  />
                  <p className="text-[11px] text-white/35">
                    {"Markdown: **bold**  *italic*  `code`  - list item"}
                  </p>
                </>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Author name</FieldLabel>
                <input value={draft.authorName} onChange={(e) => setDraft((d) => ({ ...d, authorName: e.target.value }))} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Author role</FieldLabel>
                <input value={draft.authorRole} onChange={(e) => setDraft((d) => ({ ...d, authorRole: e.target.value }))} className={inputClass} />
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Priority</FieldLabel>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Priority">
                {PRIORITIES.map((p) => {
                  const selected = draft.priority === p
                  const color = priorityColors[p]
                  return (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setDraft((d) => ({ ...d, priority: p }))}
                      className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition"
                      style={{
                        borderColor: selected ? `${color}66` : "rgba(255,255,255,.1)",
                        backgroundColor: selected ? `${color}18` : "transparent",
                        color: selected ? color : "rgba(255,255,255,.5)",
                      }}
                    >
                      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "Delivery & Targeting" && (
          <div className="flex flex-col gap-6">
            <fieldset className="flex flex-col gap-2" role="radiogroup">
              <legend className="mb-2 text-xs text-white/50">Target audience</legend>
              <RadioCard
                checked={draft.audience === "All Students"}
                onSelect={() => setDraft((d) => ({ ...d, audience: "All Students" }))}
                title="All Students"
                detail={`${roster.length} enrolled students`}
              />
              <RadioCard
                checked={draft.audience === "Cohort"}
                onSelect={() => setDraft((d) => ({ ...d, audience: "Cohort" }))}
                title="Specific cohort"
              >
                <select value={draft.cohortId} onChange={(e) => setDraft((d) => ({ ...d, cohortId: e.target.value }))} className={`${selectClass} w-full`}>
                  {cohortOptions.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#0f1420]">
                      {c.label} ({resolveRecipients("Cohort", [c.id]).length} students)
                    </option>
                  ))}
                </select>
              </RadioCard>
              <RadioCard checked={draft.audience === "Batch"} onSelect={() => setDraft((d) => ({ ...d, audience: "Batch" }))} title="Specific batch">
                <select value={draft.batchId} onChange={(e) => setDraft((d) => ({ ...d, batchId: e.target.value }))} className={`${selectClass} w-full`}>
                  {batchOptions.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#0f1420]">
                      {b.label} ({resolveRecipients("Batch", [b.id]).length} students)
                    </option>
                  ))}
                </select>
              </RadioCard>
              <RadioCard
                checked={draft.audience === "Individual"}
                onSelect={() => setDraft((d) => ({ ...d, audience: "Individual" }))}
                title="Individual student"
                detail={draft.audience === "Individual" && draft.studentId ? resolveTargetLabel("Individual", [draft.studentId]) : undefined}
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/35" />
                  <input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className={`${inputClass} pl-9`}
                    placeholder="Search students"
                    aria-label="Search students"
                  />
                </div>
                <ul className="mt-2 flex max-h-44 flex-col gap-1 overflow-y-auto" role="listbox" aria-label="Students">
                  {filteredStudents.map((s) => {
                    const selected = draft.studentId === s.id
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => setDraft((d) => ({ ...d, studentId: s.id }))}
                          className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition ${
                            selected ? "border-[#00D4FF]/40 bg-[#00D4FF]/10" : "border-transparent hover:bg-white/5"
                          }`}
                        >
                          <Avatar name={s.name} size="size-6" />
                          <span className="flex-1 text-sm text-white/80">{s.name}</span>
                          <span className="text-[11px] text-white/35">Batch {s.batch}</span>
                          {selected && <Check className="size-3.5 text-[#00D4FF]" />}
                        </button>
                      </li>
                    )
                  })}
                  {filteredStudents.length === 0 && <li className="px-2 py-1.5 text-xs text-white/35">No students match.</li>}
                </ul>
              </RadioCard>
            </fieldset>

            <div className="flex flex-col gap-2">
              <FieldLabel>Delivery channel</FieldLabel>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Delivery channel">
                {(
                  [
                    { value: "In-App", label: "In-App only", icon: Smartphone },
                    { value: "Email", label: "Email only", icon: Mail },
                    { value: "Both", label: "Both", icon: BellRing },
                  ] as const
                ).map(({ value, label, icon: Icon }) => {
                  const selected = draft.channel === value
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setDraft((d) => ({ ...d, channel: value }))}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                        selected ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/55 hover:text-white"
                      }`}
                    >
                      <Icon className="size-3.5" /> {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {mode !== "edit-sent" && (
              <fieldset className="flex flex-col gap-2" role="radiogroup">
                <legend className="mb-2 text-xs text-white/50">Scheduling</legend>
                <RadioCard
                  checked={draft.scheduleMode === "now"}
                  onSelect={() => setDraft((d) => ({ ...d, scheduleMode: "now" }))}
                  title="Send immediately"
                  detail="Delivered as soon as you hit send"
                />
                <RadioCard
                  checked={draft.scheduleMode === "later"}
                  onSelect={() => setDraft((d) => ({ ...d, scheduleMode: "later" }))}
                  title="Schedule for later"
                  accent="#F5B942"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-white/40">Date</span>
                      <input
                        type="date"
                        value={draft.scheduleDate}
                        min={addDays(NOW_MS, 0)}
                        onChange={(e) => setDraft((d) => ({ ...d, scheduleDate: e.target.value }))}
                        className={`${inputClass} [color-scheme:dark]`}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-white/40">Time (UTC)</span>
                      <input
                        type="time"
                        value={draft.scheduleTime}
                        onChange={(e) => setDraft((d) => ({ ...d, scheduleTime: e.target.value }))}
                        className={`${inputClass} [color-scheme:dark]`}
                      />
                    </label>
                  </div>
                </RadioCard>
              </fieldset>
            )}

            <div className="rounded-xl border border-white/10 bg-black/15 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#A78BFA]/15 text-[#A78BFA]">
                    <Pin className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm text-white">Pin to student home page</p>
                    <p className="text-[11px] text-white/40">Shows in the Faculty dispatch card on every recipient&apos;s dashboard</p>
                  </div>
                </div>
                <Toggle checked={draft.pin} onChange={(v) => setDraft((d) => ({ ...d, pin: v }))} label="Pin to student home page" />
              </div>
              {draft.pin && (
                <label className="mt-4 flex flex-col gap-1 pl-11">
                  <span className="text-[11px] text-white/40">Pin until</span>
                  <input
                    type="date"
                    value={draft.pinUntil}
                    min={addDays(NOW_MS, 0)}
                    onChange={(e) => setDraft((d) => ({ ...d, pinUntil: e.target.value }))}
                    className={`${inputClass} max-w-48 [color-scheme:dark]`}
                  />
                </label>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  )
}

/* ------------------------------ Activity log drawer ------------------------------ */

function LogDrawer({
  log,
  onClose,
  onSelectAnnouncement,
  existingIds,
}: {
  log: NotificationLogEntry[]
  onClose: () => void
  onSelectAnnouncement: (id: string) => void
  existingIds: Set<string>
}) {
  const [filter, setFilter] = useState<LogFilter>("All")
  const visible = filter === "All" ? log : log.filter((e) => logFilterEvents[filter].includes(e.event))

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <DrawerShell
      onClose={onClose}
      eyebrow="Audit trail"
      title="Notification activity log"
      headerExtra={
        <>
          <p className="mt-1 text-xs text-white/45">
            {log.length} {log.length === 1 ? "entry" : "entries"} recorded
          </p>
          <div className="mt-4">
            <FilterPillGroup options={LOG_FILTERS} value={filter} onChange={setFilter} />
          </div>
        </>
      }
    >
      {visible.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[.02] p-6 text-center text-sm text-white/40">No events of this type yet.</p>
      ) : (
        <ol className="relative flex flex-col gap-1 border-l border-white/10 pl-5">
          {visible.map((entry) => {
            const style = logEventStyles[entry.event]
            const exists = existingIds.has(entry.announcementId)
            return (
              <li key={entry.id} className="relative py-2.5">
                <span className={`absolute -left-[25px] top-4 size-2 rounded-full ring-4 ring-[#0b0f18] bg-current ${style.text}`} />
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${style.text} ${style.bg}`}>{entry.event}</span>
                  <time dateTime={entry.timestamp} title={formatFullDate(entry.timestamp)} className="text-[11px] text-white/35">
                    {relativeTime(entry.timestamp)}
                  </time>
                </div>
                {exists ? (
                  <button
                    type="button"
                    onClick={() => onSelectAnnouncement(entry.announcementId)}
                    className="mt-1.5 text-left text-sm font-medium text-white hover:text-[#00D4FF] hover:underline"
                  >
                    {entry.announcementTitle}
                  </button>
                ) : (
                  <p className="mt-1.5 text-sm font-medium text-white/50 line-through decoration-white/30">{entry.announcementTitle}</p>
                )}
                <p className="mt-0.5 text-xs text-white/50">{entry.detail}</p>
                <p className="mt-1 text-[11px] text-white/30">by {entry.actorName}</p>
              </li>
            )
          })}
        </ol>
      )}
    </DrawerShell>
  )
}

/* ------------------------------ Read receipts drawer ------------------------------ */

function ReceiptsDrawer({
  announcement: a,
  reminded,
  onClose,
  onRemind,
  onRemindAll,
}: {
  announcement: Announcement
  reminded: Set<string>
  onClose: () => void
  onRemind: (studentId: string) => void
  onRemindAll: () => void
}) {
  const rows = a.recipients
    .map((r) => ({ ...r, student: roster.find((s) => s.id === r.studentId) }))
    .filter((r): r is typeof r & { student: NonNullable<typeof r.student> } => Boolean(r.student))
    .sort((x, y) => Number(Boolean(x.readAt)) - Number(Boolean(y.readAt)))
  const unread = rows.filter((r) => !r.readAt)
  const pendingReminders = unread.filter((r) => !reminded.has(r.studentId))
  const rateColor = readRateColor(a.readRate)

  return (
    <DrawerShell
      onClose={onClose}
      eyebrow="Read receipts"
      title={a.title}
      headerExtra={
        <div className="mt-4 rounded-xl border border-white/8 bg-black/15 p-3">
          <p className="text-sm text-white/75">
            <span className="font-semibold" style={{ color: rateColor }}>
              {a.readCount} of {a.totalRecipients}
            </span>{" "}
            recipients have read this announcement
          </p>
          <div className="mt-2">
            <ProgressBar value={a.readRate} color={rateColor} />
          </div>
          {unread.length > 0 && (
            <button
              type="button"
              onClick={onRemindAll}
              disabled={pendingReminders.length === 0}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#00D4FF]/40 bg-[#00D4FF]/10 py-2 text-xs font-semibold text-[#00D4FF] transition hover:bg-[#00D4FF]/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <BellRing className="size-3.5" />
              {pendingReminders.length === 0 ? "Reminders sent to all unread" : `Send reminder to all unread (${pendingReminders.length})`}
            </button>
          )}
        </div>
      }
    >
      <div className="overflow-hidden rounded-xl border border-white/8">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/8 text-[11px] uppercase tracking-[.1em] text-white/40">
              <th className="px-3 py-2 font-medium">Student</th>
              <th className="px-3 py-2 font-medium">Batch</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar name={r.student.name} size="size-7" />
                    <span className="text-white/85">{r.student.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-white/50">Batch {r.student.batch}</td>
                <td className="px-3 py-2.5">
                  {r.readAt ? (
                    <span className="flex flex-col">
                      <span className="flex items-center gap-1 text-xs font-medium text-[#4ADE80]">
                        <Check className="size-3.5" /> Read
                      </span>
                      <span className="text-[10px] text-white/35" title={formatFullDate(r.readAt)}>
                        {relativeTime(r.readAt)}
                      </span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-white/40">
                      <X className="size-3.5" /> Unread
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {!r.readAt &&
                    (reminded.has(r.studentId) ? (
                      <span className="text-[11px] text-white/35">Reminder sent</span>
                    ) : (
                      <button type="button" onClick={() => onRemind(r.studentId)} className={ghostBtn}>
                        <BellRing className="size-3" /> Remind
                      </button>
                    ))}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-xs text-white/40">
                  No recipients for this announcement.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DrawerShell>
  )
}

/* --------------------------------- Main page --------------------------------- */

export function NotificationsPage() {
  const [items, setItems] = useState<Announcement[]>(seedAnnouncements)
  const [log, setLog] = useState<NotificationLogEntry[]>(seedLog)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All")
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("All")
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("All")
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [composeDraft, setComposeDraft] = useState<ComposeDraft | null>(null)
  const [composeMode, setComposeMode] = useState<"new" | "edit-draft" | "edit-sent">("new")
  const [showLog, setShowLog] = useState(false)
  const [receiptsId, setReceiptsId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
  const [reminders, setReminders] = useState<Record<string, Set<string>>>({})
  const [toast, setToast] = useState<string | null>(null)

  const pinned = useMemo(() => items.filter((a) => a.isPinned), [items])

  const statusCounts = useMemo(
    () => ({
      All: items.length,
      Sent: items.filter((a) => a.status === "Sent" || a.status === "Pinned").length,
      Pinned: items.filter((a) => a.isPinned).length,
      Scheduled: items.filter((a) => a.status === "Scheduled").length,
      Drafts: items.filter((a) => a.status === "Draft").length,
    }),
    [items],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((a) => {
      if (statusFilter === "Sent" && !(a.status === "Sent" || a.status === "Pinned")) return false
      if (statusFilter === "Pinned" && !a.isPinned) return false
      if (statusFilter === "Scheduled" && a.status !== "Scheduled") return false
      if (statusFilter === "Drafts" && a.status !== "Draft") return false
      if (priorityFilter !== "All" && a.priority !== priorityFilter) return false
      if (audienceFilter !== "All" && a.targetAudience !== audienceFilter) return false
      if (q && !`${a.title} ${a.body} ${a.targetLabel}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, statusFilter, priorityFilter, audienceFilter, search])

  const summary = useMemo(() => {
    const delivered = items.filter((a) => a.status === "Sent" || a.status === "Pinned")
    const avgRead = delivered.length ? Math.round(delivered.reduce((n, a) => n + (a.readCount / Math.max(1, a.totalRecipients)) * 100, 0) / delivered.length) : 0
    const unreadUrgent = delivered.filter((a) => a.priority === "Urgent").reduce((n, a) => n + (a.totalRecipients - a.readCount), 0)
    return {
      sent: delivered.length,
      avgRead,
      pinned: pinned.length,
      scheduled: items.filter((a) => a.status === "Scheduled").length,
      unreadUrgent,
    }
  }, [items, pinned.length])

  const existingIds = useMemo(() => new Set(items.map((a) => a.id)), [items])
  const receiptsAnnouncement = receiptsId ? items.find((a) => a.id === receiptsId) ?? null : null

  function flash(message: string) {
    setToast(message)
    window.setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2800)
  }

  function addLog(a: Pick<Announcement, "id" | "title">, event: LogEvent, detail: string) {
    setLog((l) => [
      { id: uid("log"), announcementId: a.id, announcementTitle: a.title, event, timestamp: nowIso(), detail, actorName: DEFAULT_AUTHOR.name },
      ...l,
    ])
  }

  function update(id: string, fn: (a: Announcement) => Announcement) {
    setItems((list) => list.map((a) => (a.id === id ? fn(a) : a)))
  }

  function openCompose() {
    setComposeDraft(emptyDraft())
    setComposeMode("new")
  }

  function openEdit(a: Announcement) {
    setComposeDraft(announcementToDraft(a))
    setComposeMode(a.status === "Sent" || a.status === "Pinned" ? "edit-sent" : "edit-draft")
  }

  function submitCompose(intent: ComposeIntent) {
    if (!composeDraft) return
    const d = composeDraft
    const existing = items.find((a) => a.id === d.id)
    const targetIds = draftTargetIds(d)
    const targetLabel = resolveTargetLabel(d.audience, targetIds)
    const recipientsList = resolveRecipients(d.audience, targetIds)
    const now = nowIso()
    const scheduledFor = `${d.scheduleDate}T${d.scheduleTime}:00.000Z`
    const pinnedUntil = d.pin ? `${d.pinUntil}T23:59:00.000Z` : undefined

    const sameTargets =
      existing && existing.targetAudience === d.audience && existing.targetIds.join() === targetIds.join()
    const recipients =
      intent === "draft" || intent === "schedule"
        ? []
        : sameTargets && existing && existing.recipients.length > 0
          ? existing.recipients
          : recipientsList.map((s) => ({ studentId: s.id }))

    let status: AnnouncementStatus
    if (intent === "send") status = d.pin ? "Pinned" : "Sent"
    else if (intent === "schedule") status = "Scheduled"
    else if (intent === "draft") status = "Draft"
    else status = d.pin ? "Pinned" : "Sent"

    const next = withReadStats({
      id: d.id,
      title: d.title.trim(),
      body: d.body,
      authorName: d.authorName.trim() || DEFAULT_AUTHOR.name,
      authorInitials: initials(d.authorName || DEFAULT_AUTHOR.name),
      authorRole: d.authorRole.trim(),
      priority: d.priority,
      status,
      targetAudience: d.audience,
      targetLabel,
      targetIds,
      channel: d.channel,
      isPinned: (status === "Sent" || status === "Pinned") && d.pin,
      pinnedUntil: d.pin ? pinnedUntil : undefined,
      scheduledFor: intent === "schedule" ? scheduledFor : undefined,
      sentAt: intent === "send" ? now : intent === "save" ? existing?.sentAt : undefined,
      createdAt: existing?.createdAt ?? now,
      recipients,
    })

    setItems((list) => (existing ? list.map((a) => (a.id === next.id ? next : a)) : [next, ...list]))

    const via = `via ${channelLabel(d.channel)}`
    if (!existing) addLog(next, "created", `Created for ${targetLabel}`)
    if (intent === "send") {
      addLog(next, "sent", `${d.priority === "Urgent" ? "Urgent \u00b7 " : ""}Sent to ${targetLabel} ${via} (${recipientsList.length} recipients)`)
      flash(`Sent to ${recipientsList.length} ${recipientsList.length === 1 ? "student" : "students"}`)
    } else if (intent === "schedule") {
      addLog(next, "scheduled", `Scheduled for ${formatShortDate(scheduledFor)}, ${d.scheduleTime} UTC to ${targetLabel} ${via}`)
      flash("Announcement scheduled")
    } else if (intent === "draft") {
      if (existing) addLog(next, "edited", "Draft updated")
      flash("Draft saved")
    } else {
      addLog(next, "edited", "Content or delivery settings updated")
      flash("Changes saved")
    }
    if (next.isPinned && !existing?.isPinned) addLog(next, "pinned", `Pinned to student home page until ${formatShortDate(pinnedUntil!)}`)
    if (existing?.isPinned && !next.isPinned) addLog(next, "unpinned", "Removed from student home page")

    setComposeDraft(null)
  }

  function togglePin(a: Announcement) {
    if (a.isPinned) {
      update(a.id, (x) => ({ ...x, isPinned: false, pinnedUntil: undefined, status: "Sent" }))
      addLog(a, "unpinned", "Removed from student home page")
      flash("Unpinned from student home")
    } else {
      const until = `${addDays(NOW_MS, 7)}T23:59:00.000Z`
      update(a.id, (x) => ({ ...x, isPinned: true, pinnedUntil: until, status: "Pinned" }))
      addLog(a, "pinned", `Pinned to student home page until ${formatShortDate(until)}`)
      flash("Pinned to student home")
    }
  }

  function duplicate(a: Announcement) {
    const copy = withReadStats({
      ...a,
      id: uid("ann"),
      title: `${a.title} (copy)`,
      status: "Draft",
      isPinned: false,
      pinnedUntil: undefined,
      scheduledFor: undefined,
      sentAt: undefined,
      createdAt: nowIso(),
      recipients: [],
    })
    setItems((list) => [copy, ...list])
    addLog(copy, "created", `Duplicated from \u201c${a.title}\u201d`)
    flash("Duplicated as draft")
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setItems((list) => list.filter((a) => a.id !== deleteTarget.id))
    addLog(deleteTarget, "deleted", `Deleted ${deleteTarget.status.toLowerCase()} announcement`)
    if (expandedId === deleteTarget.id) setExpandedId(null)
    setDeleteTarget(null)
    flash("Announcement deleted")
  }

  function resend(a: Announcement) {
    const unread = a.recipients.filter((r) => !r.readAt).length
    update(a.id, (x) => ({ ...x, sentAt: nowIso() }))
    addLog(a, "sent", `Re-delivered to ${a.targetLabel} via ${channelLabel(a.channel)} (${a.totalRecipients} recipients)`)
    flash(`Resent \u00b7 ${unread} unread ${unread === 1 ? "recipient" : "recipients"} notified again`)
  }

  function remind(announcementId: string, studentIds: string[]) {
    if (studentIds.length === 0) return
    setReminders((m) => {
      const next = new Set(m[announcementId] ?? [])
      studentIds.forEach((id) => next.add(id))
      return { ...m, [announcementId]: next }
    })
    flash(`Reminder sent to ${studentIds.length} ${studentIds.length === 1 ? "student" : "students"}`)
  }

  function jumpToAnnouncement(id: string) {
    setShowLog(false)
    setStatusFilter("All")
    setPriorityFilter("All")
    setAudienceFilter("All")
    setSearch("")
    setExpandedId(id)
    window.requestAnimationFrame(() => document.getElementById(`ann-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }))
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
              <h1 className="text-2xl font-semibold text-white">Broadcasts &amp; announcements</h1>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Compose announcements, pin dispatches to the student home page, and track read rates across cohorts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50">
            <span className="size-1.5 rounded-full bg-[#4ADE80]" /> Data synced 2m ago
          </span>
          <button type="button" onClick={() => setShowLog(true)} className={secondaryBtn}>
            <ScrollText className="size-4" /> View log
          </button>
          <button type="button" onClick={openCompose} className={primaryBtn}>
            <Plus className="size-4" /> Compose announcement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total sent" value={String(summary.sent)} detail="Announcements delivered" icon={Send} accent="#00D4FF" />
        <StatCard label="Avg. read rate" value={`${summary.avgRead}%`} detail="Across all sent" icon={Eye} accent="#4ADE80" />
        <StatCard label="Currently pinned" value={String(summary.pinned)} detail={summary.pinned === 1 ? "Active pin" : "Active pins"} icon={Pin} accent="#A78BFA" />
        <StatCard label="Scheduled" value={String(summary.scheduled)} detail="Queued for delivery" icon={Calendar} accent="#F5B942" />
        <StatCard
          label="Unread urgent"
          value={String(summary.unreadUrgent)}
          detail={summary.unreadUrgent ? "Students yet to read" : "All urgent notices read"}
          icon={AlertTriangle}
          accent="#FB7185"
          highlight={summary.unreadUrgent > 0}
        />
      </div>

      <PinnedStrip pinned={pinned} onUnpin={togglePin} onEdit={openEdit} />

      <div>
        <SectionHeading eyebrow="All broadcasts" title="Announcement history" />

        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <FilterPillGroup options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
              className={`${selectClass} py-1.5 text-xs`}
              aria-label="Filter by priority"
            >
              <option value="All" className="bg-[#0f1420]">
                All priorities
              </option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p} className="bg-[#0f1420]">
                  {p}
                </option>
              ))}
            </select>
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value as AudienceFilter)}
              className={`${selectClass} py-1.5 text-xs`}
              aria-label="Filter by audience"
            >
              <option value="All" className="bg-[#0f1420]">
                All audiences
              </option>
              {(["All Students", "Cohort", "Batch", "Individual"] as TargetAudience[]).map((t) => (
                <option key={t} value={t} className="bg-[#0f1420]">
                  {t}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search announcements"
                aria-label="Search announcements"
                className={`${inputClass} w-56 py-1.5 pl-9 text-xs`}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {filtered.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              expanded={expandedId === a.id}
              onToggleExpand={() => setExpandedId((cur) => (cur === a.id ? null : a.id))}
              onTogglePin={() => togglePin(a)}
              onEdit={() => openEdit(a)}
              onDuplicate={() => duplicate(a)}
              onDelete={() => setDeleteTarget(a)}
              onResend={() => resend(a)}
              onViewReceipts={() => setReceiptsId(a.id)}
              events={expandedId === a.id ? log.filter((e) => e.announcementId === a.id) : []}
            />
          ))}
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[.02] p-8 text-center text-sm text-white/40">No announcements match these filters.</div>
          )}
        </div>
      </div>

      {composeDraft && (
        <ComposeModal
          draft={composeDraft}
          setDraft={(fn) => setComposeDraft((d) => (d ? fn(d) : d))}
          mode={composeMode}
          onCancel={() => setComposeDraft(null)}
          onSubmit={submitCompose}
        />
      )}

      {showLog && <LogDrawer log={log} onClose={() => setShowLog(false)} onSelectAnnouncement={jumpToAnnouncement} existingIds={existingIds} />}

      {receiptsAnnouncement && (
        <ReceiptsDrawer
          announcement={receiptsAnnouncement}
          reminded={reminders[receiptsAnnouncement.id] ?? new Set()}
          onClose={() => setReceiptsId(null)}
          onRemind={(studentId) => remind(receiptsAnnouncement.id, [studentId])}
          onRemindAll={() => {
            const done = reminders[receiptsAnnouncement.id] ?? new Set<string>()
            remind(
              receiptsAnnouncement.id,
              receiptsAnnouncement.recipients.filter((r) => !r.readAt && !done.has(r.studentId)).map((r) => r.studentId),
            )
          }}
        />
      )}

      {deleteTarget && (
        <ModalShell
          onClose={() => setDeleteTarget(null)}
          eyebrow="Confirm delete"
          title="Delete announcement?"
          footer={
            <>
              <button type="button" onClick={() => setDeleteTarget(null)} className={secondaryBtn}>
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FB7185] px-4 py-2 text-sm font-semibold text-[#1a0a0e] transition hover:bg-[#FB7185]/85"
              >
                <Trash2 className="size-4" /> Delete
              </button>
            </>
          }
        >
          <p className="text-sm leading-6 text-white/60">
            <span className="font-medium text-white">{deleteTarget.title}</span> will be removed from the history
            {deleteTarget.isPinned ? " and unpinned from the student home page" : ""}. Students who already received it keep their copy.
          </p>
        </ModalShell>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-xl border border-[#00D4FF]/30 bg-[#0f1420] px-4 py-3 text-sm text-white shadow-2xl"
        >
          <Check className="size-4 text-[#4ADE80]" /> {toast}
        </div>
      )}
    </div>
  )
}
