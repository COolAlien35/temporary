"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useEffect } from "react"
import { AppShell } from "@/components/shared/AppShell"
import { challenges, gradeChallenge } from "@/lib/challenges/catalog"
import type { StudioGateType } from "@/lib/studio/types"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { useSession } from "@/store/use-session"
import { useStudio } from "@/store/use-studio"
import { contests } from "@/lib/contests"

const palette: StudioGateType[] = ["H", "X", "Y", "Z", "S", "T", "RX", "RY", "RZ", "CNOT", "CZ", "SWAP"]

export default function ChallengeAttemptPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const challenge = challenges.find((item) => item.id === params.id)
  const activeChallenge = challenge
  const learner = useSession((state) => state.user)
  const recordAttempt = useLearnerProgress((state) => state.recordChallengeAttempt)
  const attemptHistory = useLearnerProgress((state) => state.challengeAttempts)
  const loadCircuit = useStudio((state) => state.loadCircuit)
  const [circuit, setCircuit] = useState(challenge?.starter ?? { name: "Challenge circuit", qubits: 1, gates: [] })
  const [result, setResult] = useState<ReturnType<typeof gradeChallenge> | null>(null)
  const [hintOpen, setHintOpen] = useState(false)
  const [error, setError] = useState("")
  const [contestId, setContestId] = useState<string | null>(null)
  const current = useMemo(() => challenges.find((item) => item.id === params.id), [params.id])
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("contest")
    setContestId(contests.find((item) => item.id === requested && item.challengeId === params.id && item.status === "Live")?.id ?? null)
  }, [params.id])

  if (!activeChallenge || !current) return <AppShell variant="curriculum"><div className="mx-auto min-h-screen max-w-4xl px-5 py-16 text-white"><h1 className="text-3xl font-semibold">Challenge unavailable</h1><p className="mt-3 text-white/55">This challenge may have been removed.</p><Link href="/challenges" className="mt-6 inline-block text-[#00D4FF]">Back to challenges</Link></div></AppShell>
  const challengeData = activeChallenge

  function placeGate(type: StudioGateType, qubit: number) {
    setError("")
    setResult(null)
    const step = circuit.gates.length ? Math.max(...circuit.gates.map((gate) => gate.step)) + 1 : 0
    let target: number | undefined
    if (["CNOT", "CZ", "SWAP", "CP"].includes(type)) {
      if (circuit.qubits < 2) { setError("This challenge has only one qubit; choose a single-qubit gate."); return }
      target = qubit === circuit.qubits - 1 ? qubit - 1 : qubit + 1
    }
    setCircuit((existing) => ({ ...existing, gates: [...existing.gates, { id: crypto.randomUUID(), type, step, qubit, target, theta: ["RX", "RY", "RZ", "CP"].includes(type) ? Math.PI / 2 : undefined }] }))
  }

  function submit() {
    try {
      const graded = gradeChallenge(challengeData, circuit)
      const id = crypto.randomUUID()
      recordAttempt({ id, challengeId: challengeData.id, contestId: contestId ?? undefined, learnerId: learner?.id ?? "demo-learner", circuit: structuredClone(circuit), score: graded.score, passed: graded.passed, feedback: graded.checks.map((check) => `${check.pass ? "PASS" : "CHECK"}: ${check.text}`), probabilities: graded.probabilities, submittedAt: Date.now() })
      router.push(`/challenges/${challengeData.id}/attempts/${id}`)
    } catch {
      setError("The simulator could not evaluate this circuit. Check the gates and try again.")
    }
  }

  const latestAttempts = attemptHistory.filter((attempt) => attempt.challengeId === challenge.id)
  return <AppShell variant="curriculum"><div className="min-h-screen px-5 py-10 text-white md:px-10"><div className="mx-auto max-w-6xl">
    <Link href={contestId ? `/contests/${contestId}` : "/challenges"} className="text-sm text-[#00D4FF]">← {contestId ? "Contest" : "All challenges"}</Link>{contestId && <p className="mt-4 rounded-xl border border-[#00D4FF]/20 bg-[#00D4FF]/5 p-3 text-sm text-[#00D4FF]">This submission will be attached to your browser-local contest entry.</p>}<div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section><p className="text-xs uppercase tracking-[.22em] text-[#F5B942]">{challenge.topic} · {challenge.difficulty}</p><h1 className="mt-3 text-4xl font-semibold">{challenge.title}</h1><p className="mt-4 max-w-2xl text-white/60">{challenge.description}</p>
        <div className="mt-6 rounded-2xl border border-[#00D4FF]/20 bg-[#00D4FF]/5 p-5"><p className="text-xs uppercase tracking-wider text-[#00D4FF]">Target behavior</p><p className="mt-2 font-medium">{challenge.target}</p><p className="mt-2 text-sm text-white/45">Constraints: {challenge.qubits} qubit{challenge.qubits === 1 ? "" : "s"}, {challenge.minGates}–{challenge.maxGates} gates{challenge.requiredGates ? `, include ${challenge.requiredGates.join(" and ")}` : ""}.</p></div>
        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Circuit workbench</h2><p className="mt-1 text-xs text-white/45">Build a circuit, then run it before you submit.</p></div><button type="button" onClick={() => setCircuit(challenge.starter)} className="text-xs text-white/55 hover:text-white">Reset circuit</button></div>
          <div className="mt-5 space-y-3">{Array.from({ length: challenge.qubits }, (_, qubit) => <div key={qubit} className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3"><span className="mr-2 min-w-8 text-xs text-white/45">q{qubit}</span>{circuit.gates.filter((gate) => gate.qubit === qubit).sort((a, b) => a.step - b.step).map((gate) => <button type="button" key={gate.id} title="Remove gate" onClick={() => { setCircuit((value) => ({ ...value, gates: value.gates.filter((item) => item.id !== gate.id) })); setResult(null) }} className="rounded-lg border border-[#00D4FF]/30 bg-[#00D4FF]/10 px-3 py-2 text-xs text-[#00D4FF]">{gate.type}{gate.target !== undefined ? ` → q${gate.target}` : ""} ×</button>)}{circuit.gates.filter((gate) => gate.qubit === qubit).length === 0 && <span className="text-xs text-white/25">No gates yet</span>}</div>)}</div>
          <p className="mt-5 text-xs text-white/45">Add gate to q0</p><div className="mt-2 flex flex-wrap gap-2">{palette.map((gate) => <button type="button" key={gate} onClick={() => placeGate(gate, 0)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/75 hover:border-[#00D4FF]/50 hover:text-[#00D4FF]">{gate}</button>)}</div>
          <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => { try { setResult(gradeChallenge(challenge, circuit)); setError("") } catch { setError("The simulator could not evaluate this circuit.") } }} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-medium hover:border-white/35">Run circuit</button><button type="button" onClick={submit} className="rounded-xl bg-[#00D4FF] px-5 py-3 text-sm font-semibold text-[#0A0E17]">Submit attempt</button><button type="button" onClick={() => { loadCircuit(circuit); router.push("/studio") }} className="rounded-xl border border-white/15 px-4 py-3 text-sm text-white/70">Open in Studio</button></div>
          {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
          {result && <div role="status" className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex justify-between text-sm"><span>Preview score</span><span className={result.passed ? "text-emerald-300" : "text-amber-300"}>{result.score}% · {result.passed ? "target met" : "not passed yet"}</span></div><p className="mt-2 text-xs text-white/45">Estimated measurement distribution</p><div className="mt-2 flex flex-wrap gap-2">{Object.entries(result.probabilities).map(([outcome, probability]) => <span key={outcome} className="rounded-lg bg-white/5 px-3 py-2 font-mono text-xs">{outcome}: {(probability * 100).toFixed(1)}%</span>)}</div></div>}
        </div>
      </section>
      <aside className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="font-semibold">Need a nudge?</h2><p className="mt-2 text-sm text-white/50">Hints are available whenever you need them.</p><button type="button" onClick={() => setHintOpen((open) => !open)} className="mt-4 text-sm text-[#00D4FF]">{hintOpen ? "Hide hint" : "Reveal hint"}</button>{hintOpen && <p className="mt-3 rounded-xl bg-black/20 p-3 text-sm text-white/70">{challenge.hint}</p>}</div><div className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="font-semibold">Your progress</h2><p className="mt-2 text-sm text-white/50">{latestAttempts.length} submitted attempt{latestAttempts.length === 1 ? "" : "s"}</p><Link href="/me" className="mt-4 inline-block text-sm text-[#00D4FF]">View learner passport →</Link></div><div className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="font-semibold">How it is graded</h2><p className="mt-2 text-sm leading-6 text-white/50">A local simulator checks the output distribution and the circuit constraints. This demo result is immediate and is not hardware execution.</p></div></aside>
    </div></div></div></AppShell>
}
