"use client"

import { useState } from "react"
import Link from "next/link"
import { runCircuit } from "@/lib/sim/run-circuit"
import type { StudioGate } from "@/lib/studio/types"

type Kind = "qaoa" | "vqe"
type Evaluation = { id: number; parameters: number[]; objective: number; probabilities: Record<string, number> }

function qaoaCircuit(gamma: number, beta: number, layers: number): StudioGate[] {
  const gates: StudioGate[] = []
  let step = 0
  const add = (type: StudioGate["type"], qubit: number, target?: number, theta?: number) => gates.push({ id: `g-${gates.length}`, type, qubit, target, theta, step: step++ })
  for (let qubit = 0; qubit < 3; qubit++) gates.push({ id: `h-${qubit}`, type: "H", qubit, step: 0 })
  step = 1
  for (let layer = 0; layer < layers; layer++) {
    for (const [control, target] of [[0, 1], [1, 2]]) {
      add("CNOT", control, target)
      add("RZ", target, undefined, -gamma)
      add("CNOT", control, target)
    }
    for (let qubit = 0; qubit < 3; qubit++) add("RX", qubit, undefined, 2 * beta)
  }
  return gates
}

function expectedCut(probabilities: Record<string, number>) {
  const edges = [[0, 1], [1, 2]]
  return Object.entries(probabilities).reduce((total, [state, probability]) => {
    const cuts = edges.filter(([a, b]) => state[2 - a] !== state[2 - b]).length
    return total + probability * cuts
  }, 0)
}

function vqeCircuit(parameters: number[]): StudioGate[] {
  const [a, b, c, d] = parameters
  return [
    { id: "ry-a", type: "RY", qubit: 0, step: 0, theta: a },
    { id: "ry-b", type: "RY", qubit: 1, step: 0, theta: b },
    { id: "cx", type: "CNOT", qubit: 0, target: 1, step: 1 },
    { id: "ry-c", type: "RY", qubit: 0, step: 2, theta: c },
    { id: "ry-d", type: "RY", qubit: 1, step: 2, theta: d },
  ]
}

function toyEnergy(statevector: { re: number; im: number }[]) {
  // Explicit pedagogical objective: H = -Z0 - Z1 + 0.5 X0X1 (not a molecular Hamiltonian).
  let z0 = 0
  let z1 = 0
  let xx = 0
  for (let index = 0; index < statevector.length; index++) {
    const amplitude = statevector[index]
    const probability = amplitude.re * amplitude.re + amplitude.im * amplitude.im
    z0 += (index & 1 ? -1 : 1) * probability
    z1 += (index & 2 ? -1 : 1) * probability
    const paired = statevector[index ^ 3]
    xx += amplitude.re * paired.re + amplitude.im * paired.im
  }
  return -z0 - z1 + 0.5 * xx
}

