import { Layers, Package, User, Users, type LucideIcon } from "lucide-react"
import { students, type Student } from "@/lib/instructor-students"

/* ---------------------------------- Types ---------------------------------- */

export type AnnouncementPriority = "Urgent" | "Normal" | "Low"
export type AnnouncementStatus = "Sent" | "Scheduled" | "Draft" | "Pinned"
export type TargetAudience = "All Students" | "Cohort" | "Batch" | "Individual"
export type DeliveryChannel = "In-App" | "Email" | "Both"

export interface RecipientReceipt {
  studentId: string
  readAt?: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  authorName: string
  authorInitials: string
  authorRole: string
  priority: AnnouncementPriority
  status: AnnouncementStatus
  targetAudience: TargetAudience
  targetLabel: string
  targetIds: string[]
  channel: DeliveryChannel
  isPinned: boolean
  pinnedUntil?: string
  scheduledFor?: string
  sentAt?: string
  createdAt: string
  readCount: number
  totalRecipients: number
  readRate: number
  recipients: RecipientReceipt[]
}

export type LogEvent = "created" | "sent" | "scheduled" | "pinned" | "unpinned" | "edited" | "deleted"

export interface NotificationLogEntry {
  id: string
  announcementId: string
  announcementTitle: string
  event: LogEvent
  timestamp: string
  detail: string
  actorName: string
}

/* ------------------------------ Reference data ------------------------------ */

/** Fixed "now" for the mock dataset so relative times render identically on server and client. */
export const NOW_ISO = "2026-09-25T10:00:00.000Z"
export const NOW_MS = Date.parse(NOW_ISO)
export const CURRENT_DISPATCH_LABEL = "Faculty dispatch \u00b7 Week 6"

export const DEFAULT_AUTHOR = {
  name: "Dr. Rina Kapoor",
  role: "Lead Faculty, Quantum Algorithms",
}

export const cohortOptions = [
  { id: "cohort-alpha-2026", label: "Cohort Alpha 2026" },
  { id: "cohort-beta-2026", label: "Cohort Beta 2026" },
] as const

export const batchOptions = [
  { id: "batch-a", label: "Batch A - Quantum Foundations", short: "Batch A", batch: "A" },
  { id: "batch-b", label: "Batch B - Algorithm Lab", short: "Batch B", batch: "B" },
  { id: "batch-c", label: "Batch C - Advanced QFT", short: "Batch C", batch: "C" },
] as const

export const emojiOptions = ["\u{1F4E2}", "\u{1F52C}", "\u26A0\uFE0F", "\u{1F3AF}", "\u{1F3C6}", "\u{1F4DA}", "\u2728"] as const

/** Every current roster student is enrolled in Cohort Alpha; Cohort Beta opens next term. */
const cohortMembership: Record<string, string[]> = {
  "cohort-alpha-2026": students.map((s) => s.id),
  "cohort-beta-2026": [],
}

export function resolveRecipients(audience: TargetAudience, targetIds: string[]): Student[] {
  switch (audience) {
    case "All Students":
      return students
    case "Cohort": {
      const ids = new Set(targetIds.flatMap((id) => cohortMembership[id] ?? []))
      return students.filter((s) => ids.has(s.id))
    }
    case "Batch": {
      const batches = new Set(targetIds.map((id) => batchOptions.find((b) => b.id === id)?.batch))
      return students.filter((s) => batches.has(s.batch))
    }
    case "Individual":
      return students.filter((s) => targetIds.includes(s.id))
  }
}

export function resolveTargetLabel(audience: TargetAudience, targetIds: string[]): string {
  switch (audience) {
    case "All Students":
      return "All Students"
    case "Cohort":
      return cohortOptions.find((c) => c.id === targetIds[0])?.label ?? "Cohort"
    case "Batch":
      return batchOptions.find((b) => b.id === targetIds[0])?.short ?? "Batch"
    case "Individual":
      return students.find((s) => s.id === targetIds[0])?.name ?? "Individual"
  }
}

