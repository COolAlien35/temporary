"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AppShell } from "@/components/shared/AppShell"
import { units } from "@/lib/curriculum/units"
import { useLocalCohort } from "@/lib/instructor/use-local-cohort"

export default function InstructorStudentsPage() {
  const { students } = useLocalCohort()
  const [query, setQuery] = useState("")
  const [concept, setConcept] = useState("all")
  const [status, setStatus] = useState("all")
  const filtered = useMemo(() => students.filter((student) => {
    const matchesText = `${student.name} ${student.email ?? ""}`.toLowerCase().includes(query.toLowerCase())
    const matchesConcept = concept === "all" || student.attempts.some((attempt) => attempt.assessmentId === concept) || student.progress?.lessonsCompleted.some((id) => id.startsWith(`${concept}-`))
    const matchesStatus = status === "all" || status === "attention" && student.needsAttention || status === "assessed" && student.attempts.length > 0 || status === "unassessed" && student.attempts.length === 0
    return matchesText && matchesConcept && matchesStatus
  }), [students, query, concept, status])

  return <AppShell variant="instructor"><div className="mx-auto max-w-6xl px-5 py-10 text-white md:px-8">
    <Link href="/instructor" className="text-sm text-[#00D4FF]">← Cohort overview</Link>
    <p className="mt-7 text-xs uppercase tracking-[.22em] text-[#F5B942]">Browser-local demo cohort</p>
    <h1 className="mt-2 text-4xl font-semibold">Students</h1>
    <p className="mt-3 max-w-2xl text-sm text-white/55">These learners have profiles or submissions in this browser. Their records are not synced with other devices.</p>
    <div className="mt-7 grid gap-3 sm:grid-cols-3">
      <label className="text-xs text-white/55">Search students<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or email" className="mt-2 block w-full rounded-xl border border-white/15 bg-[#10141F] px-4 py-3 text-sm text-white outline-none focus:border-[#00D4FF]" /></label>
      <label className="text-xs text-white/55">Concept<select value={concept} onChange={(event) => setConcept(event.target.value)} className="mt-2 block w-full rounded-xl border border-white/15 bg-[#10141F] px-4 py-3 text-sm text-white"><option value="all">All concepts</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.title}</option>)}</select></label>
      <label className="text-xs text-white/55">Progress<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 block w-full rounded-xl border border-white/15 bg-[#10141F] px-4 py-3 text-sm text-white"><option value="all">All students</option><option value="attention">Needs attention</option><option value="assessed">Has assessment</option><option value="unassessed">No assessment yet</option></select></label>
    </div>
    {students.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-8"><h2 className="text-lg font-semibold">No learner profiles yet</h2><p className="mt-2 text-sm text-white/55">Have a demo learner sign in and complete a lesson or assignment on this browser to populate the roster.</p></div> : filtered.length === 0 ? <p className="mt-8 rounded-2xl border border-white/10 p-6 text-sm text-white/55">No students match these filters.</p> : <div className="mt-7 space-y-3">{filtered.map((student) => <Link key={student.id} href={`/instructor/students/${encodeURIComponent(student.id)}`} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 hover:border-[#00D4FF]/35"><div><h2 className="text-lg font-semibold">{student.name}</h2><p className="mt-1 text-xs text-white/45">{student.email ?? "Guest profile"} · {student.progress?.lessonsCompleted.length ?? 0} lessons · {student.attempts.length} assessments</p><p className="mt-2 text-xs text-white/45">{student.latestActivity ? `Last activity ${new Date(student.latestActivity).toLocaleDateString()}` : "No recorded activity"}</p></div><div className="flex items-center gap-4"><span className={`rounded-full px-3 py-1 text-xs ${student.needsAttention ? "bg-amber-300/10 text-amber-200" : "bg-white/5 text-white/50"}`}>{student.attentionReason ?? "No alert"}</span><span className="text-sm text-[#00D4FF]">View detail →</span></div></Link>)}</div>}
    <p className="mt-6 text-xs text-white/35">Concept filters use recorded lessons and unit quizzes. Unattempted concepts do not imply a misconception.</p>
  </div></AppShell>
}
