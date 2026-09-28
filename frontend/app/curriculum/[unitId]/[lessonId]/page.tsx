"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { notFound, useParams } from "next/navigation"
import { getLesson, getUnit, units } from "@/lib/curriculum/units"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { AppShell } from "@/components/shared/AppShell"

export default function LessonPage() {
  const { unitId, lessonId } = useParams<{ unitId: string; lessonId: string }>()
  const unit = getUnit(unitId)
  const lesson = getLesson(unitId, lessonId)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const setLastLesson = useLearnerProgress((state) => state.setLastLesson)
  const completed = useLearnerProgress((state) => state.lessonsCompleted.includes(lessonId))
  const complete = useLearnerProgress((state) => state.completeLesson)
  const flatLessons = units.flatMap((item) => item.lessons.map((entry) => ({ unitId: item.id, ...entry })))
  const index = flatLessons.findIndex((entry) => entry.id === lessonId)
  const previous = flatLessons[index - 1]
  const next = flatLessons[index + 1]

  useEffect(() => { if (lesson) setLastLesson(lesson.id) }, [lesson, setLastLesson])
  if (!unit || !lesson) notFound()

  const allAnswered = lesson.checkpoints.every((checkpoint) => answers[checkpoint.id] !== undefined)
  return <AppShell variant="curriculum"><article className="mx-auto max-w-4xl px-5 py-8 text-white md:px-8">
    <nav aria-label="Breadcrumb" className="text-sm text-white/50"><Link href="/curriculum" className="hover:text-white">Curriculum</Link><span className="mx-2">/</span><Link href={`/curriculum/${unit.id}`} className="hover:text-white">{unit.title}</Link><span className="mx-2">/</span><span aria-current="page" className="text-white/75">{lesson.title}</span></nav>
    <p className="mt-8 text-xs uppercase tracking-[.22em] text-[#F5B942]">{lesson.type} · {lesson.minutes} min · Faculty review pending</p>
    <h1 className="mt-3 text-4xl font-semibold">{lesson.title}</h1>
    <div className="mt-8 space-y-5">{lesson.sections.map((section, sectionIndex) => <section key={sectionIndex} className={section.type === "callout" ? "rounded-2xl border border-[#F5B942]/30 bg-[#F5B942]/5 p-5 text-[#F5B942]" : "rounded-2xl border border-white/10 bg-white/[.035] p-6"}><p className={section.type === "heading" ? "text-2xl font-semibold" : "leading-8 text-white/75"}>{section.text}</p></section>)}</div>
    {lesson.links.map((tool) => { const separator = tool.href.includes("?") ? "&" : "?"; const href = `${tool.href}${separator}returnTo=${encodeURIComponent(`/curriculum/${unit.id}/${lesson.id}`)}`; return <Link key={tool.href} href={href} className="mt-5 inline-flex rounded-xl border border-[#00D4FF]/30 px-4 py-2.5 text-sm text-[#00D4FF] hover:bg-[#00D4FF]/10">{tool.label} →</Link> })}
    <section aria-labelledby="checkpoint-heading" className="mt-8 rounded-2xl border border-[#00D4FF]/30 bg-[#00D4FF]/5 p-6"><h2 id="checkpoint-heading" className="text-lg font-semibold">Check your understanding</h2><p className="mt-1 text-sm text-white/55">Answer each checkpoint. You can continue after reviewing the explanation.</p>
      {lesson.checkpoints.map((question, questionIndex) => { const selected = answers[question.id]; const answered = selected !== undefined; return <fieldset key={question.id} className="mt-6 border-t border-white/10 pt-5"><legend className="font-medium">{questionIndex + 1}. {question.prompt}</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => <label key={option} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${selected === optionIndex ? "border-[#00D4FF] bg-[#00D4FF]/10" : "border-white/10 hover:border-white/25"}`}><input type="radio" name={question.id} value={optionIndex} checked={selected === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} className="accent-[#00D4FF]" /><span>{option}</span></label>)}</div>{answered && <p role="status" className={`mt-3 text-sm ${selected === question.answer ? "text-[#4ADE80]" : "text-[#F5B942]"}`}>{selected === question.answer ? "Correct. " : "Not quite. "}{question.explanation}</p>}</fieldset> })}
    </section>
    {completed && <p role="status" className="mt-5 rounded-xl border border-[#4ADE80]/30 bg-[#4ADE80]/10 p-4 text-sm text-[#4ADE80]">Lesson complete. Your XP was awarded once.</p>}
    <div className="mt-6 flex flex-wrap items-center gap-3"><button type="button" disabled={!allAnswered || completed} onClick={() => complete(lesson.id, lesson.xp)} className="min-h-11 rounded-xl bg-[#00D4FF] px-5 py-3 font-semibold text-[#0A0E17] disabled:cursor-not-allowed disabled:opacity-45">{completed ? "Lesson completed" : `Complete lesson · +${lesson.xp} XP`}</button>{!allAnswered && <p className="text-xs text-white/45">Answer every checkpoint to complete the lesson.</p>}</div>
    <nav aria-label="Lesson navigation" className="mt-8 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5">{previous ? <Link href={`/curriculum/${previous.unitId}/${previous.id}`} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white">← Previous: {previous.title}</Link> : <Link href={`/curriculum/${unit.id}`} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white">← Unit overview</Link>}{next ? <Link href={`/curriculum/${next.unitId}/${next.id}`} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white">Next: {next.title} →</Link> : <Link href={`/curriculum/${unit.id}/quiz`} className="rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#0A0E17]">Take unit quiz →</Link>}</nav>
  </article></AppShell>
}