export function initials(name: string) {
  return name
    .replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/** Recomputes readCount / totalRecipients / readRate from the receipt list. */
export function withReadStats(a: Omit<Announcement, "readCount" | "totalRecipients" | "readRate">): Announcement {
  const totalRecipients = a.recipients.length
  const readCount = a.recipients.filter((r) => r.readAt).length
  return {
    ...a,
    readCount,
    totalRecipients,
    readRate: totalRecipients ? Math.round((readCount / totalRecipients) * 100) : 0,
  }
}

function receipts(audience: TargetAudience, targetIds: string[], reads: Record<string, string>): RecipientReceipt[] {
  return resolveRecipients(audience, targetIds).map((s) => ({ studentId: s.id, readAt: reads[s.id] }))
}

function allRead(audience: TargetAudience, targetIds: string[], baseIso: string, stepMinutes: number, except: string[] = []) {
  const reads: Record<string, string> = {}
  resolveRecipients(audience, targetIds).forEach((s, i) => {
    if (except.includes(s.id)) return
    reads[s.id] = new Date(Date.parse(baseIso) + (i + 1) * stepMinutes * 60_000).toISOString()
  })
  return reads
}

const author = {
  authorName: DEFAULT_AUTHOR.name,
  authorInitials: "RK",
  authorRole: DEFAULT_AUTHOR.role,
}

/* ---------------------------------- Seeds ---------------------------------- */

export const announcements: Announcement[] = [
  withReadStats({
    id: "ann-welcome",
    title: "Welcome to Cohort Alpha \u2014 Getting Started",
    body:
      "Welcome aboard! QuantumLoop is built around one loop: **predict, run, explain**. Start with *Unit 1: Qubits & Superposition* on the Curriculum page, then open the Lab to try your first circuit.\n\nDon't worry about getting predictions right yet \u2014 the point is to make them. Every wrong guess is a misconception we can fix together.",
    ...author,
    priority: "Normal",
    status: "Sent",
    targetAudience: "All Students",
    targetLabel: "All Students",
    targetIds: [],
    channel: "In-App",
    isPinned: false,
    sentAt: "2026-09-04T09:00:00.000Z",
    createdAt: "2026-09-03T16:20:00.000Z",
    recipients: receipts("All Students", [], allRead("All Students", [], "2026-09-04T09:00:00.000Z", 45)),
  }),
  withReadStats({
    id: "ann-quiz-1",
    title: "Quiz 1: Quantum Foundations \u2014 Due Friday",
    body:
      "Quiz 1 covers superposition, the Bloch sphere, and single-qubit gates. It opens Wednesday and closes **Friday at 11:59 PM**.\n\n- 12 questions, 30 minutes\n- One retake allowed\n- Predict-before-reveal items count double",
    ...author,
    priority: "Normal",
    status: "Sent",
    targetAudience: "Cohort",
    targetLabel: "Cohort Alpha 2026",
    targetIds: ["cohort-alpha-2026"],
    channel: "Both",
    isPinned: false,
    sentAt: "2026-09-20T14:00:00.000Z",
    createdAt: "2026-09-20T13:10:00.000Z",
    recipients: receipts(
      "Cohort",
      ["cohort-alpha-2026"],
      allRead("Cohort", ["cohort-alpha-2026"], "2026-09-20T14:00:00.000Z", 70, ["david-kim"]),
    ),
  }),
  withReadStats({
    id: "ann-dispatch-w6",
    title: "\u{1F52C} Faculty Dispatch \u2014 Week 6",
    body:
      "Don't just verify Grover's speedup \u2014 predict the amplitude before you measure. That habit is what separates people who use quantum algorithms from people who understand them.",
    ...author,
    priority: "Normal",
    status: "Pinned",
    targetAudience: "All Students",
    targetLabel: "All Students",
    targetIds: [],
    channel: "In-App",
    isPinned: true,
    pinnedUntil: "2026-10-05T23:59:00.000Z",
    sentAt: "2026-09-23T09:00:00.000Z",
    createdAt: "2026-09-22T18:40:00.000Z",
    recipients: receipts(
      "All Students",
      [],
      allRead("All Students", [], "2026-09-23T09:00:00.000Z", 95, ["aisha-rahman", "david-kim"]),
    ),
  }),
  withReadStats({
    id: "ann-contest-ext",
    title: "\u26A0\uFE0F Contest Extension: Entanglement Speed Challenge",
    body:
      "Due to simulator downtime on Tuesday night, the **Entanglement Speed Challenge** deadline has been extended by **48 hours**. Existing submissions are safe and still count \u2014 you may resubmit to improve your score.",
    ...author,
    priority: "Urgent",
    status: "Sent",
    targetAudience: "All Students",
    targetLabel: "All Students",
    targetIds: [],
    channel: "Both",
    isPinned: false,
    sentAt: "2026-09-24T10:00:00.000Z",
    createdAt: "2026-09-24T09:45:00.000Z",
    recipients: receipts("All Students", [], allRead("All Students", [], "2026-09-24T10:00:00.000Z", 20)),
  }),
  withReadStats({
    id: "ann-batch-b-hours",
    title: "Batch B: Extra Office Hours This Week",
    body:
      "I'm adding two extra office-hour blocks for Batch B this week: **Thursday 4\u20135 PM** and **Saturday 11 AM\u201312 PM**. Bring your Grover oracle circuits \u2014 we'll debug them live.",
    ...author,
    priority: "Normal",
    status: "Sent",
    targetAudience: "Batch",
    targetLabel: "Batch B",
    targetIds: ["batch-b"],
    channel: "In-App",
    isPinned: false,
    sentAt: "2026-09-24T22:00:00.000Z",
    createdAt: "2026-09-24T21:30:00.000Z",
    recipients: receipts("Batch", ["batch-b"], allRead("Batch", ["batch-b"], "2026-09-24T22:00:00.000Z", 60, ["elena-rossi"])),
  }),
  withReadStats({
    id: "ann-aisha-review",
    title: "Aisha \u2014 Your Debug Progress Review",
    body:
      "Hi Aisha \u2014 I noticed the *phase kickback* debug scenario has been tough, and your Entanglement mastery has dipped. That's completely normal at this stage. Let's book a 20-minute session this week: we'll walk through the Bell-state prediction together and get you back on track.",
    ...author,
    priority: "Low",
    status: "Sent",
    targetAudience: "Individual",
    targetLabel: "Aisha Rahman",
    targetIds: ["aisha-rahman"],
    channel: "In-App",
    isPinned: false,
    sentAt: "2026-09-25T04:00:00.000Z",
    createdAt: "2026-09-25T03:50:00.000Z",
    recipients: receipts("Individual", ["aisha-rahman"], {}),
  }),
  withReadStats({
    id: "ann-midterm",
    title: "Midterm Review Materials Published",
    body:
      "Midterm review materials are live: a condensed concept map, 20 practice predictions, and three worked debug scenarios. Work through the **practice predictions first** \u2014 they mirror the midterm format.",
    ...author,
    priority: "Normal",
    status: "Scheduled",
    targetAudience: "All Students",
    targetLabel: "All Students",
    targetIds: [],
    channel: "Both",
    isPinned: false,
    scheduledFor: "2026-09-26T09:00:00.000Z",
    createdAt: "2026-09-24T15:15:00.000Z",
    recipients: receipts("All Students", [], {}),
  }),
  withReadStats({
    id: "ann-hardware-studio",
    title: "Hardware Studio Now Available",
    body:
      "The **Hardware Studio** is open for Cohort Beta. Design a dilution-refrigerator wiring stack, run thermal checks, and see how real qubits are kept cold enough to compute.",
    ...author,
    priority: "Normal",
    status: "Draft",
    targetAudience: "Cohort",
    targetLabel: "Cohort Beta 2026",
    targetIds: ["cohort-beta-2026"],
    channel: "In-App",
    isPinned: false,
    createdAt: "2026-09-25T08:30:00.000Z",
    recipients: [],
  }),
]

export const notificationLog: NotificationLogEntry[] = [
  { id: "log-1", announcementId: "ann-welcome", announcementTitle: "Welcome to Cohort Alpha \u2014 Getting Started", event: "created", timestamp: "2026-09-03T16:20:00.000Z", detail: "Draft created for All Students", actorName: "Dr. Rina Kapoor" },
  { id: "log-2", announcementId: "ann-welcome", announcementTitle: "Welcome to Cohort Alpha \u2014 Getting Started", event: "sent", timestamp: "2026-09-04T09:00:00.000Z", detail: "Sent to All Students via In-App (8 recipients)", actorName: "Dr. Rina Kapoor" },
  { id: "log-3", announcementId: "ann-quiz-1", announcementTitle: "Quiz 1: Quantum Foundations \u2014 Due Friday", event: "sent", timestamp: "2026-09-20T14:00:00.000Z", detail: "Sent to Cohort Alpha 2026 via In-App + Email (8 recipients)", actorName: "Dr. Rina Kapoor" },
  { id: "log-4", announcementId: "ann-quiz-1", announcementTitle: "Quiz 1: Quantum Foundations \u2014 Due Friday", event: "edited", timestamp: "2026-09-21T08:15:00.000Z", detail: "Clarified retake policy in body", actorName: "Dr. Rina Kapoor" },
  { id: "log-5", announcementId: "ann-dispatch-w6", announcementTitle: "\u{1F52C} Faculty Dispatch \u2014 Week 6", event: "created", timestamp: "2026-09-22T18:40:00.000Z", detail: "Draft created for All Students", actorName: "Dr. Rina Kapoor" },
  { id: "log-6", announcementId: "ann-dispatch-w6", announcementTitle: "\u{1F52C} Faculty Dispatch \u2014 Week 6", event: "sent", timestamp: "2026-09-23T09:00:00.000Z", detail: "Sent to All Students via In-App (8 recipients)", actorName: "Dr. Rina Kapoor" },
  { id: "log-7", announcementId: "ann-dispatch-w6", announcementTitle: "\u{1F52C} Faculty Dispatch \u2014 Week 6", event: "pinned", timestamp: "2026-09-23T09:01:00.000Z", detail: "Pinned to student home page until Oct 5", actorName: "Dr. Rina Kapoor" },
  { id: "log-8", announcementId: "ann-contest-ext", announcementTitle: "\u26A0\uFE0F Contest Extension: Entanglement Speed Challenge", event: "sent", timestamp: "2026-09-24T10:00:00.000Z", detail: "Urgent \u00b7 Sent to All Students via In-App + Email (8 recipients)", actorName: "Dr. Rina Kapoor" },
  { id: "log-9", announcementId: "ann-midterm", announcementTitle: "Midterm Review Materials Published", event: "scheduled", timestamp: "2026-09-24T15:15:00.000Z", detail: "Scheduled for Sep 26, 9:00 AM to All Students via In-App + Email", actorName: "Dr. Rina Kapoor" },
  { id: "log-10", announcementId: "ann-batch-b-hours", announcementTitle: "Batch B: Extra Office Hours This Week", event: "sent", timestamp: "2026-09-24T22:00:00.000Z", detail: "Sent to Batch B via In-App (3 recipients)", actorName: "Dr. Rina Kapoor" },
  { id: "log-11", announcementId: "ann-aisha-review", announcementTitle: "Aisha \u2014 Your Debug Progress Review", event: "sent", timestamp: "2026-09-25T04:00:00.000Z", detail: "Sent to Aisha Rahman via In-App", actorName: "Dr. Rina Kapoor" },
  { id: "log-12", announcementId: "ann-hardware-studio", announcementTitle: "Hardware Studio Now Available", event: "created", timestamp: "2026-09-25T08:30:00.000Z", detail: "Draft saved for Cohort Beta 2026", actorName: "Dr. Rina Kapoor" },
].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)) as NotificationLogEntry[]

