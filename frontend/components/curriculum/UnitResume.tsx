"use client"

import Link from "next/link"
import type { Unit } from "@/lib/curriculum/types"
import { useLearnerProgress } from "@/store/use-learner-progress"

export function UnitResume({ unit }: { unit: Unit }) {
  const completed = useLearnerProgress((state) => state.lessonsCompleted)
  const quizScore = useLearnerProgress((state) => state.quizScores[unit.id])
  const lastLessonId = useLearnerProgress((state) => state.lastLessonId)
  const current = unit.lessons.find((lesson) => lesson.id === lastLessonId && !completed.includes(lesson.id))
    ?? unit.lessons.find((lesson) => !completed.includes(lesson.id))
  const href = current ? `/curriculum/${unit.id}/${current.id}` : `/curriculum/${unit.id}/quiz`
  const label = current ? (lastLessonId === current.id ? `Resume: ${current.title}` : `Start: ${current.title}`) : "Continue to unit quiz"
  return <div className="mt-5 flex flex-wrap items-center gap-3"><Link href={href} className="inline-flex min-h-11 items-center rounded-xl bg-[#00D4FF] px-5 py-3 text-sm font-semibold text-[#0A0E17]">{label} →</Link>{quizScore !== undefined && <p className="text-sm text-white/55">Best quiz score: <span className="text-[#F5B942]">{quizScore}%</span></p>}</div>
}
