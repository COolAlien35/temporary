"use client"

import Link from "next/link"
import { useState } from "react"
import { AppShell } from "@/components/shared/AppShell"
import { units } from "@/lib/curriculum/units"
import { useCoursework } from "@/store/use-coursework"

export default function InstructorCurriculumPage() {
  const [selectedUnitId, setSelectedUnitId] = useState(units[0].id)
  const [selectedLessonId, setSelectedLessonId] = useState(units[0].lessons[0].id)
  const assignments = useCoursework((state) => state.assignments)
  const unit = units.find((item) => item.id === selectedUnitId) ?? units[0]
  const lesson = unit.lessons.find((item) => item.id === selectedLessonId) ?? unit.lessons[0]
  const relatedAssignments = assignments.filter((item) => item.unitId === unit.id)

  return <AppShell variant="instructor"><div className="mx-auto max-w-6xl px-5 py-10 text-white md:px-8">
    <Link href="/instructor" className="text-sm text-[#00D4FF]">← Instructor overview</Link>
    <p className="mt-7 text-xs uppercase tracking-[.22em] text-[#F5B942]">Teaching content · faculty review pending</p><h1 className="mt-2 text-4xl font-semibold">Curriculum review</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">Browse the same lessons learners see, inspect the scaffolded content, and connect a unit to a circuit assessment. Content in this demo has not been faculty approved.</p>
    <div className="mt-7 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]"><nav aria-label="Curriculum units" className="space-y-2">{units.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedUnitId(item.id); setSelectedLessonId(item.lessons[0].id) }} aria-current={item.id === unit.id ? "page" : undefined} className={`w-full rounded-xl border p-4 text-left ${item.id === unit.id ? "border-[#00D4FF]/40 bg-[#00D4FF]/10" : "border-white/10 bg-white/[.03]"}`}><span className="text-xs uppercase tracking-wider text-white/40">{item.id} · {item.level}</span><span className="mt-1 block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-white/45">{item.lessons.length} lesson{item.lessons.length === 1 ? "" : "s"}</span></button>)}</nav>
      <div><section className="rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-7"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-[#00D4FF]">{unit.level} · {unit.minutes} minutes</p><h2 className="mt-2 text-2xl font-semibold">{unit.title}</h2><p className="mt-2 text-sm text-white/55">{unit.tagline}</p></div><span className="h-fit rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs text-amber-200">Faculty review pending</span></div><div className="mt-5 flex flex-wrap gap-3 text-sm"><Link href={`/curriculum/${unit.id}`} className="text-[#00D4FF]">Preview learner unit →</Link><Link href={`/curriculum/${unit.id}/quiz`} className="text-[#00D4FF]">Preview unit quiz →</Link><Link href="/instructor/assessments" className="text-[#00D4FF]">Create assessment →</Link></div><p className="mt-5 text-xs text-white/45">{relatedAssignments.length} local assignment{relatedAssignments.length === 1 ? "" : "s"} linked to this unit.</p></section>
        <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-7"><h2 className="text-lg font-semibold">Lesson preview</h2><label htmlFor="lesson-select" className="mt-4 block text-xs text-white/55">Choose lesson</label><select id="lesson-select" value={lesson.id} onChange={(event) => setSelectedLessonId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#10141F] px-4 py-3 text-sm text-white">{unit.lessons.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><p className="mt-5 text-xs uppercase tracking-wider text-[#F5B942]">{lesson.type} · {lesson.minutes} minutes</p><h3 className="mt-2 text-xl font-semibold">{lesson.title}</h3><div className="mt-4 space-y-3 text-sm leading-6 text-white/65">{lesson.sections.filter((block) => block.type !== "heading").map((block, index) => <p key={`${block.type}-${index}`} className={block.type === "callout" ? "rounded-xl border border-amber-300/20 bg-amber-300/5 p-3" : ""}>{block.text}</p>)}</div><p className="mt-5 text-xs text-white/45">{lesson.checkpoints.length} checkpoint{lesson.checkpoints.length === 1 ? "" : "s"}. Open the learner page to inspect interactions.</p><Link href={`/curriculum/${unit.id}/${lesson.id}`} className="mt-4 inline-block rounded-xl bg-[#00D4FF] px-4 py-3 text-sm font-semibold text-[#0A0E17]">Open learner lesson →</Link></section>
      </div></div>
  </div></AppShell>
}