/* --------------------------------- Helpers --------------------------------- */

export function priorityBadgeClass(priority: AnnouncementPriority): string {
  switch (priority) {
    case "Urgent":
      return "text-[#FB7185] bg-[#FB7185]/12 border-[#FB7185]/30"
    case "Normal":
      return "text-[#00D4FF] bg-[#00D4FF]/10 border-[#00D4FF]/25"
    case "Low":
      return "text-white/50 bg-white/[.06] border-white/10"
  }
}

export function statusBadgeClass(status: AnnouncementStatus): string {
  switch (status) {
    case "Sent":
      return "text-[#4ADE80] bg-[#4ADE80]/12"
    case "Scheduled":
      return "text-[#F5B942] bg-[#F5B942]/12"
    case "Draft":
      return "text-white/55 bg-white/10"
    case "Pinned":
      return "text-[#A78BFA] bg-[#A78BFA]/12"
  }
}

export function channelLabel(channel: DeliveryChannel): string {
  return channel === "Both" ? "In-App + Email" : channel
}

export function audienceIcon(target: TargetAudience): LucideIcon {
  switch (target) {
    case "All Students":
      return Users
    case "Cohort":
      return Layers
    case "Batch":
      return Package
    case "Individual":
      return User
  }
}

export function readRateColor(rate: number): string {
  if (rate > 75) return "#4ADE80"
  if (rate >= 40) return "#F5B942"
  return "#FB7185"
}

