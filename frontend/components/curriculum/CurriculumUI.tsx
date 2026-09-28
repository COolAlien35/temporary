"use client"

import Link from "next/link"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { units } from "@/lib/curriculum/units"
import { levelForXp } from "@/lib/curriculum/xp"
import type { Lesson, Unit } from "@/lib/curriculum/types"

function lessonHref(lessonId: string) {
  const unit = units.find((candidate) => candidate.lessons.some((lesson) => lesson.id === lessonId))
  return unit ? `/curriculum/${unit.id}/${lessonId}` : "/curriculum"
}

export function CourseHero() {
  const { xp, streak, lastLessonId, lessonsCompleted } = useLearnerProgress()
  const level = levelForXp(xp)
  const allLessons = units.flatMap((unit) => unit.lessons)
  const lastIndex = allLessons.findIndex((lesson) => lesson.id === lastLessonId)
  const lastLesson = lastIndex >= 0 ? allLessons[lastIndex] : undefined
  const resumeId = lastLesson && !lessonsCompleted.includes(lastLesson.id) ? lastLesson.id : allLessons.slice(lastIndex + 1).find((lesson) => !lessonsCompleted.includes(lesson.id))?.id ?? allLessons.find((lesson) => !lessonsCompleted.includes(lesson.id))?.id
  return <section className="rounded-3xl border border-white/10 bg-white/[.04] p-6 shadow-2xl">
    <p className="text-sm uppercase tracking-[.25em] text-[#00D4FF]">QuantumLoop Academy</p>
    <h1 className="mt-3 text-4xl font-semibold">Curriculum</h1>
    <p className="mt-2 max-w-2xl text-white/60">A structured path from qubits to quantum engineering. Learn a concept, test it, then build it.</p>
    <div className="mt-6 grid gap-3 sm:grid-cols-4">{[["XP", xp], ["Level", level.title], ["Streak", `${streak} days`], ["Units", units.length]].map(([key, value]) => <div className="rounded-2xl border border-white/10 bg-black/20 p-4" key={String(key)}><p className="text-xs text-white/45">{key}</p><p className="mt-1 text-xl font-semibold text-[#F5B942]">{value}</p></div>)}</div>
    {resumeId && <Link href={lessonHref(resumeId)} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#00D4FF] px-5 py-3 font-semibold text-[#0A0E17]">{lastLessonId ? "Resume your last lesson" : "Start the learning path"} <span className="ml-2" aria-hidden="true">→</span></Link>}
  </section>
}

export function UnitCard({ unit, index = 0 }: { unit: Unit; index?: number }) {
  const { lessonsCompleted, quizScores, quizzesCompleted } = useLearnerProgress()
  const done = unit.lessons.filter((lesson) => lessonsCompleted.includes(lesson.id)).length
  const prerequisite = unit.prerequisites.map((id) => units.find((item) => item.id === id)).find((item) => item && !item.lessons.every((lesson) => lessonsCompleted.includes(lesson.id)))
  const locked = Boolean(prerequisite)
  return <Link aria-label={`${unit.title}, ${done} of ${unit.lessons.length} lessons complete${locked ? `, recommended after ${prerequisite?.title}` : ""}`} href={`/curriculum/${unit.id}`} className={`group rounded-2xl border bg-white/[.035] p-5 transition hover:-translate-y-1 hover:border-[#00D4FF]/50 ${locked ? "border-white/5 opacity-75" : "border-white/10"}`}>
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wider text-[#00D4FF]">Unit {String(index + 1).padStart(2, "0")} · {unit.level}</p><h2 className="mt-2 text-xl font-semibold">{unit.title}</h2></div><span className="rounded-full border border-[#F5B942]/30 px-2 py-1 text-xs text-[#F5B942]">{done}/{unit.lessons.length}</span></div>
    <p className="mt-3 text-sm text-white/55">{unit.tagline}</p>
    <div className="mt-5 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-[#00D4FF]" style={{ width: `${unit.lessons.length ? done / unit.lessons.length * 100 : 0}%` }} /></div>
    <div className="mt-4 flex justify-between text-xs text-white/45"><span>{unit.minutes} min · {unit.xpTotal} XP</span><span>{quizzesCompleted.includes(unit.id) ? `Quiz passed · best ${quizScores[unit.id]}%` : locked ? `Recommended after ${prerequisite?.title}` : "View unit →"}</span></div>
  </Link>
}

export function LessonList({ unit }: { unit: Unit }) {
  const { lessonsCompleted } = useLearnerProgress()
  const nextIncomplete = unit.lessons.find((lesson) => !lessonsCompleted.includes(lesson.id))
  return <ol className="grid gap-3">{unit.lessons.map((lesson: Lesson, index) => {
    const complete = lessonsCompleted.includes(lesson.id)
    const current = !complete && lesson.id === nextIncomplete?.id
    return <li key={lesson.id}><Link aria-current={current ? "step" : undefined} href={`/curriculum/${unit.id}/${lesson.id}`} className={`flex min-h-[76px] items-center gap-4 rounded-xl border bg-white/[.03] p-4 transition hover:border-[#00D4FF]/50 ${current ? "border-[#00D4FF]/40" : "border-white/10"}`}>
      <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-full text-sm ${complete ? "bg-[#4ADE80]/15 text-[#4ADE80]" : "bg-[#00D4FF]/10 text-[#00D4FF]"}`}>{complete ? "✓" : index + 1}</span>
      <span className="min-w-0 flex-1"><span className="block font-medium">{lesson.title}</span><span className="block text-xs text-white/45">{lesson.type} · {lesson.minutes} min · {complete ? "Complete" : current ? "Up next" : "Not started"}</span></span>
      <span className="shrink-0 text-sm text-[#F5B942]">+{lesson.xp} XP</span>
    </Link></li>
  })}</ol>
}
