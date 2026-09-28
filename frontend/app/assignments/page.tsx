"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppShell } from "@/components/shared/AppShell"
import { canAccessAssignment } from "@/lib/coursework/types"
import { getUnit } from "@/lib/curriculum/units"
import { useCoursework } from "@/store/use-coursework"
import { useSession } from "@/store/use-session"

export default function AssignmentsPage() {
  const [mounted, setMounted] = useState(false)
  const user = useSession((state) => state.user)
  const assignments = useCoursework((state) => state.assignments)
  const submissions = useCoursework((state) => state.submissions)
  useEffect(() => setMounted(true), [])

  const visible = mounted && user ? assignments.filter((assignment) => canAccessAssignment(assignment, user.email)) : []

  return <AppShell variant="curriculum"><div className="mx-auto max-w-5xl py-6">
    <Link href="/curriculum" className="text-sm text-[#00D4FF]">← Curriculum</Link>
    <p className="mt-5 text-xs uppercase tracking-[.2em] text-[#F5B942]">Learner work · frontend demo</p>
    <h1 className="mt-2 text-3xl font-semibold">Assigned work</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Study the circuit, answer the quiz and send a written response. Published work appears here only for eligible demo profiles in this browser.</p>
    {!mounted ? <p className="mt-8 text-sm text-white/50">Loading assigned work...</p> : !user ? <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.04] p-6"><p className="text-sm text-white/65">Sign in to see work assigned to your demo profile.</p><Link href="/login?next=/assignments" className="mt-4 inline-block text-sm text-[#00D4FF]">Go to login →</Link></div> : visible.length === 0 ? <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.04] p-6"><h2 className="font-semibold">Nothing assigned yet</h2><p className="mt-2 text-sm text-white/55">An instructor can publish a circuit study task from the instructor demo view.</p><Link href="/curriculum" className="mt-4 inline-block text-sm text-[#00D4FF]">Explore curriculum →</Link></div> : <div className="mt-8 grid gap-4">{[...visible].reverse().map((assignment) => {
      const attempts = submissions.filter((submission) => submission.assignmentId === assignment.id && submission.learnerId === user.id)
      const latest = attempts.at(-1)
      return <Link key={assignment.id} href={`/assignments/${assignment.id}`} className="rounded-2xl border border-white/10 bg-white/[.04] p-5 transition hover:border-[#00D4FF]/50"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[.16em] text-[#00D4FF]">{getUnit(assignment.unitId)?.title ?? "Circuit study"}</p><h2 className="mt-2 text-lg font-semibold">{assignment.title}</h2><p className="mt-2 line-clamp-2 text-sm text-white/55">{assignment.instructions}</p></div><span className="rounded-full border border-[#F5B942]/30 px-3 py-1 text-xs text-[#F5B942]">{latest ? `${Math.round(latest.correctCount / latest.totalQuestions * 100)}% · ${attempts.length} attempt${attempts.length === 1 ? "" : "s"}` : "To do"}</span></div><p className="mt-4 text-xs text-white/40">{assignment.questions.length} quiz questions · {assignment.dueDate ? `Due ${assignment.dueDate}` : "No due date"} · {assignment.circuit.name}</p></Link>
    })}</div>}
  </div></AppShell>
}
