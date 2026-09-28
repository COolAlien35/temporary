"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AppShell } from "@/components/shared/AppShell"
import { CircuitStudy } from "@/components/coursework/CircuitStudy"
import { getUnit } from "@/lib/curriculum/units"
import type { CourseworkSubmission } from "@/lib/coursework/types"
import { useCoursework } from "@/store/use-coursework"

function FeedbackEditor({ submission }: { submission: CourseworkSubmission }) {
  const [feedback, setFeedback] = useState(submission.instructorFeedback ?? "")
  const [saved, setSaved] = useState(false)
  const saveFeedback = useCoursework((state) => state.saveFeedback)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!feedback.trim()) return
    saveFeedback(submission.id, feedback)
    setSaved(true)
  }

  return <form onSubmit={submit} className="mt-5 rounded-xl border border-[#00D4FF]/20 bg-[#00D4FF]/5 p-4"><label htmlFor={`feedback-${submission.id}`} className="text-sm font-semibold text-white">Instructor feedback</label><textarea id={`feedback-${submission.id}`} required rows={3} value={feedback} onChange={(event) => { setFeedback(event.target.value); setSaved(false) }} placeholder="Explain what the learner understood and what to try next." className="mt-3 w-full rounded-lg border border-white/15 bg-[#10141F] p-3 text-sm text-white outline-none focus:border-[#00D4FF]" /><div className="mt-3 flex items-center gap-3"><button type="submit" className="rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#0A0E17]">Save feedback</button>{saved && <span role="status" className="text-xs text-[#4ADE80]">Visible to this learner in the demo.</span>}</div></form>
}

export default function InstructorAssignmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [mounted, setMounted] = useState(false)
  const assignments = useCoursework((state) => state.assignments)
  const submissions = useCoursework((state) => state.submissions)
  const assignment = assignments.find((item) => item.id === id)
  const responses = submissions.filter((item) => item.assignmentId === id).sort((a, b) => b.submittedAt - a.submittedAt)
  useEffect(() => setMounted(true), [])

  return <AppShell variant="instructor"><div className="mx-auto max-w-5xl py-6"><Link href="/instructor/assignments" className="text-sm text-[#00D4FF]">← Instructor assignments</Link>
    {!mounted ? <p className="mt-8 text-sm text-white/50">Loading assignment...</p> : !assignment ? <div className="mt-8 rounded-2xl border border-white/10 p-6"><h1 className="text-2xl font-semibold">Assignment not found</h1><p className="mt-2 text-sm text-white/55">This demo assignment may be in another browser.</p><Link href="/instructor/assignments" className="mt-4 inline-block text-sm text-[#00D4FF]">Return to assignments →</Link></div> : <>
      <p className="mt-6 text-xs uppercase tracking-[.2em] text-[#F5B942]">Instructor demo · {assignment.status} · version {assignment.version}</p>
      <h1 className="mt-2 text-3xl font-semibold">{assignment.title}</h1>
      <p className="mt-3 text-sm text-white/60">{getUnit(assignment.unitId)?.title ?? "Circuit study"} · {assignment.audience === "all" ? "All demo learners" : `Assigned to ${assignment.targetEmail}`} · {assignment.dueDate ? `Due ${assignment.dueDate}` : "No due date"}</p>
      <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-white/75">{assignment.instructions}</p>
      <div className="mt-6"><CircuitStudy circuit={assignment.circuit} /></div>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.035] p-5"><h2 className="text-lg font-semibold">Quiz and response prompt</h2><ol className="mt-4 space-y-4">{assignment.questions.map((question, index) => <li key={question.id} className="text-sm"><p className="font-medium">{index + 1}. {question.prompt}</p><p className="mt-1 text-[#4ADE80]">Answer: {question.options[question.correctIndex]}</p><p className="mt-1 text-white/50">{question.explanation}</p></li>)}</ol><p className="mt-5 border-t border-white/10 pt-4 text-sm text-white/70">Written response: {assignment.reflectionPrompt}</p></div>
      <section className="mt-10"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Learner responses</h2><p className="mt-1 text-xs text-white/50">Quiz scores are calculated locally. Written and code responses need your review.</p></div><span className="text-sm text-[#F5B942]">{responses.length} submission{responses.length === 1 ? "" : "s"}</span></div>{responses.length === 0 ? <p className="mt-4 rounded-xl border border-white/10 p-5 text-sm text-white/55">No learner has submitted this assignment yet.</p> : <div className="mt-5 space-y-5">{responses.map((response) => <article key={response.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{response.learnerName}</h3><p className="mt-1 text-xs text-white/45">{response.learnerEmail} · {new Date(response.submittedAt).toLocaleString()} · version {response.assignmentVersion}</p></div><p className="text-sm text-[#F5B942]">{response.correctCount}/{response.totalQuestions} correct</p></div><div className="mt-5 space-y-3">{response.questions.map((question) => <div key={question.id} className="rounded-lg border border-white/10 p-3 text-sm"><p className="font-medium">{question.prompt}</p><p className={response.answers[question.id] === question.correctIndex ? "mt-1 text-[#4ADE80]" : "mt-1 text-rose-300"}>Learner chose: {question.options[response.answers[question.id]] ?? "No answer"}</p><p className="mt-1 text-white/50">Correct: {question.options[question.correctIndex]}</p></div>)}</div>{response.codeResponse && <div className="mt-5"><p className="text-xs uppercase tracking-wider text-white/40">Code response · not executed</p><pre className="mt-2 overflow-x-auto rounded-lg bg-black/20 p-3 text-xs text-white/75">{response.codeResponse}</pre></div>}<p className="mt-5 text-xs uppercase tracking-wider text-white/40">Written response</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">{response.reflection}</p><FeedbackEditor submission={response} /></article>)}</div>}</section>
    </>}
  </div></AppShell>
}
