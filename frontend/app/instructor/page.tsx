"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AppShell } from "@/components/shared/AppShell"
import {
  AlertTriangle,
  ArrowRight,
  Atom,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Code2,
  Flag,
  Gauge,
  MessageSquare,
  Settings2,
  ShieldAlert,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react"

const flaggedStudents = [
  { initials: "AR", name: "Aisha Rahman", concern: "3 failed attempts on Entanglement, no activity in 5 days", tone: "cyan" },
  { initials: "JL", name: "Jonah Lee", concern: "Mastery dropped 18% on Grover's Algorithm this week", tone: "amber" },
  { initials: "SM", name: "Sofia Martinez", concern: "6 wrong attempts on Superposition in the last session", tone: "violet" },
  { initials: "DK", name: "David Kim", concern: "Has not started the Phase Estimation lesson", tone: "rose" },
]

const misconceptions = [
  { title: "Measurement collapses every qubit", students: 14, concept: "Superposition", color: "#00D4FF" },
  { title: "Entanglement means faster-than-light signaling", students: 11, concept: "Entanglement", color: "#F5B942" },
  { title: "Oracle marks the answer automatically", students: 8, concept: "Grover's Algorithm", color: "#A78BFA" },
  { title: "More gates always improve precision", students: 6, concept: "Noise & Error", color: "#4ADE80" },
]

const quickLinks = [
  { label: "Students", href: "/instructor/students", icon: Users },
  { label: "Curriculum", href: "/instructor/curriculum", icon: BookOpen },
  { label: "Quizzes", href: "/instructor/quizzes", icon: CheckCircle2 },
  { label: "Coding Challenges", href: "/instructor/challenges", icon: Code2 },
  { label: "Debug Sets", href: "/instructor/debug-sets", icon: ShieldAlert },
  { label: "Contests", href: "/instructor/contests", icon: Trophy },
  { label: "Misconceptions", href: "/instructor/misconceptions", icon: BrainCircuit },
  { label: "Discussions", href: "/instructor/discussions", icon: MessageSquare },
  { label: "Notifications", href: "/instructor/notifications", icon: Flag },
  { label: "Settings", href: "/instructor/settings", icon: Settings2 },
]

const activity = [
  { icon: CheckCircle2, text: "Priya Nair completed the Entanglement quiz with 92%", time: "8 min ago", href: "/instructor/students" },
  { icon: Flag, text: "A new forum flag was raised on the Grover discussion", time: "34 min ago", href: "/instructor/discussions" },
  { icon: Trophy, text: "Marcus Chen joined the Quantum Debug Sprint", time: "1 hr ago", href: "/instructor/contests" },
  { icon: Code2, text: "Elena Rossi submitted a circuit optimization challenge", time: "2 hrs ago", href: "/instructor/challenges" },
]

function StatCard({ label, value, detail, icon: Icon, href, accent }: { label: string; value: string; detail: string; icon: typeof Users; href?: string; accent: string }) {
  const content = <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-white/20"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[.16em] text-white/45">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p><p className="mt-1 text-xs text-white/45">{detail}</p></div><span className="flex size-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}18`, color: accent }}><Icon className="size-4" /></span></div><div className="absolute -bottom-10 -right-8 size-24 rounded-full blur-2xl" style={{ backgroundColor: `${accent}12` }} /></div>
  return href ? <Link href={href}>{content}</Link> : content
}

function SectionHeading({ eyebrow, title, href, action }: { eyebrow?: string; title: string; href?: string; action?: string }) {
  return <div className="mb-5 flex items-end justify-between gap-4"><div>{eyebrow && <p className="text-[11px] uppercase tracking-[.22em] text-[#00D4FF]">{eyebrow}</p>}<h2 className="mt-1 text-xl font-semibold text-white">{title}</h2></div>{href && <Link href={href} className="flex items-center gap-1 text-xs font-medium text-[#00D4FF] hover:text-white">{action ?? "View all"}<ArrowRight className="size-3.5" /></Link>}</div>
}

export default function InstructorPage() {
  const [showAll, setShowAll] = useState(false)
  const visibleStudents = useMemo(() => showAll ? flaggedStudents : flaggedStudents.slice(0, 3), [showAll])

  return <AppShell variant="instructor">
    <main className="relative z-0 mx-auto max-w-7xl px-5 py-9 md:px-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg border border-[#F5B942]/30 bg-[#F5B942]/10 text-[#F5B942]"><Atom className="size-4" /></span><p className="text-xs uppercase tracking-[.24em] text-[#F5B942]">Instructor view</p></div><h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Cohort overview</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">A live pulse-check on mastery, misconceptions, and the learners who could use a little more momentum.</p></div><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-xs text-white/55"><Zap className="size-3.5 text-[#F5B942]" /> Data synced from learner activity · just now</div></div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Active students" value="128" detail="+9 this week" icon={Users} accent="#00D4FF" /><StatCard label="Cohort mastery" value="74%" detail="Across 36 concepts" icon={Gauge} accent="#4ADE80" /><StatCard label="Most missed" value="31%" detail="Entanglement miss rate" icon={AlertTriangle} accent="#F5B942" /><StatCard label="Needs intervention" value="12" detail="Low trend or inactive" href="/instructor/students?filter=attention" icon={ShieldAlert} accent="#FB7185" /><StatCard label="Forum flags" value="4" detail="Awaiting moderation" href="/instructor/discussions?filter=flags" icon={Flag} accent="#A78BFA" /></section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6"><SectionHeading eyebrow="Cohort pulse" title="Needs attention" href="/instructor/students?filter=attention" action="View roster" /><div className="flex flex-col gap-2">{visibleStudents.map((student) => <div key={student.name} className="flex flex-col gap-3 rounded-xl border border-white/8 bg-black/10 p-3.5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/75">{student.initials}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{student.name}</p><p className="mt-0.5 truncate text-xs text-white/45">{student.concern}</p></div></div><Link href="/instructor/students" className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/65 transition hover:border-[#00D4FF]/50 hover:text-[#00D4FF]">View profile</Link></div>)} </div><button type="button" onClick={() => setShowAll((value) => !value)} className="mt-4 text-xs text-[#00D4FF] hover:text-white">{showAll ? "Show less" : "Show one more student"}</button></section>

      <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6"><SectionHeading eyebrow="Pattern watch" title="Misconception snapshot" href="/instructor/misconceptions" action="View analytics" /><div className="flex flex-col gap-2.5">{misconceptions.map((item) => <div key={item.title} className="rounded-xl border border-white/8 bg-black/10 p-3.5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium leading-5 text-white">{item.title}</p><p className="mt-1 text-xs text-white/45">Tied to {item.concept}</p></div><span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold" style={{ color: item.color, backgroundColor: `${item.color}18` }}>{item.students} students</span></div></div>)}</div></section></div>

      <section className="mt-8"><SectionHeading eyebrow="Instructor tools" title="Quick access" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{quickLinks.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className="group rounded-xl border border-white/10 bg-white/[.025] p-4 transition hover:-translate-y-0.5 hover:border-[#00D4FF]/40 hover:bg-white/[.05]"><Icon className="size-4 text-[#00D4FF] transition group-hover:text-white" /><p className="mt-4 text-sm font-medium text-white/80">{label}</p><ArrowRight className="mt-3 size-3.5 text-white/25 transition group-hover:translate-x-1 group-hover:text-[#00D4FF]" /></Link>)}</div></section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_330px]"><div className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6"><SectionHeading eyebrow="Live feed" title="Recent activity" href="/instructor/activity" action="Full activity" /><div className="flex flex-col divide-y divide-white/8">{activity.map(({ icon: Icon, text, time, href }) => <Link key={text} href={href} className="flex gap-3 py-3.5 first:pt-0 last:pb-0"><span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#00D4FF]/10 text-[#00D4FF]"><Icon className="size-3.5" /></span><span className="min-w-0 flex-1"><span className="block text-sm text-white/75">{text}</span><span className="mt-1 block text-xs text-white/35">{time}</span></span><ArrowRight className="mt-1 size-3.5 shrink-0 text-white/25" /></Link>)}</div></div><div className="rounded-2xl border border-[#F5B942]/20 bg-[#F5B942]/[.05] p-5 sm:p-6"><Sparkles className="size-5 text-[#F5B942]" /><h3 className="mt-4 text-lg font-semibold text-white">Teaching signal</h3><p className="mt-2 text-sm leading-6 text-white/55">Entanglement is trending as the cohort’s biggest friction point. Consider opening a visual review session before the next contest.</p><Link href="/instructor/curriculum" className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[#F5B942]">Review curriculum <ArrowRight className="size-3.5" /></Link></div></section>
    </main>
  </AppShell>
}
