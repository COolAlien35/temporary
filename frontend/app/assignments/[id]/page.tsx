"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { AppShell } from "@/components/shared/AppShell"
import { CircuitStudy } from "@/components/coursework/CircuitStudy"
import { canAccessAssignment } from "@/lib/coursework/types"
import { getUnit } from "@/lib/curriculum/units"
import { encodeCircuit } from "@/lib/studio/url-codec"
import { useCoursework } from "@/store/use-coursework"
import { useSession } from "@/store/use-session"
import { useLearnerProgress } from "@/store/use-learner-progress"

export default function AssignmentPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const user = useSession((state) => state.user)
  const assignments = useCoursework((state) => state.assignments)
  const submissions = useCoursework((state) => state.submissions)
  const responseDrafts = useCoursework((state) => state.responseDrafts)
  const saveResponseDraft = useCoursework((state) => state.saveResponseDraft)
  const submitResponse = useCoursework((state) => state.submitResponse)
  const recordAssessmentAttempt = useLearnerProgress((state) => state.recordAssessmentAttempt)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [reflection, setReflection] = useState("")
  const [codeResponse, setCodeResponse] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const assignment = assignments.find((item) => item.id === id)
  const allowed = Boolean(assignment && user && canAccessAssignment(assignment, user.email))
  const attempts = user ? submissions.filter((item) => item.assignmentId === id && item.learnerId === user.id).sort((a, b) => b.submittedAt - a.submittedAt) : []
  const latest = attempts[0]

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!user || !id) return
    const saved = responseDrafts[`${id}:${user.id}`]
    setAnswers(saved?.answers ?? {})
    setReflection(saved?.reflection ?? "")
    setCodeResponse(saved?.codeResponse ?? assignment?.starterCode ?? "")
  }, [id, user?.id, assignment?.id, assignment?.starterCode]) // Restore when the learner or assignment changes; editing remains local until Save draft.

  function saveDraft() {
    if (!user || !assignment) return
    saveResponseDraft(assignment.id, user.id, answers, reflection, codeResponse)
    setMessage("Response draft saved in this browser.")
    setError("")
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !assignment) return
    setError(""); setMessage("")
    try {
      const submissionId = submitResponse(assignment, user, answers, reflection, codeResponse)
      const correctCount = assignment.questions.filter((question) => answers[question.id] === question.correctIndex).length
      recordAssessmentAttempt({ id: submissionId, assessmentId: assignment.id, learnerId: user.id, kind: "assignment", score: Math.round(correctCount / assignment.questions.length * 100), status: "pending", passed: null, submittedAt: Date.now(), feedback: ["Quiz auto-scored; written and code responses await instructor review."], snapshot: { circuit: structuredClone(assignment.circuit), answers: { ...answers }, code: assignment.exerciseKind === "code" ? codeResponse : undefined } })
      setAnswers({}); setReflection(""); setCodeResponse("")
      setMessage("Response submitted. Quiz feedback is below; your written answer and any code await instructor review.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit your response.")
    }
  }

  return <AppShell variant="curriculum"><div className="mx-auto max-w-4xl py-6">
    <Link href="/assignments" className="text-sm text-[#00D4FF]">← Assigned work</Link>
    {!mounted ? <p className="mt-8 text-sm text-white/50">Loading assignment...</p> : !user ? <div className="mt-8 rounded-2xl border border-white/10 p-6"><h1 className="text-2xl font-semibold">Sign in to respond</h1><Link href={`/login?next=${encodeURIComponent(`/assignments/${id}`)}`} className="mt-4 inline-block text-sm text-[#00D4FF]">Go to login →</Link></div> : !assignment || !allowed ? <div className="mt-8 rounded-2xl border border-white/10 p-6"><h1 className="text-2xl font-semibold">Assignment unavailable</h1><p className="mt-2 text-sm text-white/55">This assignment was not found or is not assigned to this demo profile.</p><Link href="/assignments" className="mt-4 inline-block text-sm text-[#00D4FF]">Return to assigned work →</Link></div> : <>
      <p className="mt-6 text-xs uppercase tracking-[.2em] text-[#F5B942]">{getUnit(assignment.unitId)?.title ?? "Circuit study"} · assigned work</p>
      <h1 className="mt-2 text-3xl font-semibold">{assignment.title}</h1>
      <p className="mt-3 text-sm leading-6 text-white/65">{assignment.instructions}</p>
      <p className="mt-3 text-xs text-white/45">{assignment.dueDate ? `Due ${assignment.dueDate} · date is informational in this demo` : "No due date"} · version {assignment.version}</p>
      <div className="mt-7"><CircuitStudy circuit={assignment.circuit} /><button type="button" onClick={() => { saveResponseDraft(assignment.id, user.id, answers, reflection, codeResponse); router.push(`/studio#c=${encodeCircuit(assignment.circuit)}`) }} className="mt-3 text-sm text-[#00D4FF]">Open this circuit in Studio →</button></div>

      <form onSubmit={submit} className="mt-8 space-y-6"><div><h2 className="text-xl font-semibold">Circuit quiz</h2><p className="mt-1 text-xs text-white/50">Choose one answer for each question. Answers are checked against the instructor's key when you submit.</p></div>
        {assignment.questions.map((question, index) => <fieldset key={question.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><legend className="px-1 text-sm font-semibold">Question {index + 1}</legend><p className="mt-1 text-sm text-white/80">{question.prompt}</p><div className="mt-4 grid gap-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${answers[question.id] === optionIndex ? "border-[#00D4FF] bg-[#00D4FF]/10" : "border-white/10 hover:border-white/25"}`}><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} className="mt-0.5 accent-[#00D4FF]" /><span>{option}</span></label>)}</div></fieldset>)}
        {assignment.exerciseKind === "code" && <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><label htmlFor="learner-code" className="text-sm font-semibold">Code response</label><p className="mt-2 text-xs text-white/50">Code is saved as text for instructor review. It is not executed or automatically graded.</p><textarea id="learner-code" rows={9} value={codeResponse} onChange={(event) => setCodeResponse(event.target.value)} spellCheck={false} className="mt-4 w-full rounded-lg border border-white/15 bg-[#10141F] p-3 font-mono text-sm text-white outline-none focus:border-[#00D4FF]" placeholder={assignment.starterCode || "Write your solution here"} /></div>}
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><label htmlFor="learner-reflection" className="text-sm font-semibold">Written response</label><p className="mt-2 text-sm text-white/70">{assignment.reflectionPrompt}</p><textarea id="learner-reflection" rows={5} value={reflection} onChange={(event) => setReflection(event.target.value)} className="mt-4 w-full rounded-lg border border-white/15 bg-[#10141F] p-3 text-sm text-white outline-none focus:border-[#00D4FF]" placeholder="Explain your reasoning..." /></div>
        {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}{message && <p role="status" className="rounded-lg border border-[#4ADE80]/30 bg-[#4ADE80]/10 p-3 text-sm text-[#4ADE80]">{message}</p>}
        <div className="flex flex-wrap gap-3"><button type="button" onClick={saveDraft} className="rounded-lg border border-[#00D4FF]/40 px-4 py-2.5 text-sm text-[#00D4FF]">Save response draft</button><button type="submit" className="rounded-lg bg-[#00D4FF] px-4 py-2.5 text-sm font-semibold text-[#0A0E17]">Submit response</button></div>
      </form>

      <section className="mt-10"><h2 className="text-xl font-semibold">Your submissions</h2>{attempts.length === 0 ? <p className="mt-3 text-sm text-white/50">No response submitted yet.</p> : <div className="mt-4 space-y-4">{attempts.map((attempt, index) => <article key={attempt.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">Attempt {attempts.length - index}</h3><p className="text-sm text-[#F5B942]">{attempt.correctCount}/{attempt.totalQuestions} quiz answers correct</p></div><p className="mt-1 text-xs text-white/40">Submitted {new Date(attempt.submittedAt).toLocaleString()} · version {attempt.assignmentVersion}</p><div className="mt-4 space-y-3">{attempt.questions.map((question) => <div key={question.id} className="rounded-lg border border-white/10 p-3 text-sm"><p className="font-medium">{question.prompt}</p><p className={attempt.answers[question.id] === question.correctIndex ? "mt-1 text-[#4ADE80]" : "mt-1 text-rose-300"}>Your answer: {question.options[attempt.answers[question.id]] ?? "No answer"}</p><p className="mt-1 text-white/55">Correct: {question.options[question.correctIndex]}. {question.explanation}</p></div>)}</div>{attempt.codeResponse && <div className="mt-4"><p className="text-xs uppercase tracking-wider text-white/40">Your code response</p><pre className="mt-2 overflow-x-auto rounded-lg bg-black/20 p-3 text-xs text-white/70">{attempt.codeResponse}</pre></div>}<p className="mt-4 text-xs uppercase tracking-wider text-white/40">Your written response</p><p className="mt-1 whitespace-pre-wrap text-sm text-white/70">{attempt.reflection}</p><div className="mt-4 rounded-lg border border-[#00D4FF]/20 bg-[#00D4FF]/5 p-3"><p className="text-xs uppercase tracking-wider text-[#00D4FF]">Instructor feedback</p><p className="mt-1 whitespace-pre-wrap text-sm text-white/70">{attempt.instructorFeedback || "Awaiting instructor review."}</p></div></article>)}</div>}{latest && <p className="mt-3 text-xs text-white/45">You may submit another attempt. Earlier submissions and feedback remain available.</p>}</section>
    </>}
  </div></AppShell>
}
