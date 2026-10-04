"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLab } from "@/lib/lab-context"
import { connectedLearningLoopApi } from "@/lib/services/connected-auth"
import type { LearnerUnit } from "@/lib/services/contracts"
import { useSession } from "@/store/use-session"
import { StageHeader } from "./stage-header"

export function ConnectedLearn() {
  const { advanceStage } = useLab()
  const learnerId = useSession((state) => state.user?.id ?? null)
  const [unit, setUnit] = useState<LearnerUnit | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!learnerId) return
    let active = true
    setLoading(true)
    setError("")
    void connectedLearningLoopApi().getCurriculumUnit("u1")
      .then((saved) => {
        if (!active) return
        if (saved.is_placeholder || !saved.lessons.some((lesson) => lesson.id === "u1-quantum-foundations")) {
          throw new Error("The Superposition lesson is unavailable.")
        }
        setUnit(saved)
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load the lesson.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [learnerId, reload])

  const lesson = unit?.lessons.find((item) => item.id === "u1-quantum-foundations")
  if (!learnerId) return <div className="mx-auto max-w-2xl"><StageHeader eyebrow="Stage 1 of 9 · Connected Lesson" title="Superposition" /><p role="status" className="mt-4 text-sm text-muted-foreground">Sign in to open the current lesson.</p><Link href="/login" className="mt-4 inline-block text-sm font-semibold text-primary">Go to login →</Link></div>

  return <div className="mx-auto max-w-2xl">
    <StageHeader eyebrow="Stage 1 of 9 · Connected Lesson" title={lesson?.title ?? "Superposition"} action={lesson && <button type="button" onClick={() => advanceStage(1, 2)} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black">Formulate Hypothesis →</button>} />
    {loading && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Loading the current lesson…</p>}
    {error && <p role="alert" className="text-sm text-rose-200">{error} <button type="button" onClick={() => setReload((value) => value + 1)} className="ml-2 underline">Retry</button></p>}
    {lesson && unit && <article className="space-y-5">
      <p className="text-xs text-muted-foreground">Unit {unit.id} · content version {unit.content_version} · {unit.review_status.replaceAll("_", " ")}</p>
      {lesson.sections.map((section, index) => {
        if (section.type === "heading") return <h2 key={index} className="text-lg font-semibold">{section.text}</h2>
        if (section.type === "math" || section.type === "code") return <pre key={index} className="overflow-x-auto rounded-lg border border-border bg-card/60 p-4 font-mono text-sm">{section.text}</pre>
        if (section.type === "callout") return <aside key={index} className="rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm">{section.text}</aside>
        return <p key={index} className="text-sm leading-relaxed text-muted-foreground">{section.text}</p>
      })}
      {lesson.takeaways.length > 0 && <section aria-label="Lesson takeaways" className="rounded-xl border border-border bg-card/60 p-5">
        <h2 className="text-sm font-semibold">Key takeaways</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">{lesson.takeaways.map((takeaway) => <li key={takeaway}>{takeaway}</li>)}</ul>
      </section>}
    </article>}
  </div>
}
