"use client"

import { Fragment, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CheckCircle2,
  Code2,
  Eye,
  EyeOff,
  Flag,
  Gavel,
  Lock,
  LockOpen,
  Megaphone,
  MessageSquare,
  Pin,
  PinOff,
  ScrollText,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sigma,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react"
import {
  actionMeta,
  CATEGORIES,
  communityBaseline,
  CURRENT_MODERATOR,
  findComment,
  formatFullDate,
  mapComments,
  moderationLog as seedLog,
  NOW_MS,
  relativeTime,
  severityColor,
  shortFlagReason,
  statusBadgeClass,
  threads as seedThreads,
  type DiscussionComment,
  type FlagSeverity,
  type FlagStatus,
  type ModerationAction,
  type ModerationLogEntry,
  type ModeratedThread,
  type PostAuthor,
  type ThreadCategory,
} from "@/lib/instructor-discussions"

/* --------------------------------- Constants -------------------------------- */

type Tab = "queue" | "threads" | "verified" | "log"
type SeverityFilter = "All" | FlagSeverity
type StatusFilter = "All" | FlagStatus
type LogFilter = "All" | "Flags" | "Verification" | "Locks" | "Warnings" | "Deletions" | "Replies"

const LOG_FILTERS: LogFilter[] = ["All", "Flags", "Verification", "Locks", "Warnings", "Deletions", "Replies"]
const logFilterActions: Record<Exclude<LogFilter, "All">, ModerationAction[]> = {
  Flags: ["dismissed_flag"],
  Verification: ["verified_answer", "unverified_answer"],
  Locks: ["locked_thread", "unlocked_thread"],
  Warnings: ["warned_user"],
  Deletions: ["deleted_comment"],
  Replies: ["added_instructor_reply"],
}
const severityRank: Record<FlagSeverity, number> = { High: 0, Medium: 1, Low: 2 }
/** Historical flagged posts across the full forum (used for the community health ratio). */
const HISTORICAL_FLAGGED_POSTS = 11

const SESSION_START = typeof performance !== "undefined" ? performance.now() : 0
function nowIso() {
  const elapsed = typeof performance !== "undefined" ? performance.now() - SESSION_START : 0
  return new Date(NOW_MS + elapsed).toISOString()
}
let uidCounter = 0
function uid(prefix: string) {
  uidCounter += 1
  return `${prefix}-${Date.now()}-${uidCounter}`
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00D4FF]/40"
const selectClass = "rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#00D4FF]/40"
const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-[#00D4FF]/40 hover:text-[#00D4FF] disabled:cursor-not-allowed disabled:opacity-40"
const dangerGhostBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#FB7185]/30 px-3 py-1.5 text-xs font-medium text-[#FB7185] transition hover:bg-[#FB7185]/10"
const amberGhostBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#F5B942]/30 px-3 py-1.5 text-xs font-medium text-[#F5B942] transition hover:bg-[#F5B942]/10"
const emeraldGhostBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#4ADE80]/30 px-3 py-1.5 text-xs font-medium text-[#4ADE80] transition hover:bg-[#4ADE80]/10"
const violetGhostBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#A78BFA]/30 px-3 py-1.5 text-xs font-medium text-[#A78BFA] transition hover:bg-[#A78BFA]/10"
const primaryBtn =
  "inline-flex items-center gap-1.5 rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#07101a] transition hover:bg-[#00D4FF]/85 disabled:cursor-not-allowed disabled:opacity-40"
const secondaryBtn = "inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:text-white"
const dangerBtn =
  "inline-flex items-center gap-1.5 rounded-lg bg-[#FB7185] px-4 py-2 text-sm font-semibold text-[#1a0709] transition hover:bg-[#FB7185]/85"

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
  icon: typeof Flag
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
        <span className="relative flex size-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}18`, color: accent }}>
          <Icon className="size-4" />
          {highlight && <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full" style={{ backgroundColor: accent }} />}
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

function FilterPillGroup<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
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

function StatusBadge({ status }: { status: FlagStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass[status]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

function CategoryTag({ category }: { category: ThreadCategory }) {
  return <span className="rounded-md border border-white/10 bg-white/[.04] px-2 py-0.5 text-[11px] text-white/60">{category}</span>
}

function FlagPill({ thread }: { thread: ModeratedThread }) {
  if (!thread.flagReason || !thread.highestSeverity) return null
  const color = severityColor[thread.highestSeverity]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
      style={{ borderColor: `${color}55`, backgroundColor: `${color}1a`, color }}
    >
      <Flag className="size-3" />
      {shortFlagReason[thread.flagReason]} · {thread.highestSeverity} Severity
    </span>
  )
}

function Avatar({ author, size = "size-9" }: { author: PostAuthor; size?: string }) {
  const style =
    author.role === "instructor"
      ? "bg-gradient-to-br from-[#4FD1E8] to-[#00D4FF] text-[#0A0E17]"
      : author.role === "ta"
        ? "bg-gradient-to-br from-[#A78BFA] to-[#7C5CFF] text-white"
        : "bg-gradient-to-br from-[#5B8CFF] to-[#A78BFA] text-white"
  return <span className={`flex ${size} shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${style}`}>{author.initials}</span>
}

function RoleBadge({ author }: { author: PostAuthor }) {
  if (author.role === "instructor")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#00D4FF]/40 bg-[#00D4FF]/10 px-2 py-0.5 text-[10px] font-semibold text-[#00D4FF]">
        <BadgeCheck className="size-3" />
        {author.badge ?? "Instructor"}
      </span>
    )
  if (author.role === "ta")
    return (
      <span className="rounded-full border border-[#A78BFA]/40 bg-[#A78BFA]/10 px-2 py-0.5 text-[10px] font-semibold text-[#A78BFA]">
        {author.badge ?? "TA"}
      </span>
    )
  return author.badge ? <span className="rounded-full bg-white/[.06] px-2 py-0.5 text-[10px] text-white/55">{author.badge}</span> : null
}

function AuthorLine({ author, timestamp, warnings }: { author: PostAuthor; timestamp?: string; warnings?: number }) {
  const count = warnings ?? author.previousFlagsCount
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar author={author} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-white">{author.name}</span>
          <RoleBadge author={author} />
          {author.role === "student" && count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FB7185]/10 px-2 py-0.5 text-[10px] font-medium text-[#FB7185]">
              <AlertTriangle className="size-3" />
              {count} prior {count === 1 ? "warning" : "warnings"}
            </span>
          )}
        </div>
        {timestamp && <p className="text-[11px] text-white/40">{relativeTime(timestamp, Date.parse(nowIso()))}</p>}
      </div>
    </div>
  )
}

/* ------------------------------ Rich text (code, math, bold) ------------------------------ */

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\$\$[^$]+\$\$|\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`
    if (part.startsWith("$$") && part.endsWith("$$"))
      return (
        <span key={key} className="rounded bg-[#A78BFA]/10 px-1 font-serif italic text-[#C4B5FD]">
          {part.slice(2, -2).replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)").replace(/\\(sqrt|lceil|rceil|log|rangle|langle)/g, (_, c: string) =>
            ({ sqrt: "√", lceil: "⌈", rceil: "⌉", log: "log", rangle: "⟩", langle: "⟨" })[c] ?? c,
          )}
        </span>
      )
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={key} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      )
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={key} className="rounded bg-white/10 px-1 font-mono text-[0.9em] text-[#00D4FF]">
          {part.slice(1, -1)}
        </code>
      )
    return <Fragment key={key}>{part}</Fragment>
  })
}

function RichText({ text, className = "" }: { text: string; className?: string }) {
  const segments = text.split(/```\n?([\s\S]*?)```/g)
  return (
    <div className={`flex flex-col gap-2 text-sm leading-relaxed text-white/70 ${className}`}>
      {segments.map((segment, si) => {
        if (si % 2 === 1)
          return (
            <pre key={si} className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-[#9FE8FF]">
              {segment.trimEnd()}
            </pre>
          )
        return segment
          .split(/\n{2,}/)
          .filter((b) => b.trim())
          .map((block, bi) => {
            const lines = block.split("\n").filter((l) => l.trim())
            if (lines.every((l) => l.trim().startsWith("- ")))
              return (
                <ul key={`${si}-${bi}`} className="list-disc space-y-1 pl-4">
                  {lines.map((l, li) => (
                    <li key={li}>{renderInline(l.trim().slice(2), `${si}-${bi}-${li}`)}</li>
                  ))}
                </ul>
              )
            return <p key={`${si}-${bi}`}>{renderInline(lines.join(" "), `${si}-${bi}`)}</p>
          })
      })}
    </div>
  )
}

function snippet(text: string, max = 180) {
  const plain = text.replace(/```[\s\S]*?```/g, "[code block]").replace(/\s+/g, " ").trim()
  return plain.length > max ? `${plain.slice(0, max)}…` : plain
}

/* --------------------------------- Shells --------------------------------- */

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
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

type ConfirmState = {
  title: string
  body: React.ReactNode
  confirmLabel: string
  tone: "danger" | "primary"
  onConfirm: () => void
}

/* --------------------------------- Main page --------------------------------- */

export function DiscussionsModerationPage() {
  const [threads, setThreads] = useState<ModeratedThread[]>(seedThreads)
  const [log, setLog] = useState<ModerationLogEntry[]>(seedLog)
  const [tab, setTab] = useState<Tab>("queue")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<"All" | ThreadCategory>("All")
  const [severity, setSeverity] = useState<SeverityFilter>("All")
  const [status, setStatus] = useState<StatusFilter>("All")
  const [logFilter, setLogFilter] = useState<LogFilter>("All")
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [focusComposer, setFocusComposer] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sessionResolved, setSessionResolved] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }

  const reviewThread = threads.find((t) => t.id === reviewId) ?? null

  /* ------------------------------ Mutations ------------------------------ */

  const addLog = (thread: ModeratedThread, action: ModerationAction, targetUser: string, reason: string) =>
    setLog((prev) => [
      { id: uid("log"), threadId: thread.id, threadTitle: thread.title, action, moderator: CURRENT_MODERATOR.name, targetUser, reason, timestamp: nowIso() },
      ...prev,
    ])

  const updateThread = (id: string, fn: (t: ModeratedThread) => ModeratedThread) => setThreads((prev) => prev.map((t) => (t.id === id ? fn(t) : t)))

  const incrementWarnings = (name: string) =>
    setThreads((prev) =>
      prev.map((t) => {
        const bump = (a: PostAuthor) => (a.name === name ? { ...a, previousFlagsCount: a.previousFlagsCount + 1, isFlaggedUser: true } : a)
        return { ...t, author: bump(t.author), comments: mapComments(t.comments, (c) => ({ ...c, author: bump(c.author) })) }
      }),
    )

  const markResolved = () => setSessionResolved((n) => n + 1)

  const dismissFlag = (thread: ModeratedThread) => {
    updateThread(thread.id, (t) => ({ ...t, flagStatus: "Dismissed" }))
    addLog(thread, "dismissed_flag", thread.author.name, `Flag (${thread.flagReason ? shortFlagReason[thread.flagReason] : "report"}) reviewed and dismissed.`)
    markResolved()
    showToast("Flag dismissed. Audit trail preserved.")
  }

  const warnAndDelete = (thread: ModeratedThread) => {
    updateThread(thread.id, (t) => ({
      ...t,
      content: "_This post was removed by a moderator for violating the academic integrity policy._",
      flagStatus: "Resolved",
      isLocked: true,
      moderatorNotes: `${t.moderatorNotes ?? ""}${t.moderatorNotes ? " · " : ""}Content removed and student warned by ${CURRENT_MODERATOR.name}.`,
    }))
    incrementWarnings(thread.author.name)
    addLog(thread, "deleted_comment", thread.author.name, "Original post removed. Flag record retained for audit.")
    addLog(thread, "warned_user", thread.author.name, `Warning issued for ${thread.flagReason ?? "policy violation"}.`)
    markResolved()
    showToast(`Post removed and ${thread.author.name} warned.`)
  }

  const escalate = (thread: ModeratedThread) => {
    updateThread(thread.id, (t) => ({ ...t, flagStatus: "Escalated", isLocked: true }))
    addLog(thread, "locked_thread", thread.author.name, "Escalated to Academic Integrity Office and locked.")
    showToast("Thread escalated and locked.")
  }

  const resolveFlag = (thread: ModeratedThread) => {
    updateThread(thread.id, (t) => ({ ...t, flagStatus: "Resolved" }))
    markResolved()
    showToast("Flag marked as resolved.")
  }

  const toggleLock = (thread: ModeratedThread) => {
    updateThread(thread.id, (t) => ({ ...t, isLocked: !t.isLocked }))
    addLog(thread, thread.isLocked ? "unlocked_thread" : "locked_thread", thread.author.name, thread.isLocked ? "Student replies re-enabled." : "Student replies disabled.")
    showToast(thread.isLocked ? "Thread unlocked." : "Thread locked. Students can no longer reply.")
  }

  const warnUser = (thread: ModeratedThread, name: string) => {
    incrementWarnings(name)
    addLog(thread, "warned_user", name, "Formal warning sent. Student notified via in-app notification.")
    showToast(`Warning sent to ${name}.`)
  }

  const deleteComment = (thread: ModeratedThread, comment: DiscussionComment) => {
    updateThread(thread.id, (t) => {
      const wasVerified = t.verifiedSolutionCommentId === comment.id
      return {
        ...t,
        comments: mapComments(t.comments, (c) => (c.id === comment.id ? null : c)),
        repliesCount: Math.max(0, t.repliesCount - 1),
        hasVerifiedSolution: wasVerified ? false : t.hasVerifiedSolution,
        verifiedSolutionCommentId: wasVerified ? undefined : t.verifiedSolutionCommentId,
      }
    })
    addLog(thread, "deleted_comment", comment.author.name, comment.isFlagged ? `Removed flagged reply (${comment.flagReason}).` : "Reply hidden by moderator.")
    if (comment.isFlagged) markResolved()
    showToast("Comment removed.")
  }

  const setVerified = (thread: ModeratedThread, commentId: string | null) => {
    updateThread(thread.id, (t) => ({
      ...t,
      hasVerifiedSolution: commentId !== null,
      verifiedSolutionCommentId: commentId ?? undefined,
      comments: mapComments(t.comments, (c) => ({ ...c, isVerifiedSolution: c.id === commentId })),
      flagStatus: commentId && t.flagStatus === "Pending" ? "Resolved" : t.flagStatus,
    }))
    const target = commentId ? findComment(thread.comments, commentId) : null
    addLog(
      thread,
      commentId ? "verified_answer" : "unverified_answer",
      target?.author.name ?? thread.author.name,
      commentId ? "Reply pinned as Verified Solution." : "Verified Solution removed.",
    )
    if (commentId && thread.flagStatus === "Pending") markResolved()
    showToast(commentId ? "Pinned as Verified Solution." : "Verified Solution unpinned.")
  }

  const postReply = (thread: ModeratedThread, content: string, verified: boolean) => {
    const newComment: DiscussionComment = {
      id: uid("c"),
      author: CURRENT_MODERATOR,
      content,
      timestamp: nowIso(),
      upvotes: 0,
      isVerifiedSolution: verified,
      isInstructorPost: true,
      isFlagged: false,
    }
    updateThread(thread.id, (t) => ({
      ...t,
      repliesCount: t.repliesCount + 1,
      comments: verified ? [newComment, ...mapComments(t.comments, (c) => ({ ...c, isVerifiedSolution: false }))] : [...t.comments, newComment],
      hasVerifiedSolution: verified || t.hasVerifiedSolution,
      verifiedSolutionCommentId: verified ? newComment.id : t.verifiedSolutionCommentId,
      flagStatus: verified && t.flagStatus === "Pending" ? "Resolved" : t.flagStatus,
    }))
    addLog(thread, "added_instructor_reply", thread.author.name, "Official instructor response posted.")
    if (verified) {
      setLog((prev) => [
        {
          id: uid("log"),
          threadId: thread.id,
          threadTitle: thread.title,
          action: "verified_answer",
          moderator: CURRENT_MODERATOR.name,
          targetUser: thread.author.name,
          reason: "Instructor response pinned as Verified Solution.",
          timestamp: nowIso(),
        },
        ...prev,
      ])
      if (thread.flagStatus === "Pending") markResolved()
    }
    showToast(verified ? "Response posted and pinned as Verified Solution." : "Official response posted.")
  }

  const createBroadcast = (title: string, content: string, cat: ThreadCategory, lockReplies: boolean) => {
    const thread: ModeratedThread = {
      id: uid("th"),
      title,
      author: CURRENT_MODERATOR,
      category: cat,
      tags: ["Official", "Announcement"],
      timestamp: nowIso(),
      content,
      upvotes: 0,
      repliesCount: 0,
      isLocked: lockReplies,
      isPinned: true,
      hasVerifiedSolution: false,
      flagCount: 0,
      flagStatus: "Resolved",
      comments: [],
    }
    setThreads((prev) => [thread, ...prev])
    addLog(thread, "added_instructor_reply", "All students", "Official broadcast thread published and pinned.")
    setBroadcastOpen(false)
    setTab("threads")
    showToast("Broadcast thread published and pinned for all students.")
  }

  /* ------------------------------ Confirmations ------------------------------ */

  const askDismiss = (thread: ModeratedThread) =>
    setConfirm({
      title: "Dismiss this flag?",
      tone: "primary",
      confirmLabel: "Dismiss Flag",
      body: (
        <p className="text-sm text-white/60">
          The thread <span className="text-white">&ldquo;{thread.title}&rdquo;</span> will stay visible and the reporter will be notified that no action
          was taken. The original report is kept in the audit log.
        </p>
      ),
      onConfirm: () => dismissFlag(thread),
    })

  const askWarnDelete = (thread: ModeratedThread) =>
    setConfirm({
      title: "Warn student & remove post?",
      tone: "danger",
      confirmLabel: "Warn & Delete",
      body: (
        <div className="flex flex-col gap-3 text-sm text-white/60">
          <p>
            This removes the post content, locks the thread, and sends a formal warning to{" "}
            <span className="text-white">{thread.author.name}</span>.
          </p>
          {thread.author.previousFlagsCount > 0 && (
            <p className="rounded-lg border border-[#FB7185]/30 bg-[#FB7185]/10 p-3 text-xs text-[#FB7185]">
              This student already has {thread.author.previousFlagsCount} prior {thread.author.previousFlagsCount === 1 ? "warning" : "warnings"}. A
              further warning may trigger an integrity review.
            </p>
          )}
        </div>
      ),
      onConfirm: () => warnAndDelete(thread),
    })

  const openReview = (id: string, composer = false) => {
    setReviewId(id)
    setFocusComposer(composer)
  }

  /* ------------------------------ Derived data ------------------------------ */

  const pending = threads.filter((t) => t.flagStatus === "Pending")
  const pendingHigh = pending.filter((t) => t.highestSeverity === "High").length
  const verifiedThreads = threads.filter((t) => t.hasVerifiedSolution && t.verifiedSolutionCommentId)
  const totalPosts = communityBaseline.totalPosts + threads.length - seedThreads.length
  const flaggedRate = (HISTORICAL_FLAGGED_POSTS / totalPosts) * 100

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return threads.filter((t) => {
      if (category !== "All" && t.category !== category) return false
      if (severity !== "All" && t.highestSeverity !== severity) return false
      if (status !== "All" && t.flagStatus !== status) return false
      if (!q) return true
      return [t.title, t.author.name, t.flagReason ?? "", t.reportedBy ?? "", t.moderatorNotes ?? "", ...t.tags].some((f) => f.toLowerCase().includes(q))
    })
  }, [threads, search, category, severity, status])

  const queue = filtered
    .filter((t) => t.flagStatus === "Pending")
    .sort((a, b) => severityRank[a.highestSeverity ?? "Low"] - severityRank[b.highestSeverity ?? "Low"])

  const filteredLog = logFilter === "All" ? log : log.filter((e) => logFilterActions[logFilter].includes(e.action))

  const tabs: { id: Tab; label: string; count: number; icon: typeof Flag }[] = [
    { id: "queue", label: "Flagged & Reported Queue", count: pending.length, icon: ShieldAlert },
    { id: "threads", label: "All Community Threads", count: threads.length, icon: MessageSquare },
    { id: "verified", label: "Verified Solutions Repository", count: verifiedThreads.length, icon: BadgeCheck },
    { id: "log", label: "Moderation Audit Log", count: log.length, icon: ScrollText },
  ]

  const hasActiveFilters = search || category !== "All" || severity !== "All" || status !== "All"
  const resetFilters = () => {
    setSearch("")
    setCategory("All")
    setSeverity("All")
    setStatus("All")
  }

  return (
    <>
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/30 bg-[#00D4FF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.2em] text-[#00D4FF]">
            <ShieldCheck className="size-3.5" />
            Community & Moderation
          </span>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">Forum Moderation & Knowledge Hub</h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-white/55">
            Review flagged discussions, uphold academic integrity, and pin verified faculty solutions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryBtn} onClick={() => setSettingsOpen(true)}>
            <Settings2 className="size-4" />
            Moderation Settings & Auto-Filters
          </button>
          <button type="button" className={primaryBtn} onClick={() => setBroadcastOpen(true)}>
            <Megaphone className="size-4" />
            New Instructor Broadcast Thread
          </button>
        </div>
      </header>

      {/* Metrics */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Moderation metrics">
        <StatCard
          label="Pending flags"
          value={String(pending.length)}
          detail={pending.length ? `${pendingHigh} High severity · ${pending.length - pendingHigh} Medium/Low` : "Queue is clear"}
          icon={ShieldAlert}
          accent={pendingHigh ? "#FB7185" : "#F5B942"}
          highlight={pending.length > 0}
        />
        <StatCard
          label="Flagged rate"
          value={`${flaggedRate.toFixed(1)}%`}
          detail={`of all posts · ${(100 - flaggedRate).toFixed(1)}% clean community`}
          icon={Flag}
          accent="#00D4FF"
        />
        <StatCard
          label="Verified answers"
          value={String(communityBaseline.verifiedAnswersElsewhere + verifiedThreads.length)}
          detail="Faculty solutions pinned across modules"
          icon={BadgeCheck}
          accent="#4ADE80"
        />
        <StatCard
          label="Resolved this week"
          value={String(communityBaseline.resolvedThisWeekBaseline + sessionResolved)}
          detail="Flagged items cleared / reviewed"
          icon={CheckCircle2}
          accent="#A78BFA"
        />
      </section>

      {/* Tabs */}
      <nav className="mt-10 flex gap-1 overflow-x-auto border-b border-white/10" role="tablist" aria-label="Moderation views">
        {tabs.map(({ id, label, count, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm transition ${
              tab === id ? "border-[#00D4FF] text-white" : "border-transparent text-white/45 hover:text-white/80"
            }`}
          >
            <Icon className="size-4" />
            {label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                id === "queue" && count > 0 ? "bg-[#FB7185]/15 text-[#FB7185]" : tab === id ? "bg-[#00D4FF]/15 text-[#00D4FF]" : "bg-white/10 text-white/50"
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </nav>

      {/* Filters */}
      {(tab === "queue" || tab === "threads") && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search threads</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by thread title, student name, or flag keyword"
              className={`${inputClass} pl-9`}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Category" className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select aria-label="Flag severity" className={selectClass} value={severity} onChange={(e) => setSeverity(e.target.value as SeverityFilter)}>
              <option value="All">All Severities</option>
              <option value="High">High / Urgent</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            {tab === "threads" && (
              <select aria-label="Status" className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
                <option value="All">All</option>
                <option value="Pending">Pending Review</option>
                <option value="Resolved">Resolved</option>
                <option value="Escalated">Escalated</option>
                <option value="Dismissed">Dismissed</option>
              </select>
            )}
            {hasActiveFilters && (
              <button type="button" className={ghostBtn} onClick={resetFilters}>
                <X className="size-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <section className="mt-6" role="tabpanel">
        {tab === "queue" && (
          <>
            <SectionHeading eyebrow="Needs review" title="Flagged & reported discussions">
              <p className="text-xs text-white/40">Sorted by severity · highest risk first</p>
            </SectionHeading>
            {queue.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title={hasActiveFilters ? "No flags match these filters" : "The moderation queue is clear"}
                detail={hasActiveFilters ? "Try clearing the filters above." : "New student reports will appear here as they come in."}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {queue.map((thread) => (
                  <FlagCard
                    key={thread.id}
                    thread={thread}
                    onReview={() => openReview(thread.id)}
                    onDismiss={() => askDismiss(thread)}
                    onWarnDelete={() => askWarnDelete(thread)}
                    onPin={() => openReview(thread.id, true)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "threads" && <ThreadDirectory threads={filtered} onReview={(id) => openReview(id)} />}

        {tab === "verified" && (
          <VerifiedRepository threads={verifiedThreads} onReview={(id) => openReview(id)} onUnpin={(t) => setVerified(t, null)} />
        )}

        {tab === "log" && (
          <>
            <SectionHeading eyebrow="Accountability" title="Moderation audit log">
              <FilterPillGroup options={LOG_FILTERS} value={logFilter} onChange={setLogFilter} />
            </SectionHeading>
            <AuditLog entries={filteredLog} onOpenThread={(id) => threads.some((t) => t.id === id) && openReview(id)} />
          </>
        )}
      </section>

      {reviewThread && (
        <ReviewDrawer
          key={reviewThread.id}
          thread={reviewThread}
          autoFocusComposer={focusComposer}
          onClose={() => setReviewId(null)}
          onDismiss={() => askDismiss(reviewThread)}
          onWarnDelete={() => askWarnDelete(reviewThread)}
          onEscalate={() => escalate(reviewThread)}
          onResolve={() => resolveFlag(reviewThread)}
          onToggleLock={() => toggleLock(reviewThread)}
          onWarnUser={(name) => warnUser(reviewThread, name)}
          onDeleteComment={(c) =>
            setConfirm({
              title: "Hide this comment?",
              tone: "danger",
              confirmLabel: "Delete Comment",
              body: (
                <div className="flex flex-col gap-3 text-sm text-white/60">
                  <p>
                    The reply by <span className="text-white">{c.author.name}</span> will be removed from the thread. This action is recorded in the audit log.
                  </p>
                  <blockquote className="rounded-lg border-l-2 border-white/20 bg-black/20 p-3 text-xs text-white/50">{snippet(c.content, 160)}</blockquote>
                </div>
              ),
              onConfirm: () => deleteComment(reviewThread, c),
            })
          }
          onSetVerified={(id) => setVerified(reviewThread, id)}
          onPostReply={(content, verified) => postReply(reviewThread, content, verified)}
        />
      )}

      {confirm && (
        <ModalShell
          eyebrow="Confirm action"
          title={confirm.title}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" className={secondaryBtn} onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={confirm.tone === "danger" ? dangerBtn : primaryBtn}
                onClick={() => {
                  confirm.onConfirm()
                  setConfirm(null)
                }}
              >
                {confirm.confirmLabel}
              </button>
            </>
          }
        >
          {confirm.body}
        </ModalShell>
      )}

      {broadcastOpen && <BroadcastModal onClose={() => setBroadcastOpen(false)} onPublish={createBroadcast} />}
      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onSave={() => {
            setSettingsOpen(false)
            showToast("Moderation settings saved.")
          }}
        />
      )}

      <div aria-live="polite" className="pointer-events-none fixed bottom-6 right-6 z-[70]">
        {toast && (
          <div className="flex items-center gap-2 rounded-xl border border-[#4ADE80]/30 bg-[#0f1420] px-4 py-3 text-sm text-white shadow-2xl">
            <Check className="size-4 text-[#4ADE80]" />
            {toast}
          </div>
        )}
      </div>
    </>
  )
}

/* --------------------------------- Empty state --------------------------------- */

function EmptyState({ icon: Icon, title, detail }: { icon: typeof Flag; title: string; detail: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-[#4ADE80]/10 text-[#4ADE80]">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs text-white/45">{detail}</p>
    </div>
  )
}

/* --------------------------------- Flag card --------------------------------- */

function FlagCard({
  thread,
  onReview,
  onDismiss,
  onWarnDelete,
  onPin,
}: {
  thread: ModeratedThread
  onReview: () => void
  onDismiss: () => void
  onWarnDelete: () => void
  onPin: () => void
}) {
  const color = thread.highestSeverity ? severityColor[thread.highestSeverity] : "#00D4FF"
  const severe = thread.highestSeverity === "High"
  const flaggedComment = thread.comments.find((c) => c.isFlagged)

  return (
    <article
      className="relative overflow-hidden rounded-2xl border bg-white/[.035] p-5 pl-6 transition hover:border-white/20"
      style={{ borderColor: severe ? `${color}40` : "rgba(255,255,255,.1)" }}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} aria-hidden />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryTag category={thread.category} />
            <FlagPill thread={thread} />
            {thread.flagCount > 1 && <span className="text-[11px] text-white/40">{thread.flagCount} reports</span>}
          </div>
          <h3 className="mt-3 text-pretty text-base font-semibold text-white">{thread.title}</h3>
        </div>
        <StatusBadge status={thread.flagStatus} />
      </div>

      <div className="mt-4">
        <AuthorLine author={thread.author} timestamp={thread.timestamp} />
      </div>

      <blockquote className="mt-4 rounded-xl border-l-2 bg-black/25 p-4 text-sm text-white/65" style={{ borderColor: color }}>
        <p className="text-[11px] uppercase tracking-[.14em] text-white/35">{flaggedComment ? "Flagged reply" : "Flagged content"}</p>
        <p className="mt-1.5 leading-relaxed">{snippet(flaggedComment?.content ?? thread.content)}</p>
      </blockquote>

      {thread.moderatorNotes && (
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-white/55">
          <Flag className="mt-0.5 size-3.5 shrink-0" style={{ color }} />
          <span>
            <span className="text-white/75">Reporter note:</span> &ldquo;{thread.moderatorNotes}&rdquo;
          </span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-[11px] text-white/40">
          Reported by <span className="text-white/65">{thread.reportedBy}</span>
          {thread.flagReportedAt && ` · ${relativeTime(thread.flagReportedAt)}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={ghostBtn} onClick={onReview}>
            <Eye className="size-3.5" />
            Review Thread
          </button>
          <button type="button" className={ghostBtn} onClick={onDismiss}>
            <X className="size-3.5" />
            Dismiss Flag
          </button>
          {severe && (
            <button type="button" className={dangerGhostBtn} onClick={onWarnDelete}>
              <Trash2 className="size-3.5" />
              Quick Warn & Delete
            </button>
          )}
          <button type="button" className={emeraldGhostBtn} onClick={onPin}>
            <BadgeCheck className="size-3.5" />
            Pin Verified Answer
          </button>
        </div>
      </div>
    </article>
  )
}

/* --------------------------------- Directory --------------------------------- */

function ThreadDirectory({ threads, onReview }: { threads: ModeratedThread[]; onReview: (id: string) => void }) {
  return (
    <>
      <SectionHeading eyebrow="Directory" title="All community threads">
        <p className="text-xs text-white/40">{threads.length} shown</p>
      </SectionHeading>
      {threads.length === 0 ? (
        <EmptyState icon={Search} title="No threads match these filters" detail="Adjust the search or filters above." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[.025]">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-white/10 text-[11px] uppercase tracking-[.14em] text-white/40">
              <tr>
                <th className="px-5 py-3 font-medium">Thread</th>
                <th className="px-3 py-3 font-medium">Author</th>
                <th className="px-3 py-3 font-medium">Engagement</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.06]">
              {threads.map((t) => (
                <tr key={t.id} className="transition hover:bg-white/[.03]">
                  <td className="max-w-sm px-5 py-4">
                    <button type="button" onClick={() => onReview(t.id)} className="text-left font-medium text-white hover:text-[#00D4FF]">
                      {t.title}
                    </button>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <CategoryTag category={t.category} />
                      {t.isPinned && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#00D4FF]">
                          <Pin className="size-3" />
                          Pinned
                        </span>
                      )}
                      {t.isLocked && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#A78BFA]">
                          <Lock className="size-3" />
                          Locked
                        </span>
                      )}
                      {t.hasVerifiedSolution && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#4ADE80]">
                          <BadgeCheck className="size-3" />
                          Verified
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <Avatar author={t.author} size="size-7" />
                      <div>
                        <p className="text-xs text-white/80">{t.author.name}</p>
                        <p className="text-[11px] text-white/40">{t.author.badge}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-xs text-white/55">
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="size-3" />
                      {t.upvotes}
                    </span>
                    <span className="ml-3 inline-flex items-center gap-1">
                      <MessageSquare className="size-3" />
                      {t.repliesCount}
                    </span>
                    <p className="mt-1 text-[11px] text-white/35">{relativeTime(t.timestamp)}</p>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-col items-start gap-1.5">
                      <StatusBadge status={t.flagStatus} />
                      {t.highestSeverity && t.flagStatus !== "Resolved" && t.flagStatus !== "Dismissed" && (
                        <span className="text-[11px]" style={{ color: severityColor[t.highestSeverity] }}>
                          {t.highestSeverity} severity
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button type="button" className={ghostBtn} onClick={() => onReview(t.id)}>
                      <Eye className="size-3.5" />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

/* ------------------------------ Verified repository ------------------------------ */

function VerifiedCallout({ comment, compact = false }: { comment: DiscussionComment; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-[#F5B942]/40 bg-gradient-to-br from-[#F5B942]/[.08] via-transparent to-[#4ADE80]/[.08] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4ADE80]/40 bg-[#4ADE80]/10 px-2.5 py-1 text-[11px] font-semibold text-[#4ADE80]">
          <Check className="size-3.5" />
          Verified by Instructor
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-white/45">
          <ThumbsUp className="size-3" />
          {comment.upvotes}
        </span>
      </div>
      <div className="mt-3">
        <AuthorLine author={comment.author} timestamp={comment.timestamp} />
      </div>
      <RichText text={compact ? snippet(comment.content, 260) : comment.content} className="mt-3" />
    </div>
  )
}

function VerifiedRepository({
  threads,
  onReview,
  onUnpin,
}: {
  threads: ModeratedThread[]
  onReview: (id: string) => void
  onUnpin: (t: ModeratedThread) => void
}) {
  return (
    <>
      <SectionHeading eyebrow="Knowledge hub" title="Verified solutions repository">
        <p className="text-xs text-white/40">Faculty-certified benchmark answers students can trust</p>
      </SectionHeading>
      {threads.length === 0 ? (
        <EmptyState icon={BadgeCheck} title="No verified solutions yet" detail="Pin an instructor reply from any thread to add it here." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {threads.map((t) => {
            const answer = findComment(t.comments, t.verifiedSolutionCommentId!)
            if (!answer) return null
            return (
              <article key={t.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/[.035] p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryTag category={t.category} />
                  {t.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[11px] text-white/40">
                      #{tag}
                    </span>
                  ))}
                </div>
                <h3 className="mt-3 text-pretty text-base font-semibold text-white">{t.title}</h3>
                <p className="mt-1 text-xs text-white/45">
                  Asked by {t.author.name} · {t.upvotes} upvotes · {t.repliesCount} replies
                </p>
                <div className="mt-4 flex-1">
                  <VerifiedCallout comment={answer} compact />
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button type="button" className={amberGhostBtn} onClick={() => onUnpin(t)}>
                    <PinOff className="size-3.5" />
                    Unpin
                  </button>
                  <button type="button" className={ghostBtn} onClick={() => onReview(t.id)}>
                    <Eye className="size-3.5" />
                    Open Thread
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}

/* --------------------------------- Audit log --------------------------------- */

function AuditLog({ entries, onOpenThread }: { entries: ModerationLogEntry[]; onOpenThread: (id: string) => void }) {
  if (entries.length === 0) return <EmptyState icon={ScrollText} title="No log entries" detail="Try a different filter." />
  return (
    <ol className="relative flex flex-col gap-3">
      {entries.map((entry) => {
        const meta = actionMeta[entry.action]
        return (
          <li key={entry.id} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-4">
            <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>
              <Gavel className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-white">
                  <span className="font-medium" style={{ color: meta.color }}>
                    {meta.label}
                  </span>{" "}
                  <span className="text-white/45">by</span> {entry.moderator}
                  <span className="text-white/45"> · target:</span> {entry.targetUser}
                </p>
                <time className="text-[11px] text-white/40" dateTime={entry.timestamp}>
                  {formatFullDate(entry.timestamp)} · {relativeTime(entry.timestamp, Date.parse(nowIso()))}
                </time>
              </div>
              <button type="button" onClick={() => onOpenThread(entry.threadId)} className="mt-1 truncate text-left text-xs text-[#00D4FF]/80 hover:text-[#00D4FF]">
                {entry.threadTitle}
              </button>
              <p className="mt-1 text-xs text-white/50">{entry.reason}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* --------------------------------- Review drawer --------------------------------- */

function ReviewDrawer({
  thread,
  autoFocusComposer,
  onClose,
  onDismiss,
  onWarnDelete,
  onEscalate,
  onResolve,
  onToggleLock,
  onWarnUser,
  onDeleteComment,
  onSetVerified,
  onPostReply,
}: {
  thread: ModeratedThread
  autoFocusComposer: boolean
  onClose: () => void
  onDismiss: () => void
  onWarnDelete: () => void
  onEscalate: () => void
  onResolve: () => void
  onToggleLock: () => void
  onWarnUser: (name: string) => void
  onDeleteComment: (c: DiscussionComment) => void
  onSetVerified: (id: string | null) => void
  onPostReply: (content: string, verified: boolean) => void
}) {
  const composerRef = useRef<HTMLDivElement>(null)
  const verified = thread.verifiedSolutionCommentId ? findComment(thread.comments, thread.verifiedSolutionCommentId) : undefined
  const chain = thread.comments.filter((c) => c.id !== verified?.id)
  const isFlagOpen = thread.flagStatus === "Pending" || thread.flagStatus === "Escalated"
  const scrollToComposer = () => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={thread.title}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#0b0f18] shadow-2xl">
        <div className="border-b border-white/10 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs uppercase tracking-[.16em] text-[#00D4FF]">Thread review</p>
                <StatusBadge status={thread.flagStatus} />
                {thread.isLocked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#A78BFA]/15 px-2 py-0.5 text-[11px] text-[#A78BFA]">
                    <Lock className="size-3" />
                    Locked
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-pretty text-lg font-semibold text-white">{thread.title}</h3>
            </div>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-white/40 hover:text-white" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>

          {/* Moderator toolbar */}
          <div className="mt-4 flex flex-wrap gap-2" role="toolbar" aria-label="Moderator actions">
            <button type="button" className={violetGhostBtn} onClick={onToggleLock}>
              {thread.isLocked ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
              {thread.isLocked ? "Unlock Thread" : "Lock Thread"}
            </button>
            {thread.author.role === "student" && (
              <button type="button" className={amberGhostBtn} onClick={() => onWarnUser(thread.author.name)}>
                <AlertTriangle className="size-3.5" />
                Issue Student Warning
              </button>
            )}
            <button type="button" className={ghostBtn} onClick={scrollToComposer}>
              <MessageSquare className="size-3.5" />
              Post Official Instructor Response
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {/* Flag inspection */}
          {thread.flagReason && (
            <section
              className="mb-6 rounded-xl border p-4"
              style={{
                borderColor: `${severityColor[thread.highestSeverity ?? "Low"]}40`,
                backgroundColor: `${severityColor[thread.highestSeverity ?? "Low"]}0d`,
              }}
              aria-label="Flag inspection"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium text-white">
                  <ShieldAlert className="size-4" style={{ color: severityColor[thread.highestSeverity ?? "Low"] }} />
                  Flag inspection
                </p>
                <FlagPill thread={thread} />
              </div>
              <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-white/40">Reported by</dt>
                  <dd className="mt-0.5 text-white/80">{thread.reportedBy}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Reported</dt>
                  <dd className="mt-0.5 text-white/80">{thread.flagReportedAt ? formatFullDate(thread.flagReportedAt) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Category</dt>
                  <dd className="mt-0.5 text-white/80">{thread.flagReason}</dd>
                </div>
              </dl>
              {thread.moderatorNotes && (
                <blockquote className="mt-3 rounded-lg bg-black/25 p-3 text-xs italic leading-relaxed text-white/65">&ldquo;{thread.moderatorNotes}&rdquo;</blockquote>
              )}
              {isFlagOpen && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className={ghostBtn} onClick={onDismiss}>
                    <X className="size-3.5" />
                    Dismiss Flag
                  </button>
                  <button type="button" className={emeraldGhostBtn} onClick={onResolve}>
                    <Check className="size-3.5" />
                    Mark Resolved
                  </button>
                  {thread.flagStatus !== "Escalated" && (
                    <button type="button" className={amberGhostBtn} onClick={onEscalate}>
                      <Gavel className="size-3.5" />
                      Escalate to Integrity Office
                    </button>
                  )}
                  {thread.author.role === "student" && (
                    <button type="button" className={dangerGhostBtn} onClick={onWarnDelete}>
                      <Trash2 className="size-3.5" />
                      Warn & Delete Post
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Verified solution */}
          {verified && (
            <section className="mb-6" aria-label="Verified solution">
              <VerifiedCallout comment={verified} />
              <div className="mt-2 flex justify-end">
                <button type="button" className={amberGhostBtn} onClick={() => onSetVerified(null)}>
                  <PinOff className="size-3.5" />
                  Unpin Verified Solution
                </button>
              </div>
            </section>
          )}

          {/* Original post */}
          <article className="rounded-xl border border-white/10 bg-white/[.03] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AuthorLine author={thread.author} timestamp={thread.timestamp} />
              <span className="inline-flex items-center gap-1 text-xs text-white/50">
                <ThumbsUp className="size-3.5" />
                {thread.upvotes}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <CategoryTag category={thread.category} />
              {thread.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-white/[.04] px-2 py-0.5 text-[11px] text-white/45">
                  #{tag}
                </span>
              ))}
            </div>
            <RichText text={thread.content} className="mt-4" />
          </article>

          {/* Comments */}
          <section className="mt-6" aria-label="Replies">
            <p className="mb-3 text-xs uppercase tracking-[.16em] text-white/40">
              Replies · {thread.repliesCount}
            </p>
            {chain.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/40">No other replies yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {chain.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    onPin={(id) => onSetVerified(id)}
                    onDelete={onDeleteComment}
                    onWarn={onWarnUser}
                  />
                ))}
              </div>
            )}
          </section>

          <div ref={composerRef} className="mt-6 scroll-mt-6">
            <InstructorComposer
              autoFocus={autoFocusComposer}
              defaultVerified={autoFocusComposer}
              locked={thread.isLocked}
              onSubmit={onPostReply}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function CommentItem({
  comment,
  depth = 0,
  onPin,
  onDelete,
  onWarn,
}: {
  comment: DiscussionComment
  depth?: number
  onPin: (id: string) => void
  onDelete: (c: DiscussionComment) => void
  onWarn: (name: string) => void
}) {
  const border = comment.isFlagged ? "border-[#FB7185]/40" : comment.isInstructorPost ? "border-[#00D4FF]/30" : "border-white/10"
  const bg = comment.isFlagged ? "bg-[#FB7185]/[.05]" : comment.isInstructorPost ? "bg-[#00D4FF]/[.04]" : "bg-white/[.02]"
  return (
    <div className={depth > 0 ? "ml-6 border-l border-white/10 pl-4" : ""}>
      <div className={`rounded-xl border ${border} ${bg} p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AuthorLine author={comment.author} timestamp={comment.timestamp} />
          <span className="inline-flex items-center gap-1 text-xs text-white/45">
            <ThumbsUp className="size-3" />
            {comment.upvotes}
          </span>
        </div>
        {comment.isFlagged && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#FB7185]">
            <Flag className="size-3" />
            Flagged: {comment.flagReason}
            {comment.flagReportedBy && ` · by ${comment.flagReportedBy}`}
            {comment.flagNote && ` — "${comment.flagNote}"`}
          </p>
        )}
        <RichText text={comment.content} className="mt-3" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button type="button" className={emeraldGhostBtn} onClick={() => onPin(comment.id)}>
            <BadgeCheck className="size-3.5" />
            Pin as Verified Solution
          </button>
          <button type="button" className={dangerGhostBtn} onClick={() => onDelete(comment)}>
            <EyeOff className="size-3.5" />
            Hide / Delete
          </button>
          {comment.author.role === "student" && (
            <button type="button" className={amberGhostBtn} onClick={() => onWarn(comment.author.name)}>
              <AlertTriangle className="size-3.5" />
              Warn
            </button>
          )}
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {comment.replies.map((r) => (
            <CommentItem key={r.id} comment={r} depth={depth + 1} onPin={onPin} onDelete={onDelete} onWarn={onWarn} />
          ))}
        </div>
      )}
    </div>
  )
}

function InstructorComposer({
  autoFocus,
  defaultVerified,
  locked,
  onSubmit,
}: {
  autoFocus: boolean
  defaultVerified: boolean
  locked: boolean
  onSubmit: (content: string, verified: boolean) => void
}) {
  const [text, setText] = useState("")
  const [verified, setVerified] = useState(defaultVerified)
  const [preview, setPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insert = (snippetText: string) => {
    const el = textareaRef.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const next = text.slice(0, start) + snippetText + text.slice(end)
    setText(next)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + snippetText.length, start + snippetText.length)
    })
  }

  return (
    <section className="rounded-xl border border-[#00D4FF]/30 bg-[#00D4FF]/[.04] p-4" aria-label="Official instructor response">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-white">
          <BadgeCheck className="size-4 text-[#00D4FF]" />
          Post official instructor response
        </p>
        <div className="flex gap-1.5">
          <button type="button" className={ghostBtn} onClick={() => insert("$$ \\langle \\psi | \\phi \\rangle $$")} aria-label="Insert LaTeX">
            <Sigma className="size-3.5" />
            LaTeX
          </button>
          <button type="button" className={ghostBtn} onClick={() => insert("\n```\n# code\n```\n")} aria-label="Insert code block">
            <Code2 className="size-3.5" />
            Code
          </button>
          <button type="button" className={ghostBtn} aria-pressed={preview} onClick={() => setPreview((p) => !p)}>
            <Eye className="size-3.5" />
            {preview ? "Edit" : "Preview"}
          </button>
        </div>
      </div>
      {locked && <p className="mt-2 text-[11px] text-[#A78BFA]">Thread is locked for students. Faculty can still reply.</p>}
      {preview ? (
        <div className="mt-3 min-h-28 rounded-lg border border-white/10 bg-black/20 p-3">
          {text.trim() ? <RichText text={text} /> : <p className="text-sm text-white/35">Nothing to preview yet.</p>}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a clear, authoritative explanation. Supports **bold**, `inline code`, $$LaTeX$$ and ``` code blocks."
          className={`${inputClass} mt-3 min-h-28 resize-y font-mono text-[13px]`}
          aria-label="Response content"
        />
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
          <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="size-4 accent-[#4ADE80]" />
          Mark as Verified Answer
        </label>
        <button
          type="button"
          className={primaryBtn}
          disabled={!text.trim()}
          onClick={() => {
            onSubmit(text.trim(), verified)
            setText("")
            setPreview(false)
          }}
        >
          {verified ? <BadgeCheck className="size-4" /> : <MessageSquare className="size-4" />}
          {verified ? "Post & Pin as Verified" : "Post Response"}
        </button>
      </div>
    </section>
  )
}

/* --------------------------------- Modals --------------------------------- */

function BroadcastModal({
  onClose,
  onPublish,
}: {
  onClose: () => void
  onPublish: (title: string, content: string, category: ThreadCategory, lockReplies: boolean) => void
}) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [cat, setCat] = useState<ThreadCategory>("General")
  const [lockReplies, setLockReplies] = useState(false)
  const valid = title.trim().length > 3 && content.trim().length > 10

  return (
    <ModalShell
      eyebrow="Official discussion"
      title="New instructor broadcast thread"
      maxWidth="max-w-xl"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={primaryBtn} disabled={!valid} onClick={() => onPublish(title.trim(), content.trim(), cat, lockReplies)}>
            <Megaphone className="size-4" />
            Publish & Pin
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50">Thread title</span>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Office hours: debugging Grover oracles" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50">Category</span>
          <select className={selectClass} value={cat} onChange={(e) => setCat(e.target.value as ThreadCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50">Message</span>
          <textarea
            className={`${inputClass} min-h-32 resize-y`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share guidance, clarifications, or a discussion prompt for the whole cohort."
          />
        </label>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/15 p-3">
          <div>
            <p className="text-sm text-white">Read-only announcement</p>
            <p className="text-[11px] text-white/40">Lock replies so students can only read and upvote.</p>
          </div>
          <Toggle checked={lockReplies} onChange={setLockReplies} label="Lock replies" />
        </div>
        <p className="flex items-center gap-2 text-[11px] text-white/45">
          <Pin className="size-3.5 text-[#00D4FF]" />
          Broadcasts are pinned to the top of the student Community Lab with a Verified Faculty badge.
        </p>
      </div>
    </ModalShell>
  )
}

function SettingsModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [settings, setSettings] = useState({
    contestCodeGuard: true,
    aiDetection: true,
    profanity: true,
    newUserReview: false,
    notifyHigh: true,
  })
  const [threshold, setThreshold] = useState(2)
  const rows: { key: keyof typeof settings; title: string; detail: string }[] = [
    { key: "contestCodeGuard", title: "Contest code guard", detail: "Auto-hide posts containing full code blocks while a graded challenge is live." },
    { key: "aiDetection", title: "AI / low-effort detection", detail: "Flag replies that look like unedited chatbot output for review." },
    { key: "profanity", title: "Civility filter", detail: "Automatically hold posts with harassment or slurs." },
    { key: "newUserReview", title: "First-post review", detail: "Queue a student's first post for approval before it goes live." },
    { key: "notifyHigh", title: "Urgent flag alerts", detail: "Notify faculty immediately when a High severity flag is raised." },
  ]

  return (
    <ModalShell
      eyebrow="Configuration"
      title="Moderation settings & auto-filters"
      maxWidth="max-w-lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={primaryBtn} onClick={onSave}>
            <Check className="size-4" />
            Save Settings
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/15 p-3">
            <div>
              <p className="text-sm text-white">{row.title}</p>
              <p className="text-[11px] leading-relaxed text-white/40">{row.detail}</p>
            </div>
            <Toggle checked={settings[row.key]} onChange={(v) => setSettings((s) => ({ ...s, [row.key]: v }))} label={row.title} />
          </div>
        ))}
        <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/15 p-3">
          <span>
            <span className="block text-sm text-white">Auto-hide threshold</span>
            <span className="block text-[11px] text-white/40">Hide a post pending review after this many student reports.</span>
          </span>
          <input
            type="number"
            min={1}
            max={10}
            value={threshold}
            onChange={(e) => setThreshold(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            className={`${inputClass} w-20 text-center`}
            aria-label="Auto-hide threshold"
          />
        </label>
      </div>
    </ModalShell>
  )
}
