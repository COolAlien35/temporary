"use client"

import { useLab, type ViewTab } from "@/lib/lab-context"
import { BlochMini } from "@/components/studio/blocks"

const LABELS: Partial<Record<ViewTab, string>> = { histogram: "Histogram", statevector: "Statevector", bloch: "Bloch spheres" }

export function LabToolPanel({ tab }: { tab: ViewTab }) {
  const { algorithm, simulationResult, resultsStale, lastRunGates } = useLab()
  const title = LABELS[tab] ?? "Experiment output"
  if (!simulationResult) return <section className="mx-auto w-full max-w-4xl rounded-xl border border-border bg-card/60 p-6"><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">Run the circuit to populate this view with local simulator results.</p></section>

  const basis = algorithm.basisStates
  return <section className="mx-auto w-full max-w-4xl rounded-xl border border-border bg-card/60 p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-medium uppercase tracking-wider text-primary">{algorithm.name} · local simulation</p><h2 className="mt-1 text-lg font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{simulationResult.shots.toLocaleString()} shots · {lastRunGates.length} gates · {simulationResult.qubits} qubits</p></div><span className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground">{resultsStale ? "Showing previous circuit snapshot" : "Current circuit snapshot"}</span></div>
    {resultsStale && <p role="status" className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">The circuit has changed since this result. Run it again to refresh this view.</p>}
    {tab === "histogram" && <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">{basis.map((state) => {
      const count = simulationResult.counts[state] ?? 0
      const percent = (count / simulationResult.shots) * 100
      return <div key={state} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between font-mono text-xs"><span>|{state}⟩</span><span>{percent.toFixed(1)}%</span></div><div className="mt-3 h-24 rounded bg-secondary/70 p-1 flex items-end"><div role="img" aria-label={`${state}: ${percent.toFixed(1)} percent measured`} className="w-full rounded-t bg-primary" style={{ height: `${Math.max(percent, 1)}%` }} /></div><p className="mt-2 text-[11px] text-muted-foreground">{count} counts</p></div>
    })}</div>}
    {tab === "statevector" && <div className="mt-6 overflow-x-auto rounded-lg border border-border"><table className="w-full text-left text-xs"><thead className="text-muted-foreground"><tr><th className="p-3">Basis state</th><th className="p-3">Amplitude (real, imag)</th><th className="p-3">Probability</th></tr></thead><tbody>{basis.map((state) => {
      const index = Number.parseInt(state, 2)
      const amplitude = simulationResult.statevector[index]
      const probability = simulationResult.probabilities[state] ?? 0
      return <tr key={state} className="border-t border-border"><td className="p-3 font-mono">|{state}⟩</td><td className="p-3 font-mono">{amplitude?.re.toFixed(4) ?? "0.0000"}, {amplitude?.im.toFixed(4) ?? "0.0000"}i</td><td className="p-3">{(probability * 100).toFixed(2)}%</td></tr>
    })}</tbody></table></div>}
    {tab === "bloch" && <div className="mt-6 flex flex-wrap justify-center gap-5">{simulationResult.blochVectors.map((vector, index) => <BlochMini key={index} vector={vector} label={`q[${index}]`} />)}</div>}
  </section>
}