export const logEventStyles: Record<LogEvent, { text: string; bg: string }> = {
  created: { text: "text-[#5B8CFF]", bg: "bg-[#5B8CFF]/12" },
  sent: { text: "text-[#4ADE80]", bg: "bg-[#4ADE80]/12" },
  scheduled: { text: "text-[#F5B942]", bg: "bg-[#F5B942]/12" },
  pinned: { text: "text-[#A78BFA]", bg: "bg-[#A78BFA]/12" },
  unpinned: { text: "text-[#A78BFA]/70", bg: "bg-[#A78BFA]/[.08]" },
  edited: { text: "text-white/60", bg: "bg-white/10" },
  deleted: { text: "text-[#FB7185]", bg: "bg-[#FB7185]/12" },
}

export function relativeTime(iso: string, nowMs: number = NOW_MS): string {
  const diff = nowMs - Date.parse(iso)
  const future = diff < 0
  const minutes = Math.round(Math.abs(diff) / 60_000)
  if (minutes < 1) return "just now"
  let text: string
  if (minutes < 60) text = `${minutes} min`
  else if (minutes < 60 * 24) {
    const h = Math.round(minutes / 60)
    text = `${h} ${h === 1 ? "hour" : "hours"}`
  } else if (minutes < 60 * 24 * 14) {
    const d = Math.round(minutes / (60 * 24))
    text = `${d} ${d === 1 ? "day" : "days"}`
  } else {
    const w = Math.round(minutes / (60 * 24 * 7))
    text = `${w} ${w === 1 ? "week" : "weeks"}`
  }
  return future ? `in ${text}` : `${text} ago`
}

const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
const fullFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
})

export function formatFullDate(iso: string) {
  return `${fullFmt.format(new Date(iso))} UTC`
}

export function formatShortDate(iso: string) {
  return dateFmt.format(new Date(iso))
}

/** "Tomorrow, 9:00 AM" / "Today, 3:00 PM" / "Sep 30, 9:00 AM" */
export function formatSchedule(iso: string, nowMs: number = NOW_MS) {
  const dayMs = 86_400_000
  const startOfToday = Math.floor(nowMs / dayMs) * dayMs
  const target = Date.parse(iso)
  const dayOffset = Math.floor((target - startOfToday) / dayMs)
  const time = timeFmt.format(new Date(iso))
  if (dayOffset === 0) return `Today, ${time}`
  if (dayOffset === 1) return `Tomorrow, ${time}`
  return `${formatShortDate(iso)}, ${time}`
}

export function timingLabel(a: Announcement) {
  if (a.status === "Draft") return "Draft \u00b7 not sent"
  if (a.status === "Scheduled" && a.scheduledFor) return `Scheduled for ${formatSchedule(a.scheduledFor)}`
  if (a.sentAt) return `Sent ${relativeTime(a.sentAt)}`
  return ""
}
