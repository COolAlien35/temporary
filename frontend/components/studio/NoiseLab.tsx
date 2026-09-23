"use client"

import { useMemo } from "react"
import { previewNoisyProbabilities, classicalFidelity } from "@/lib/sim/run-circuit"
import { computeCircuitInfo } from "@/lib/studio/circuit-info"
import { useStudio } from "@/store/use-studio"
import { AmplitudeBars } from "./blocks"

export function NoiseLab() {
  const circuit = useStudio((s) => s.circuit)
  const result = useStudio((s) => s.result)
  const noise = useStudio((s) => s.noise)
  const setNoise = useStudio((s) => s.setNoise)

  const info = useMemo(() => computeCircuitInfo(circuit.qubits, circuit.gates), [circuit.qubits, circuit.gates])

  const noisyPreview = useMemo(() => {
    if (!result) return undefined
    return previewNoisyProbabilities(result.probabilities, noise.depolarizing, info.gateCount)
  }, [result, noise.depolarizing, info.gateCount])

  const fidelity = result && noisyPreview ? classicalFidelity(result.probabilities, noisyPreview) : 1

  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="depolarizing" className="font-medium text-white/70">
            Depolarizing noise
          </label>
          <span className="font-mono text-white/50">{Math.round(noise.depolarizing * 100)}%</span>
        </div>
        <input id="depolarizing" type="range" min={0} max={0.1} step={0.005} value={noise.depolarizing} onChange={(e) => setNoise({ depolarizing: Number(e.target.value) })} className="mt-1.5 h-1.5 w-full accent-[#00D4FF]" />
      </div>
      <div>
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="readout" className="font-medium text-white/70">
            Readout error
          </label>
          <span className="font-mono text-white/50">{Math.round(noise.readoutError * 100)}%</span>
        </div>
        <input id="readout" type="range" min={0} max={0.1} step={0.005} value={noise.readoutError} onChange={(e) => setNoise({ readoutError: Number(e.target.value) })} className="mt-1.5 h-1.5 w-full accent-[#F5B942]" />
        <p className="mt-1 text-[10px] text-white/40">Readout error is applied per shot when you press Run.</p>
      </div>

      {result ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-medium text-white/50">Ideal</p>
              <div className="h-24 rounded-lg border border-white/10 bg-white/[0.02] p-2">
                <AmplitudeBars probabilities={result.probabilities} max={4} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-medium text-white/50">Noisy</p>
              <div className="h-24 rounded-lg border border-white/10 bg-white/[0.02] p-2">
                <AmplitudeBars probabilities={noisyPreview ?? result.probabilities} max={4} />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
            <span className="text-white/50">Fidelity vs. ideal: </span>
            <span className="font-mono font-semibold text-[#4ADE80]">{(fidelity * 100).toFixed(1)}%</span>
          </div>
        </>
      ) : (
        <p className="text-xs text-white/40">Run the circuit to compare ideal vs. noisy probabilities.</p>
      )}
    </div>
  )
}
