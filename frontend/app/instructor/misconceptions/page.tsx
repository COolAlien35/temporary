"use client"

import Link from "next/link"
import { AppShell } from "@/components/shared/AppShell"
import { useLocalCohort } from "@/lib/instructor/use-local-cohort"

export default function InstructorMisconceptionsPage() {
  const { students, missedQuestions } = useLocalCohort()
  return <AppShell variant="instructor"><div className="mx-auto max-w-6xl px-5 py-10 text-white md:px-8">
    <Link href="/instructor" className="text-sm text-[#00D4FF]">← Cohort overview</Link>
    <p className="mt-7 text-xs uppercase tracking-[.22em] text-[#F5B942]">Evidence from submitted answers</p>
    <h1 className="mt-2 text-4xl font-semibold">Question patterns</h1>
    <p className="mt-3 max-w-2xl text-sm text-white/55">These are questions answered incorrectly in this browser’s learner profiles and assignment submissions. A wrong answer suggests a topic to review; it does not establish a student’s belief.</p>
    {missedQuestions.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-8"><h2 className="text-lg font-semibold">No answer patterns yet</h2><p className="mt-2 text-sm text-white/55">Recorded quiz or assignment answers will appear here after learners submit them.</p></div> : <div className="mt-7 space-y-4">{missedQuestions.map((item) => <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wider text-[#F5B942]">{item.concept}</p><h2 className="mt-2 text-lg font-semibold">{item.prompt}</h2></div><span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs text-amber-200">{item.affectedLearners.length} learner{item.affectedLearners.length === 1 ? "" : "s"} · {item.missedAttempts} missed attempt{item.missedAttempts === 1 ? "" : "s"}</span></div><div className="mt-4 flex flex-wrap gap-3 text-sm"><Link href={item.lessonHref} className="text-[#00D4FF]">Related lesson or assignment →</Link>{item.challengeHref && <Link href={item.challengeHref} className="text-[#00D4FF]">Related challenge →</Link>}</div><div className="mt-4 flex flex-wrap gap-2">{item.affectedLearners.map((id) => { const student = students.find((entry) => entry.id === id); return <Link key={id} href={`/instructor/students/${encodeURIComponent(id)}`} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:border-[#00D4FF]/35">{student?.name ?? id} →</Link> })}</div></article>)}</div>}
  </div></AppShell>
}
