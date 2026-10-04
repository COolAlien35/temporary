"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { connectedLearningLoopApi } from "@/lib/services/connected-auth"
import type { LearnerUnit } from "@/lib/services/contracts"
import { useSession } from "@/store/use-session"

export function ConnectedCurriculum() {
  const learnerId = useSession((state) => state.user?.id ?? null)
  const [units, setUnits] = useState<LearnerUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!learnerId) return
    let active = true
    setLoading(true)
    setError("")
    void connectedLearningLoopApi().listCurriculumUnits()
      .then((items) => { if (active) setUnits(items) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load the curriculum.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [learnerId, retry])

  return <div className="relative z-0 mx-auto max-w-5xl px-5 py-10 text-white md:px-10">
    <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#4FD1E8]">Connected curriculum</p>
    <h1 className="mt-3 text-4xl font-semibold">Learn by experimenting</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">The Superposition lesson is connected to your saved predictions, circuits, Aer runs, and tutor history. Other units are visible as a course outline while their connected learning flows are built.</p>
    {loading && <p role="status" className="mt-8 text-sm text-white/60">Loading current curriculum…</p>}
    {error && <p role="alert" className="mt-8 text-sm text-red-300">{error} <button type="button" onClick={() => setRetry((value) => value + 1)} className="ml-2 underline">Retry</button></p>}
    {!loading && !error && <ol className="mt-8 grid gap-4 sm:grid-cols-2">
      {units.map((unit) => {
        const supported = unit.id === "u1" && !unit.is_placeholder && unit.lessons.some((lesson) => lesson.id === "u1-quantum-foundations")
        return <li key={unit.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <p className="text-xs uppercase tracking-wider text-[#4FD1E8]">{unit.level} · {unit.id}</p>
          <h2 className="mt-2 text-xl font-semibold">{unit.title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">{unit.tagline}</p>
          <p className="mt-3 text-xs text-white/40">Content version {unit.content_version} · {unit.review_status.replaceAll("_", " ")}</p>
          {supported ? <Link href="/lab/superposition" className="mt-5 inline-flex rounded-full bg-[#4FD1E8] px-4 py-2 text-sm font-semibold text-[#0A0E17]">Open connected Superposition lesson</Link> : <p className="mt-5 text-xs text-white/45">Connected lesson flow coming later</p>}
        </li>
      })}
    </ol>}
  </div>
}
