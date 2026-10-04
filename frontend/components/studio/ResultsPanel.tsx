"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { circuitSignature, inspectedResult } from "@/lib/studio/inspection"
import { useStudio } from "@/store/use-studio"
import { AmplitudeBars, BlochMini, PhasorWheel } from "./blocks"
import { NoiseLab } from "./NoiseLab"
import { CircuitInfo } from "./CircuitInfo"
import { WhatChangedCard } from "./WhatChangedCard"
import { cn } from "@/lib/utils"

const TABS = ["Histogram", "Statevector", "Bloch", "Amplitude / Q-sphere", "Noise Lab", "Circuit info", "Console"] as const
type Tab = (typeof TABS)[number]

function phaseDegrees(re: number, im: number) {
  return ((Math.atan2(im, re) * 180) / Math.PI).toFixed(1)
}

function downloadCsv(counts: Record<string, number>, shots: number) {
  const rows = ["outcome,count,percentage", ...Object.entries(counts).map(([k, c]) => `${k},${c},${((c / shots) * 100).toFixed(2)}`)]
  const blob = new Blob([rows.join("\n")], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "histogram.csv"
  a.click()
  URL.revokeObjectURL(url)
}

export function ResultsPanel() {
  const [tab, setTab] = useState<Tab>("Histogram")
  const [showSampled, setShowSampled] = useState(false)
  const savedResult = useStudio((s) => s.result)
  const lastRunCircuit = useStudio((s) => s.lastRunCircuit)
  const stepIndex = useStudio((s) => s.stepIndex)
  const circuit = useStudio((s) => s.circuit)
  const stale = Boolean(savedResult && lastRunCircuit && circuitSignature(circuit) !== circuitSignature(lastRunCircuit))
  const stepping = stepIndex !== null && !stale && Boolean(savedResult?.stepStates[stepIndex])
  const result = savedResult ? inspectedResult(savedResult, stepping ? stepIndex : null) : undefined
  const shots = result?.shots ?? 0
  const stepTime = lastRunCircuit ? [...new Set(lastRunCircuit.gates.map((gate) => gate.step))].sort((a, b) => a - b)[stepIndex ?? 0] : 0

  const sampledProbabilities = result
    ? Object.fromEntries(Object.entries(result.counts).map(([k, c]) => [k, c / shots]))
    : {}

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 py-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors", tab === t ? "bg-[#00D4FF]/15 text-[#00D4FF]" : "text-white/50 hover:text-white/80")}
          >
            {t}
          </button>
        ))}
      </div>

      {savedResult && <p role="status" aria-live="polite" className="border-b border-white/10 px-3 py-2 text-xs text-cyan-200">{stale ? "Circuit changed. Showing the previous run; rerun to inspect this circuit." : stepping ? `Inspecting ideal state after time step ${stepTime}. Sampled counts describe the final run.` : "Showing final run state."}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!result && tab !== "Circuit info" && tab !== "Noise Lab" && (
          <div className="flex h-full items-center justify-center p-6 text-center text-xs text-white/40">Press Run to simulate this circuit.</div>
        )}

        {result && tab === "Histogram" && (
          <div className="flex h-full flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-white/60">
                <button type="button" onClick={() => setShowSampled(false)} className={cn("rounded-full border px-2 py-0.5", !showSampled ? "border-[#00D4FF]/50 text-[#00D4FF]" : "border-white/10")}>
                  Ideal
                </button>
                <button type="button" disabled={stepping} onClick={() => setShowSampled(true)} className={cn("rounded-full border px-2 py-0.5", showSampled ? "border-[#00D4FF]/50 text-[#00D4FF]" : "border-white/10")}>
                  Sampled ({shots})
                </button>
              </div>
              <button type="button" onClick={() => downloadCsv(result.counts, shots)} className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white">
                <Download className="h-3 w-3" />
                CSV
              </button>
            </div>
            <div className="min-h-[160px] flex-1">
              <AmplitudeBars probabilities={showSampled && !stepping ? sampledProbabilities : result.probabilities} max={16} />
            </div>
            <table aria-label="Outcome probabilities" className="text-left text-xs"><thead><tr><th scope="col">Outcome</th><th scope="col">{showSampled && !stepping ? "Sampled final frequency" : "Ideal probability"}</th></tr></thead><tbody>{Object.entries(showSampled && !stepping ? sampledProbabilities : result.probabilities).map(([label, probability]) => <tr key={label}><th scope="row">|{label}⟩</th><td>{(probability * 100).toFixed(2)}%</td></tr>)}</tbody></table>
            {!stepping && <WhatChangedCard />}
          </div>
        )}

        {result && tab === "Statevector" && (
          <div className="flex flex-col gap-4 p-4 sm:flex-row">
            <div className="flex-1 overflow-x-auto">
              <table aria-label="Quantum statevector" className="w-full text-left text-[11px]">
                <thead className="text-white/40">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Basis</th>
                    <th className="pb-2 pr-3 font-medium">Amplitude</th>
                    <th className="pb-2 pr-3 font-medium">Magnitude</th>
                    <th className="pb-2 pr-3 font-medium">Phase</th>
                    <th className="pb-2 font-medium">Probability</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-white/75">
                  {result.statevector.map((amp, i) => {
                    const key = i.toString(2).padStart(result.qubits, "0")
                    const mag = Math.sqrt(amp.re * amp.re + amp.im * amp.im)
                    return (
                      <tr key={key} className="border-t border-white/5">
                        <td className="py-1.5 pr-3">|{key}⟩</td>
                        <td className="py-1.5 pr-3">{amp.re.toFixed(3)} {amp.im >= 0 ? "+" : "-"} {Math.abs(amp.im).toFixed(3)}i</td>
                        <td className="py-1.5 pr-3">{mag.toFixed(3)}</td>
                        <td className="py-1.5 pr-3">{mag < 1e-12 ? "Undefined (zero amplitude)" : `${phaseDegrees(amp.re, amp.im)}°`}</td>
                        <td className="py-1.5">{(mag * mag * 100).toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex w-full flex-col items-center gap-2 sm:w-32">
              <p className="text-[11px] text-white/40">Phasor wheel</p>
              <PhasorWheel statevector={result.statevector} />
            </div>
          </div>
        )}

        {result && tab === "Bloch" && (
          <div className="flex flex-wrap justify-center gap-4 p-4">
            <table aria-label="Bloch coordinates" className="w-full text-left text-xs"><thead><tr><th scope="col">Qubit</th><th scope="col">X</th><th scope="col">Y</th><th scope="col">Z</th><th scope="col">Reduced state</th></tr></thead><tbody>{result.blochVectors.map((vector, index) => <tr key={index}><th scope="row">q{index}</th><td>{vector.x.toFixed(3)}</td><td>{vector.y.toFixed(3)}</td><td>{vector.z.toFixed(3)}</td><td>{vector.mixed ? "Mixed" : "Pure"}</td></tr>)}</tbody></table>
            {result.blochVectors.map((v, i) => (
              <BlochMini key={i} vector={v} label={`q[${i}]`} />
            ))}
          </div>
        )}

        {result && tab === "Amplitude / Q-sphere" && (
          <div className="flex h-full flex-col gap-4 p-4">
            <div className="min-h-[160px] flex-1">
              <AmplitudeBars probabilities={result.probabilities} max={16} />
            </div>
            <div className="flex items-center justify-center">
              <PhasorWheel statevector={result.statevector} />
            </div>
          </div>
        )}

        {tab === "Noise Lab" && <NoiseLab />}
        {tab === "Circuit info" && <CircuitInfo />}

        {tab === "Console" && (
          <div className="flex flex-col gap-1 p-4 font-mono text-[11px] text-white/60">
            {result ? (
              <>
                <p>{`> run(${circuit.qubits} qubits, ${circuit.gates.length} gates, shots=${shots})`}</p>
                <p className="text-[#4ADE80]">{`ok \u00b7 depth=${new Set(circuit.gates.map((g) => g.step)).size} \u00b7 fidelity=${(result.fidelity * 100).toFixed(1)}%`}</p>
              </>
            ) : (
              <p className="text-white/35">No runs yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
