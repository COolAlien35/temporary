"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AppShell } from "@/components/shared/AppShell"
import { challenges } from "@/lib/challenges/catalog"
import { useLearnerProgress } from "@/store/use-learner-progress"

export default function ChallengesPage() {
  const attempts = useLearnerProgress((state) => state.challengeAttempts)
  const [topic, setTopic] = useState("All topics")
  const [difficulty, setDifficulty] = useState("All levels")
  const [status, setStatus] = useState("All challenges")
  const [type, setType] = useState("All types")
  const topics = ["All topics", ...new Set(challenges.map((challenge) => challenge.topic))]
  const filtered = useMemo(() => challenges.filter((challenge) => {
    const history = attempts.filter((attempt) => attempt.challengeId === challenge.id)
    return (topic === "All topics" || challenge.topic === topic)
      && (difficulty === "All levels" || challenge.difficulty === difficulty)
      && (type === "All types" || challenge.type === type)
      && (status === "All challenges" || (status === "Completed" ? history.some((attempt) => attempt.passed) : !history.some((attempt) => attempt.passed)))
  }), [attempts, difficulty, status, topic, type])

  return <AppShell variant="curriculum"><div className="min-h-screen px-5 py-10 text-white md:px-10"><div className="mx-auto max-w-6xl">
    <Link href="/curriculum" className="text-sm text-[#00D4FF]">← Curriculum</Link>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm uppercase tracking-[.25em] text-[#F5B942]">Challenge arena</p><h1 className="mt-3 text-4xl font-semibold">Build, run, prove it.</h1><p className="mt-3 max-w-2xl text-white/55">Solve circuit problems against measured outcomes and clear constraints. Every submission keeps its circuit snapshot and feedback.</p></div><Link href="/curriculum/practice" className="rounded-xl border border-white/15 px-4 py-3 text-sm text-white/75 hover:border-[#00D4FF]/50">Concept practice →</Link></div>
    <div className="mt-8 flex flex-wrap gap-3" aria-label="Challenge filters">
      <label className="text-xs text-white/55">Topic<select aria-label="Topic" value={topic} onChange={(event) => setTopic(event.target.value)} className="ml-2 rounded-lg border border-white/10 bg-[#10141F] px-3 py-2 text-sm text-white">{topics.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="text-xs text-white/55">Difficulty<select aria-label="Difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="ml-2 rounded-lg border border-white/10 bg-[#10141F] px-3 py-2 text-sm text-white">{["All levels", "Beginner", "Intermediate"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="text-xs text-white/55">Type<select aria-label="Challenge type" value={type} onChange={(event) => setType(event.target.value)} className="ml-2 rounded-lg border border-white/10 bg-[#10141F] px-3 py-2 text-sm text-white">{["All types", "Circuit", "Code"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="text-xs text-white/55">Status<select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)} className="ml-2 rounded-lg border border-white/10 bg-[#10141F] px-3 py-2 text-sm text-white">{["All challenges", "Not completed", "Completed"].map((item) => <option key={item}>{item}</option>)}</select></label>
    </div>
    {(type === "All types" || type === "Code") && (topic === "All topics" || topic === "Entanglement") && (difficulty === "All levels" || difficulty === "Intermediate") && status !== "Completed" && <article className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><p className="text-xs uppercase tracking-wider text-amber-200">Code · Entanglement · Intermediate</p><h2 className="mt-3 text-xl font-semibold">Prepare a Bell pair in code</h2><p className="mt-2 text-sm text-white/55">Review the prompt and draft a solution. Remote grading is awaiting a backend service.</p><Link href="/challenges/code-practice" className="mt-4 inline-block rounded-lg border border-amber-300/30 px-4 py-2 text-sm text-amber-100">Open code practice →</Link></article>}
    <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{filtered.map((challenge) => {
      const history = attempts.filter((attempt) => attempt.challengeId === challenge.id)
      const best = history.length ? Math.max(...history.map((attempt) => attempt.score)) : null
      return <article key={challenge.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="flex items-center justify-between text-xs"><span className="text-[#00D4FF]">{challenge.topic}</span><span className="text-white/45">{challenge.difficulty}</span></div><h2 className="mt-4 text-xl font-semibold">{challenge.title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-white/55">{challenge.description}</p><p className="mt-4 rounded-xl bg-black/20 p-3 text-xs text-white/65"><span className="text-white/40">Target · </span>{challenge.target}</p><div className="mt-4 flex items-center justify-between"><span className="text-xs text-white/45">{history.length ? `${history.length} attempt${history.length === 1 ? "" : "s"} · best ${best}%` : `${challenge.qubits} qubit${challenge.qubits === 1 ? "" : "s"} · ${challenge.maxGates} gates max`}</span><Link className="rounded-lg bg-[#00D4FF] px-3 py-2 text-sm font-semibold text-[#0A0E17]" href={`/challenges/${challenge.id}`}>{history.length ? "Continue" : "Solve"} →</Link></div></article>
    })}</div>
    {filtered.length === 0 && (type !== "Code" || status === "Completed" || (topic !== "All topics" && topic !== "Entanglement") || (difficulty !== "All levels" && difficulty !== "Intermediate")) && <p className="mt-8 rounded-xl border border-white/10 p-6 text-white/60">No challenges match these filters.</p>}
  </div></div></AppShell>
}
