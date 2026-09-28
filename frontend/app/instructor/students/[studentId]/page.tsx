"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { AppShell } from "@/components/shared/AppShell"
import { getUnit } from "@/lib/curriculum/units"
import { useLocalCohort } from "@/lib/instructor/use-local-cohort"

function attemptHref(kind: string, id: string) {
  if (kind === "unit-quiz") return `/curriculum/${id}/quiz`
  if (kind === "lab-challenge") return `/lab/${id}`
  if (kind === "code-challenge") return "/challenges/code-practice"
  if (kind === "assignment") return `/assignments/${id}`
  return `/challenges/${id}`
}

export default function InstructorStudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const { students, missedQuestions } = useLocalCohort()
  const student = students.find((item) => item.id === decodeURIComponent(studentId))
  if (!student) return <AppShell variant="instructor"><div className="mx-auto max-w-4xl px-5 py-16 text-white"><h1 className="text-3xl font-semibold">Student not found</h1><p className="mt-3 text-sm text-white/55">This learner has no profile or submission in the current browser.</p><Link href="/instructor/students" className="mt-6 inline-block text-[#00D4FF]">Back to students</Link></div></AppShell>

  const relevantMisses = missedQuestions.filter((item) => item.affectedLearners.includes(student.id))
  const bestByConcept = new Map<string, number>()
  for (const attempt of student.attempts.filter((item) => item.score !== null)) {
    const label = attempt.kind === "unit-quiz" ? getUnit(attempt.assessmentId)?.title ?? attempt.assessmentId : attempt.assessmentId.replaceAll("-", " ")
    bestByConcept.set(label, Math.max(bestByConcept.get(label) ?? 0, attempt.score ?? 0))
  }
  const hintUsage = Object.entries(student.progress?.hintUsage ?? {}).filter(([, count]) => count > 0)
  const next = relevantMisses[0]

  return <AppShell variant="instructor"><div className="mx-auto max-w-6xl px-5 py-10 text-white md:px-8">
    <Link href="/instructor/students" className="text-sm text-[#00D4FF]">← Students</Link>
    <p className="mt-7 text-xs uppercase tracking-[.22em] text-[#F5B942]">Browser-local learner record</p><h1 className="mt-2 text-4xl font-semibold">{student.name}</h1><p className="mt-2 text-sm text-white/55">{student.email ?? "Guest profile"}</p>
    <div className="mt-7 grid gap-3 sm:grid-cols-4">{[
      ["Lessons", String(student.progress?.lessonsCompleted.length ?? 0)], ["XP", String(student.progress?.xp ?? 0)], ["Assessments", String(student.attempts.length)], ["Latest score", student.latestScore === null ? "—" : `${student.latestScore}%`],
    ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><p className="text-xs uppercase tracking-wider text-white/45">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></div>)}</div>
    {student.needsAttention && <div className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-300/5 p-5"><h2 className="font-semibold text-amber-100">Needs attention</h2><p className="mt-2 text-sm text-white/65">{student.attentionReason}</p>{next && <p className="mt-2 text-sm text-white/65">Suggested review: <Link href={next.lessonHref} className="text-[#00D4FF]">{next.concept}</Link>, based on a missed question.</p>}</div>}
    <div className="mt-7 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-lg font-semibold">Concept scores</h2>{bestByConcept.size ? <ul className="mt-4 space-y-3">{[...bestByConcept].map(([name, score]) => <li key={name} className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3 text-sm"><span className="capitalize text-white/70">{name}</span><strong className={score >= 70 ? "text-emerald-300" : "text-amber-300"}>{score}%</strong></li>)}</ul> : <p className="mt-4 text-sm text-white/45">No graded assessments yet.</p>}</section>
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-lg font-semibold">Lesson and lab progress</h2><p className="mt-4 text-sm text-white/65">{student.progress?.lessonsCompleted.length ?? 0} lessons completed</p><p className="mt-2 text-sm text-white/65">{Object.values(student.progress?.stagesCompleted ?? {}).filter((stage) => stage >= 9).length} labs mastered</p><h3 className="mt-5 text-sm font-semibold">Hint use</h3>{hintUsage.length ? <ul className="mt-2 space-y-2 text-sm text-white/60">{hintUsage.map(([slug, count]) => <li key={slug} className="capitalize">{slug.replaceAll("-", " ")}: {count}</li>)}</ul> : <p className="mt-2 text-sm text-white/45">No hints recorded.</p>}</section></div>
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-lg font-semibold">Assessment history</h2>{student.attempts.length ? <div className="mt-4 space-y-2">{student.attempts.map((attempt) => <div key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/20 p-4"><div><p className="text-sm font-medium capitalize">{attempt.kind.replaceAll("-", " ")} · {attempt.assessmentId}</p><p className="mt-1 text-xs text-white/45">{new Date(attempt.submittedAt).toLocaleString()} · {attempt.feedback[0] ?? attempt.status}</p></div><div className="flex items-center gap-4"><span className="text-sm">{attempt.score === null ? attempt.status : `${attempt.score}%`}</span><Link href={attemptHref(attempt.kind, attempt.assessmentId)} className="text-sm text-[#00D4FF]">Open content →</Link></div></div>)}</div> : <p className="mt-4 text-sm text-white/45">No assessment attempts yet.</p>}</section>
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-lg font-semibold">Assignment responses</h2>{student.submissions.length ? <ul className="mt-4 space-y-2">{student.submissions.map((submission) => <li key={submission.id} className="rounded-xl bg-black/20 p-4 text-sm"><p>{submission.correctCount}/{submission.totalQuestions} quiz answers correct · {new Date(submission.submittedAt).toLocaleDateString()}</p><p className="mt-2 text-white/55">Written response: {submission.reflection}</p><Link href={`/instructor/assignments/${submission.assignmentId}`} className="mt-3 inline-block text-[#00D4FF]">Review assignment →</Link></li>)}</ul> : <p className="mt-4 text-sm text-white/45">No assignment responses yet.</p>}</section>
  </div></AppShell>
}
