"use client"

import Link from "next/link"
import { useParams, notFound } from "next/navigation"
import { useState } from "react"
import { AppShell } from "@/components/shared/AppShell"
import { getUnit } from "@/lib/curriculum/units"
import { getQuizQuestions } from "@/lib/curriculum/questions"
import { useLearnerProgress } from "@/store/use-learner-progress"

export default function QuizPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const unit = getUnit(unitId)
  const questions = getQuizQuestions(unitId)
  const completeQuiz = useLearnerProgress((state) => state.completeUnitQuiz)
  const bestScore = useLearnerProgress((state) => state.quizScores[unitId])
  const passedBefore = useLearnerProgress((state) => state.quizzesCompleted.includes(unitId))
  const attemptCount = useLearnerProgress((state) => state.quizAttempts[unitId]?.length ?? 0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  if (!unit || questions.length === 0) notFound()

  const answeredCount = questions.filter((item) => answers[item.id] !== undefined).length
  const score = questions.filter((item) => answers[item.id] === item.answer).length
  const percentage = Math.round(score / questions.length * 100)
  const passed = percentage >= 70
  const retry = () => { setAnswers({}); setSubmitted(false); setError("") }

  return <AppShell variant="curriculum"><div className="mx-auto max-w-3xl px-5 py-8 text-white md:px-8">
    <nav aria-label="Breadcrumb" className="text-sm text-white/50"><Link href="/curriculum">Curriculum</Link><span className="mx-2">/</span><Link href={`/curriculum/${unitId}`}>{unit.title}</Link><span className="mx-2">/</span><span aria-current="page" className="text-white/75">Unit quiz</span></nav>
    <p className="mt-8 text-xs uppercase tracking-[.2em] text-[#F5B942]">Knowledge check · Pass mark 70%</p><h1 className="mt-2 text-4xl font-semibold">{unit.title} quiz</h1><p className="mt-2 text-white/55">{questions.length} questions. Review the explanations and retry any time.</p>
    {bestScore !== undefined && <p className="mt-4 text-sm text-white/55">Best score: <span className="text-[#F5B942]">{bestScore}%</span><span className="ml-2">· {attemptCount} attempt{attemptCount === 1 ? "" : "s"}</span>{passedBefore && <span className="ml-2 text-[#4ADE80]">· passed</span>}</p>}
    <form onSubmit={(event) => { event.preventDefault(); if (answeredCount !== questions.length) { setError(`Answer all ${questions.length} questions before submitting.`); return } setError(""); setSubmitted(true); completeQuiz(unitId, percentage, Math.max(5, Math.round(unit.xpTotal / 2)), answers) }}>
      <div className="mt-7 space-y-4">{questions.map((item, questionIndex) => <fieldset key={item.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><legend className="px-1 text-sm font-medium">Question {questionIndex + 1} of {questions.length}</legend><p className="mt-2 text-base">{item.prompt}</p><div className="mt-4 grid gap-2">{item.options.map((option, optionIndex) => { const selected = answers[item.id] === optionIndex; const isCorrect = optionIndex === item.answer; const stateStyle = submitted && isCorrect ? "border-[#4ADE80]/50 bg-[#4ADE80]/10" : submitted && selected ? "border-rose-400/50 bg-rose-400/10" : selected ? "border-[#00D4FF] bg-[#00D4FF]/10" : "border-white/10 hover:border-white/25"; return <label key={option} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${stateStyle}`}><input type="radio" name={item.id} value={optionIndex} checked={selected} disabled={submitted} onChange={() => { setAnswers((current) => ({ ...current, [item.id]: optionIndex })); setError("") }} className="accent-[#00D4FF]" /><span className="flex-1">{option}</span>{submitted && isCorrect && <span className="text-xs text-[#4ADE80]">Correct</span>}</label> })}</div>{submitted && <p className={`mt-3 text-sm ${answers[item.id] === item.answer ? "text-[#4ADE80]" : "text-[#F5B942]"}`}>{answers[item.id] === item.answer ? "Correct. " : "Review: "}{item.explanation}</p>}</fieldset>)}</div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {!submitted ? <div className="mt-6 flex flex-wrap items-center gap-3"><button type="submit" className="min-h-11 rounded-xl bg-[#00D4FF] px-5 py-3 font-semibold text-[#0A0E17]">Submit quiz</button><span className="text-sm text-white/45">{answeredCount}/{questions.length} answered</span></div> : <section aria-live="polite" className={`mt-6 rounded-2xl border p-5 ${passed ? "border-[#4ADE80]/30 bg-[#4ADE80]/10" : "border-[#F5B942]/30 bg-[#F5B942]/10"}`}><p className="text-2xl font-semibold">{score}/{questions.length} correct · {percentage}%</p><p className="mt-1 text-white/70">{passed ? "Passed. Unit quiz XP has been awarded once." : "Not passed yet. Review the lesson links and try again."}</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={retry} className="min-h-11 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium">Retry quiz</button><Link href={`/curriculum/${unitId}`} className="min-h-11 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium">{passed ? "Back to unit" : "Review lessons"}</Link></div></section>}
    </form>
  </div></AppShell>
}
