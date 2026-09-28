"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { useLearnerProgress } from "@/store/use-learner-progress"

const options = ["It collapses to a single classical bit", "It remains entangled with an ancilla qubit", "It becomes an equal superposition of |0⟩ and |1⟩"]
const answer = 2
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` }

export function DailyChallenge() {
  const [selected, setSelected] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const day = today()
  const savedScore = useLearnerProgress((state) => state.dailyPracticeResults[day])
  const complete = useLearnerProgress((state) => state.completeDailyPractice)
  useEffect(() => setMounted(true), [])
  const submitted = mounted && savedScore !== undefined
  const result = submitted ? savedScore : selected === null ? undefined : selected === answer ? 100 : 0
  return <motion.section initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45 }} className="relative overflow-hidden rounded-2xl border border-[#FFB800]/25 bg-[#FFB800]/[0.05] p-4">
    <div className="flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-wide text-[#FFB800]">Daily practice</span><span className="rounded-full bg-[#FFB800]/15 px-2 py-0.5 text-[10px] font-medium text-[#FFB800]">{submitted ? savedScore >= 70 ? "+5 XP earned" : "Reviewed" : "+5 XP"}</span></div>
    <h2 className="mt-2 text-sm font-semibold text-white">What happens after a Hadamard gate on |0⟩?</h2><p className="mt-1 text-xs text-white/55">Assume no further operations are applied before measurement.</p>
    <fieldset className="mt-3 space-y-2" disabled={submitted}><legend className="sr-only">Answer options</legend>{options.map((option, index) => <label key={option} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${submitted && index === answer ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : selected === index ? "border-[#FFB800]/60 bg-[#FFB800]/10 text-white" : "border-white/10 bg-black/20 text-white/70"}`}><input type="radio" name="daily-practice" checked={selected === index || (submitted && index === answer)} onChange={() => setSelected(index)} className="accent-[#FFB800]" />{option}</label>)}</fieldset>
    {result !== undefined && <p role="status" className={`mt-3 text-xs ${result >= 70 ? "text-emerald-200" : "text-amber-200"}`}>{result >= 70 ? "Correct. H|0⟩ = (|0⟩ + |1⟩)/√2, so both outcomes have probability 1/2." : "Not quite. A Hadamard creates an equal superposition, so measurement returns either outcome with probability 1/2."}</p>}
    {!submitted ? <button type="button" disabled={selected === null} onClick={() => { if (selected === null) return; complete(day, selected === answer ? 100 : 0) }} className="mt-3 rounded-lg bg-[#FFB800] px-3 py-2 text-xs font-semibold text-[#0A0E17] disabled:cursor-not-allowed disabled:opacity-40">Check answer</button> : <Link href="/curriculum/practice" className="mt-3 inline-block text-xs text-[#00D4FF]">More practice →</Link>}
  </motion.section>
}
