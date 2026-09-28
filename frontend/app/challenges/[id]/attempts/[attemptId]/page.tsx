"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { AppShell } from "@/components/shared/AppShell"
import { challenges } from "@/lib/challenges/catalog"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { useStudio } from "@/store/use-studio"

export default function ChallengeReviewPage() {
  const params = useParams<{ id: string; attemptId: string }>()
  const attempts = useLearnerProgress((state) => state.challengeAttempts)
  const loadCircuit = useStudio((state) => state.loadCircuit)
  const attempt = attempts.find((item) => item.id === params.attemptId && item.challengeId === params.id)
  const challenge = challenges.find((item) => item.id === params.id)

  if (!challenge || !attempt) return <AppShell variant="curriculum"><div className="mx-auto min-h-screen max-w-4xl px-5 py-16 text-white"><h1 className="text-3xl font-semibold">Attempt not found</h1><p className="mt-3 text-white/55">This result is not available in the current learner profile.</p><Link href="/challenges" className="mt-6 inline-block text-[#00D4FF]">Back to challenges</Link></div></AppShell>

  return <AppShell variant="curriculum"><div className="min-h-screen px-5 py-10 text-white md:px-10"><div className="mx-auto max-w-4xl"><Link href={`/challenges/${challenge.id}`} className="text-sm text-[#00D4FF]">← Back to challenge</Link><div className="mt-7 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[.22em] text-[#F5B942]">Submission review · {challenge.topic}</p><h1 className="mt-3 text-3xl font-semibold">{challenge.title}</h1><p className="mt-2 text-sm text-white/45">Submitted {new Date(attempt.submittedAt).toLocaleString()}</p></div><div className={`rounded-2xl border px-5 py-4 text-center ${attempt.passed ? "border-emerald-400/25 bg-emerald-400/10" : "border-amber-300/25 bg-amber-300/10"}`}><p className="text-3xl font-semibold">{attempt.score}%</p><p className="mt-1 text-xs">{attempt.passed ? "Passed" : "Keep practicing"}</p></div></div>
      <section className="mt-7 rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="font-semibold">Grading feedback</h2><ul className="mt-4 space-y-3">{attempt.feedback.map((item, index) => <li key={`${item}-${index}`} className={`rounded-xl p-3 text-sm ${item.startsWith("PASS") ? "bg-emerald-400/5 text-emerald-100/80" : "bg-amber-300/5 text-amber-100/80"}`}>{item}</li>)}</ul></section>
      <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="font-semibold">Submitted circuit snapshot</h2><p className="mt-1 text-xs text-white/45">{attempt.circuit.qubits} qubit{attempt.circuit.qubits === 1 ? "" : "s"} · {attempt.circuit.gates.length} gates</p><div className="mt-4 flex flex-wrap gap-2">{attempt.circuit.gates.length ? attempt.circuit.gates.slice().sort((a, b) => a.step - b.step).map((gate) => <span key={gate.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs">{gate.type} · q{gate.qubit}{gate.target !== undefined ? ` → q${gate.target}` : ""}</span>) : <p className="text-sm text-white/45">No gates were submitted.</p>}</div></section>
      <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="font-semibold">Measurement distribution</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(attempt.probabilities).sort(([a], [b]) => a.localeCompare(b)).map(([outcome, probability]) => <div key={outcome} className="rounded-xl bg-black/20 p-3"><div className="flex justify-between font-mono text-xs"><span>|{outcome}⟩</span><span>{(probability * 100).toFixed(1)}%</span></div><div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-[#00D4FF]" style={{ width: `${probability * 100}%` }} /></div></div>)}</div></section>
      <div className="mt-6 flex flex-wrap gap-3"><Link href={`/challenges/${challenge.id}${attempt.contestId ? `?contest=${attempt.contestId}` : ""}`} className="rounded-xl bg-[#00D4FF] px-5 py-3 text-sm font-semibold text-[#0A0E17]">Retry challenge</Link><button type="button" onClick={() => { loadCircuit(attempt.circuit); window.location.href = "/studio" }} className="rounded-xl border border-white/15 px-5 py-3 text-sm text-white/75">Open snapshot in Studio</button>{attempt.contestId && <Link href={`/contests/${attempt.contestId}`} className="rounded-xl border border-white/15 px-5 py-3 text-sm text-white/75">View contest result</Link>}<Link href="/challenges" className="rounded-xl border border-white/15 px-5 py-3 text-sm text-white/75">Find another challenge</Link></div>
    </div></div></AppShell>
}
