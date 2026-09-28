"use client"

import Link from "next/link"
import { AppShell } from "@/components/shared/AppShell"
import { InstructorCourseworkPulse } from "@/components/coursework/InstructorCourseworkPulse"
import { useLocalCohort } from "@/lib/instructor/use-local-cohort"

export default function InstructorPage() {
  const { students, missedQuestions } = useLocalCohort()
  const attention = students.filter((item) => item.needsAttention)
  const assessed = students.filter((item) => item.attempts.length > 0)
  const recent = students.flatMap((student) => student.attempts.map((attempt) => ({ student, attempt }))).sort((a, b) => b.attempt.submittedAt - a.attempt.submittedAt).slice(0, 5)

  return <AppShell variant="instructor"><div className="mx-auto max-w-7xl px-5 py-9 text-white md:px-8">
    <p className="text-xs uppercase tracking-[.24em] text-[#F5B942]">Instructor view · frontend demo</p>
    <h1 className="mt-3 text-4xl font-semibold">Cohort overview</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Learning and assignment records from profiles in this browser. Other devices and classrooms are not connected.</p>
    <InstructorCourseworkPulse />
    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      { label: "Local learners", value: students.length, href: "/instructor/students" },
      { label: "With assessments", value: assessed.length, href: "/instructor/students" },
      { label: "Needs attention", value: attention.length, href: "/instructor/students" },
      { label: "Missed questions", value: missedQuestions.length, href: "/instructor/misconceptions" },
    ].map((stat) => <Link href={stat.href} key={stat.label} className="rounded-2xl border border-white/10 bg-white/[.035] p-5 hover:border-[#00D4FF]/35"><p className="text-xs uppercase tracking-wider text-white/45">{stat.label}</p><p className="mt-3 text-3xl font-semibold">{stat.value}</p></Link>)}</div>
    <div className="mt-7 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Needs attention</h2><Link href="/instructor/students" className="text-sm text-[#00D4FF]">View roster →</Link></div>{attention.length ? <ul className="mt-4 space-y-2">{attention.slice(0, 5).map((student) => <li key={student.id}><Link href={`/instructor/students/${encodeURIComponent(student.id)}`} className="block rounded-xl bg-black/20 p-4 hover:bg-white/5"><span className="font-medium">{student.name}</span><span className="mt-1 block text-xs text-white/45">{student.attentionReason}</span></Link></li>)}</ul> : <p className="mt-4 text-sm text-white/45">{students.length ? "No local learner currently meets the attention rule." : "No local learners yet. Published assignments and learner activity will populate this view."}</p>}</section>
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Most missed questions</h2><Link href="/instructor/misconceptions" className="text-sm text-[#00D4FF]">Explore patterns →</Link></div>{missedQuestions.length ? <ul className="mt-4 space-y-2">{missedQuestions.slice(0, 4).map((item) => <li key={item.id} className="rounded-xl bg-black/20 p-4"><p className="text-sm font-medium">{item.prompt}</p><p className="mt-1 text-xs text-white/45">{item.concept} · {item.affectedLearners.length} learner{item.affectedLearners.length === 1 ? "" : "s"}</p></li>)}</ul> : <p className="mt-4 text-sm text-white/45">No recorded wrong answers in this browser yet.</p>}</section></div>
    <section className="mt-7 rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-lg font-semibold">Recent assessment activity</h2>{recent.length ? <ul className="mt-4 divide-y divide-white/10">{recent.map(({ student, attempt }) => <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm">{student.name} · {attempt.kind.replaceAll("-", " ")}</p><p className="mt-1 text-xs text-white/45">{attempt.assessmentId} · {new Date(attempt.submittedAt).toLocaleString()}</p></div><div className="flex items-center gap-3"><span className="text-sm">{attempt.score === null ? attempt.status : `${attempt.score}%`}</span><Link href={`/instructor/students/${encodeURIComponent(student.id)}`} className="text-sm text-[#00D4FF]">Inspect →</Link></div></li>)}</ul> : <p className="mt-4 text-sm text-white/45">No assessment submissions yet.</p>}</section>
    <section className="mt-7"><h2 className="text-lg font-semibold">Instructor tools</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      ["Assignments", "/instructor/assignments"], ["Assessments", "/instructor/assessments"], ["Students", "/instructor/students"], ["Question patterns", "/instructor/misconceptions"], ["Curriculum review", "/instructor/curriculum"], ["Contests", "/contests"], ["Discussions", "/discussions"], ["Preferences", "/settings"],
    ].map(([label, href]) => <Link href={href} key={href} className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-white/80 hover:border-[#00D4FF]/35">{label} →</Link>)}</div></section>
    <p className="mt-6 text-xs text-white/35">Attention is based on two recent failed assessments or a latest score below 70%. It is a review cue, not a diagnosis.</p>
  </div></AppShell>
}
