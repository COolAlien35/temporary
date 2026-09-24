"use client"
import Link from "next/link"
import { useState } from "react"
import { AppShell } from "@/components/shared/AppShell"
import { questions } from "@/lib/curriculum/questions"

const practiceTracks = [
  { id: "circuits", title: "Circuit building", description: "Construct gates and states from a blank canvas.", color: "cyan", icon: "◈" },
  { id: "optimization", title: "Optimization", description: "Reduce gate count, depth, and execution cost.", color: "amber", icon: "↗" },
  { id: "debugging", title: "Debugging", description: "Find the broken gate, wire, or assumption.", color: "rose", icon: "⌁" },
  { id: "measurement", title: "Measurement", description: "Read distributions and predict outcomes.", color: "emerald", icon: "◌" },
  { id: "theory", title: "Quantum theory", description: "Strengthen the concepts behind every circuit.", color: "violet", icon: "∑" },
]

export default function PracticePage() {
  const [track, setTrack] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const q = questions[index % questions.length]

  return <AppShell variant="curriculum"><main className="min-h-screen px-5 py-10 text-white md:px-10"><div className="mx-auto max-w-5xl"><Link href="/contests" className="text-sm text-[#00D4FF]">← Contests</Link><div className="mt-8 max-w-2xl"><p className="text-sm uppercase tracking-[.25em] text-[#F5B942]">Practice arena</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Choose your challenge</h1><p className="mt-3 text-white/55">Pick a problem type and build the skill you want to sharpen before your next contest.</p></div>{!track ? <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{practiceTracks.map((item) => <button key={item.id} onClick={() => setTrack(item.id)} className="group rounded-2xl border border-white/10 bg-white/[.04] p-5 text-left transition hover:-translate-y-1 hover:border-[#00D4FF]/50 hover:bg-white/[.07]"><span className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-2xl text-[#00D4FF]">{item.icon}</span><h2 className="mt-5 text-lg font-semibold">{item.title}</h2><p className="mt-2 text-sm leading-6 text-white/50">{item.description}</p><span className="mt-5 inline-block text-xs font-semibold uppercase tracking-[.18em] text-[#00D4FF]">Start track →</span></button>)}</div> : <section className="mt-10 rounded-3xl border border-white/10 bg-white/[.04] p-7"><button onClick={() => { setTrack(null); setSelected(null) }} className="text-sm text-[#00D4FF]">← Choose another type</button><p className="mt-8 text-sm text-white/45">{practiceTracks.find((item) => item.id === track)?.title} · Question {index + 1}</p><h2 className="mt-3 text-xl font-medium">{q.prompt}</h2><div className="mt-6 grid gap-3">{q.options.map((option, optionIndex) => <button key={option} onClick={() => setSelected(optionIndex)} className={`rounded-xl border p-4 text-left ${selected === optionIndex ? "border-[#00D4FF] bg-[#00D4FF]/10" : "border-white/10"}`}>{option}</button>)}</div>{selected !== null && <div className="mt-5 rounded-xl bg-[#4ADE80]/10 p-4 text-sm text-white/75">{selected === q.answer ? "Correct. " : "Review this concept. "}{q.explanation}</div>}<button onClick={() => { setIndex((value) => value + 1); setSelected(null) }} className="mt-6 rounded-xl bg-[#00D4FF] px-5 py-3 font-semibold text-[#0A0E17]">Next question</button></section>}</div></main></AppShell>
}
