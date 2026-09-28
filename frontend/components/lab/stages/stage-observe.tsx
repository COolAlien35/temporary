"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ChevronRight, Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { StageHeader, AccuracyBadge } from "@/components/lab/stage-header"
import { cn } from "@/lib/utils"
import { classicalFidelity, previewNoisyProbabilities } from "@/lib/sim/run-circuit"

type SubTab = "dual" | "histogram" | "statevector" | "noise" | "changed"

export function StageObserve() {
  const { algorithm, hypothesis, runAccuracy, advanceStage, simulationResult, previousSimulationResult, lastRunGates, resultsStale } = useLab()
  const [subTab, setSubTab] = useState<SubTab>("dual")
  const [noisePercent, setNoisePercent] = useState(0)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  const orderedGates = useMemo(() => [...lastRunGates].sort((a, b) => a.step - b.step || a.qubit - b.qubit), [lastRunGates])
  const maxStep = Math.max(orderedGates.length - 1, 0)

  const actual = useMemo(() => Object.fromEntries(algorithm.basisStates.map((state) => [state, ((simulationResult?.counts[state] ?? 0) / (simulationResult?.shots || 1)) * 100])), [algorithm.basisStates, simulationResult])
  const distinctSteps = useMemo(() => [...new Set(orderedGates.map((gate) => gate.step))], [orderedGates])
  const selectedGate = orderedGates[step]
  const stateIndex = selectedGate ? distinctSteps.indexOf(selectedGate.step) : distinctSteps.length - 1
  const stateAtStep = simulationResult?.stepStates[stateIndex] ?? simulationResult?.statevector
  const noisePreview = useMemo(() => simulationResult ? previewNoisyProbabilities(simulationResult.probabilities, noisePercent / 100, orderedGates.length) : {}, [noisePercent, orderedGates.length, simulationResult])
  const noiseFidelity = simulationResult ? classicalFidelity(simulationResult.probabilities, noisePreview) : 1

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setStep((current) => current >= maxStep ? (setPlaying(false), current) : current + 1), 900)
    return () => window.clearInterval(timer)
  }, [maxStep, playing])

  const statevectorRows = useMemo(() => {
    return algorithm.basisStates.map((state) => {
      const value = stateAtStep?.[Number.parseInt(state, 2)]
      const re = value?.re ?? (state === "00" ? 1 : 0)
      const im = value?.im ?? 0
      const magnitude = Math.sqrt(re * re + im * im)
      const probability = magnitude * magnitude * 100
      return {
        state,
        amplitude: `${re.toFixed(3)} ${im < 0 ? "−" : "+"} ${Math.abs(im).toFixed(3)}i`,
        magnitude: magnitude.toFixed(3),
        probability: Number(probability.toFixed(1)),
        phase: magnitude < 0.001 ? "—" : `${Math.atan2(im, re).toFixed(2)} rad`,
      }
    })
  }, [algorithm.basisStates, stateAtStep])

  return (
    <div className="mx-auto max-w-3xl">
      <StageHeader
        eyebrow="Stage 5 of 9 · Empirical Observation"
        title="Prediction Ghost vs Simulated Outcome"
        accuracyBadge={<AccuracyBadge accuracy={runAccuracy} />}
      />
      <p className="mb-4 text-xs text-muted-foreground">Latest results · {simulationResult?.shots.toLocaleString() ?? 0} shots · local statevector simulator</p>

      {resultsStale && <p role="status" className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">The circuit changed after this run. These results show the previous circuit snapshot; run again to refresh them.</p>}
      {!simulationResult && <p role="status" className="mb-4 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">Run the circuit to see its measurement results.</p>}

      <div className="mb-4 flex gap-1 rounded-full border border-border bg-secondary/30 p-1 w-fit">
        {[
          { key: "dual" as const, label: "Dual View" },
          { key: "histogram" as const, label: "Histogram Only" },
          { key: "statevector" as const, label: "Statevector Evolution" },
          { key: "noise" as const, label: "Noise Lab" },
          { key: "changed" as const, label: "What Changed" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSubTab(tab.key)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              subTab === tab.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === "noise" && <section className="mb-5 rounded-xl border border-border bg-card/60 p-5" aria-label="Noise Lab">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold">Noise Lab · preview</h3><p className="mt-1 text-xs text-muted-foreground">Approximate mix toward uniform outcomes; this is not a hardware noise model or a new backend run.</p></div><span className="font-mono text-xs">{noisePercent}% · preview fidelity {(noiseFidelity * 100).toFixed(1)}%</span></div>
        <label className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">Noise strength
          <input aria-label="Noise strength" type="range" min="0" max="10" step="1" value={noisePercent} onChange={(event) => setNoisePercent(Number(event.target.value))} className="flex-1 accent-primary" />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{algorithm.basisStates.map((state) => <div key={state} className="rounded-lg border border-border p-2 text-center"><p className="font-mono text-xs">|{state}⟩</p><p className="mt-1 text-[11px] text-muted-foreground">Ideal {((simulationResult?.probabilities[state] ?? 0) * 100).toFixed(1)}%</p><p className="text-[11px] text-primary">Preview {( (noisePreview[state] ?? 0) * 100).toFixed(1)}%</p></div>)}</div>
      </section>}

      {subTab === "changed" && <section className="mb-5 rounded-xl border border-border bg-card/60 p-5" aria-label="What Changed">
        <h3 className="text-sm font-semibold">What Changed · run comparison</h3>
        {!simulationResult || !previousSimulationResult ? <p className="mt-2 text-xs text-muted-foreground">Run this circuit again after making a gate change to compare two snapshots.</p> : <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{algorithm.basisStates.map((state) => {
          const before = (previousSimulationResult.probabilities[state] ?? 0) * 100
          const after = (simulationResult.probabilities[state] ?? 0) * 100
          const delta = after - before
          return <div key={state} className="rounded-lg border border-border p-2 text-center"><p className="font-mono text-xs">|{state}⟩</p><p className="mt-1 text-[11px] text-muted-foreground">{before.toFixed(1)}% → {after.toFixed(1)}%</p><p className={cn("text-[11px]", delta > 0 ? "text-emerald-400" : delta < 0 ? "text-amber-300" : "text-muted-foreground")}>{delta > 0 ? "+" : ""}{delta.toFixed(1)} pts</p></div>
        })}</div>}
      </section>}

      {!(subTab === "statevector" || subTab === "noise" || subTab === "changed") && (
        <div className="rounded-xl border border-border bg-card/60 p-5">
          <div className="flex items-end justify-between gap-3" style={{ height: 160 }}>
            {algorithm.basisStates.map((state) => {
              const actualPct = actual[state] ?? 0
              const ghostPct = hypothesis[state] ?? 0
              const mismatch = Math.abs(actualPct - ghostPct) > 15
              return (
                <div key={state} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-full w-full items-end justify-center gap-1.5">
                    <div
                      className="w-5 rounded-t bg-primary"
                      style={{ height: `${Math.max(actualPct, 2)}%` }}
                      title={`Actual: ${actualPct}%`}
                    />
                    {subTab === "dual" && (
                      <div
                        className="w-5 rounded-t border-2 border-dashed border-muted-foreground/50 bg-transparent"
                        style={{ height: `${Math.max(ghostPct, 2)}%` }}
                        title={`Predicted: ${ghostPct}%`}
                      />
                    )}
                    {mismatch && subTab === "dual" && (
                      <AlertTriangle className="absolute -top-5 size-3.5 text-primary" />
                    )}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">|{state}⟩</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded bg-primary" /> Actual Outcome
            </span>
            {subTab === "dual" && (
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded border-2 border-dashed border-muted-foreground/50" /> Predicted Ghost
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-border bg-card/60 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Gate Evolution Scrubber</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous gate in evolution"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <SkipBack className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={playing ? "Pause gate evolution" : "Play gate evolution"}
              onClick={() => setPlaying((p) => !p)}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
            <button
              type="button"
              aria-label="Next gate in evolution"
              onClick={() => setStep((s) => Math.min(maxStep, s + 1))}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <SkipForward className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          {orderedGates.length === 0 && <span className="text-xs text-muted-foreground">No gates to scrub · initial state |00⟩</span>}
          {orderedGates.map((g, i) => (
            <button
              key={g.id}
              type="button"
              aria-label={`Show circuit after gate ${i + 1}: ${g.gate} on q${g.qubit}`}
              onClick={() => setStep(i)}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded-md border px-1.5 text-[11px] font-semibold transition-colors",
                i === step
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30",
              )}
            >
              {g.gate}
            </button>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">State</th>
                <th className="pb-2 pr-3 font-medium">Amplitude</th>
                <th className="pb-2 pr-3 font-medium">Magnitude</th>
                <th className="pb-2 pr-3 font-medium">Probability</th>
                <th className="pb-2 font-medium">Phase</th>
              </tr>
            </thead>
            <tbody>
              {statevectorRows.map((row) => (
                <tr key={row.state} className="border-t border-border">
                  <td className="py-2 pr-3 font-mono text-foreground">|{row.state}⟩</td>
                  <td className="py-2 pr-3 font-mono text-muted-foreground">{row.amplitude}</td>
                  <td className="py-2 pr-3 font-mono text-muted-foreground">{row.magnitude}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full bg-primary" style={{ width: `${row.probability}%` }} />
                      </div>
                      <span className="font-mono text-muted-foreground">{row.probability}%</span>
                    </div>
                  </td>
                  <td className="py-2 font-mono text-muted-foreground">{row.phase}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => advanceStage(5, 6)}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-primary"
        >
          Discuss with Lab Partner <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