export function VariationalLab({ kind }: { kind: Kind }) {
  const qaoa = kind === "qaoa"
  const [gamma, setGamma] = useState(0.8)
  const [beta, setBeta] = useState(0.4)
  const [layers, setLayers] = useState(1)
  const [parameters, setParameters] = useState([0.8, -0.3, -0.5, 0.6])
  const [history, setHistory] = useState<Evaluation[]>([])
  const [error, setError] = useState("")

  const evaluate = () => {
    try {
      const result = qaoa
        ? runCircuit(3, qaoaCircuit(gamma, beta, layers), { shots: 2048 })
        : runCircuit(2, vqeCircuit(parameters), { shots: 2048 })
      const objective = qaoa ? expectedCut(result.probabilities) : toyEnergy(result.statevector)
      setHistory((previous) => [...previous, { id: previous.length + 1, parameters: qaoa ? [gamma, beta, layers] : [...parameters], objective, probabilities: result.probabilities }])
      setError("")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The local evaluation failed. Adjust the parameters and retry.")
    }
  }

  const best = history.length ? history.reduce((winner, item) => qaoa ? (item.objective > winner.objective ? item : winner) : (item.objective < winner.objective ? item : winner)) : null
  const current = history.at(-1)

  return <main className="min-h-screen overflow-y-auto bg-background text-foreground">
    <header className="flex items-center justify-between border-b border-border bg-card/60 px-5 py-4"><div><p className="text-[10px] font-medium uppercase tracking-[.18em] text-primary">QuantumLoop · Variational Workbench</p><h1 className="mt-1 text-lg font-semibold">{qaoa ? "QAOA · Max-Cut" : "VQE · Toy Hamiltonian"}</h1></div><Link href="/curriculum" className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Back to Curriculum</Link></header>
    <div className="mx-auto grid max-w-6xl gap-5 p-5 lg:grid-cols-[1.1fr_.9fr]">
      <div className="space-y-5">
        <section className="rounded-xl border border-border bg-card/60 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Problem setup</p>
          {qaoa ? <><h2 className="mt-2 text-lg font-semibold">Find a large cut in a three-vertex path</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Edges are (0,1) and (1,2). The local statevector evaluates the expected number of edges whose endpoint bits differ. The exact maximum for this tiny graph is 2.</p><div className="mt-4 flex items-center gap-4" aria-label="Three-vertex path graph"><span className="flex size-10 items-center justify-center rounded-full border border-primary/50">0</span><span className="h-px w-12 bg-primary"/><span className="flex size-10 items-center justify-center rounded-full border border-primary/50">1</span><span className="h-px w-12 bg-primary"/><span className="flex size-10 items-center justify-center rounded-full border border-primary/50">2</span></div></> : <><h2 className="mt-2 text-lg font-semibold">Minimize an explicit two-qubit toy energy</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Objective: H = −Z₀ − Z₁ + 0.5 X₀X₁. This pedagogical Hamiltonian is evaluated from the simulated statevector; it is not a molecular model or chemistry result.</p><p className="mt-3 rounded-lg border border-border bg-background/50 p-3 font-mono text-xs">Ansatz: RY(θ₀) · RY(θ₁) · CNOT · RY(θ₂) · RY(θ₃)</p></>}
        </section>
        <section className="rounded-xl border border-border bg-card/60 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Parameter controls</h2><p className="mt-1 text-xs text-muted-foreground">Each evaluation is one manual parameter iteration; no optimizer service is running.</p></div><span className="rounded-full border border-border px-2 py-1 text-[10px] text-muted-foreground">Local statevector · ≤ 5 qubits</span></div>
          {qaoa ? <div className="mt-5 space-y-4">{[{ label: "γ · cost angle", value: gamma, setter: setGamma }, { label: "β · mixer angle", value: beta, setter: setBeta }].map(({ label, value, setter }) => <label key={label} className="block text-xs text-muted-foreground">{label} <span className="float-right font-mono text-foreground">{value.toFixed(2)} rad</span><input aria-label={label} type="range" min="0" max={Math.PI * 2} step="0.05" value={value} onChange={(event) => setter(Number(event.target.value))} className="mt-2 w-full accent-primary"/></label>)}<label className="block text-xs text-muted-foreground">QAOA depth p <span className="float-right font-mono text-foreground">{layers}</span><input aria-label="QAOA depth p" type="range" min="1" max="2" step="1" value={layers} onChange={(event) => setLayers(Number(event.target.value))} className="mt-2 w-full accent-primary"/></label></div> : <div className="mt-5 grid gap-4 sm:grid-cols-2">{parameters.map((value, index) => <label key={index} className="text-xs text-muted-foreground">θ{index} <span className="float-right font-mono text-foreground">{value.toFixed(2)} rad</span><input aria-label={`VQE parameter theta ${index}`} type="range" min={-Math.PI} max={Math.PI} step="0.05" value={value} onChange={(event) => setParameters((currentValues) => currentValues.map((old, i) => i === index ? Number(event.target.value) : old))} className="mt-2 w-full accent-primary"/></label>)}</div>}
          <button type="button" onClick={evaluate} className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-black">Evaluate parameters</button>
          {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
        </section>
      </div>
      <div className="space-y-5">
        <section className="rounded-xl border border-border bg-card/60 p-5"><h2 className="text-sm font-semibold">Objective result</h2>{current ? <><p className="mt-3 font-mono text-3xl text-primary">{current.objective.toFixed(4)} <span className="text-xs text-muted-foreground">{qaoa ? "expected cut edges" : "toy energy"}</span></p><p className="mt-2 text-xs text-muted-foreground">Evaluation {current.id} · best observed {best?.objective.toFixed(4)}</p><div className="mt-4 grid grid-cols-2 gap-2">{Object.entries(current.probabilities).map(([state, probability]) => <div key={state} className="flex justify-between rounded-md border border-border px-3 py-2 font-mono text-xs"><span>|{state}⟩</span><span>{(probability * 100).toFixed(1)}%</span></div>)}</div></> : <p className="mt-3 text-sm text-muted-foreground">Adjust the parameters and evaluate to see the objective and measurement distribution.</p>}</section>
        <section className="rounded-xl border border-border bg-card/60 p-5"><h2 className="text-sm font-semibold">Iteration history</h2>{history.length ? <ol className="mt-3 max-h-80 space-y-2 overflow-y-auto">{history.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-xs"><span>#{item.id} · {item.parameters.map((value) => typeof value === "number" ? value.toFixed(2) : value).join(", ")}</span><span className="font-mono text-primary">{item.objective.toFixed(4)}</span></li>)}</ol> : <p className="mt-3 text-sm text-muted-foreground">No evaluations yet. Your parameter sweeps will appear here.</p>}</section>
      </div>
    </div>
  </main>
}
