"use client"

import { Play } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { StageHeader } from "@/components/lab/stage-header"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const SHOT_OPTIONS = [128, 512, 1024, 4096]

export function StageRun() {
  const { algorithm, shots, setShots, noiseEnabled, setNoiseEnabled, backend, setBackend, attempts, runSimulation } =
    useLab()

  return (
    <div className="mx-auto max-w-2xl">
      <StageHeader eyebrow="Stage 4 of 9 · Simulation Execution" title={`Execute on ${algorithm.backendName}`} />

      <div className="rounded-xl border border-border bg-card/60 p-5">
        <h3 className="text-sm font-semibold text-foreground">Measurement Shots</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {SHOT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setShots(n)}
              className={cn(
                "rounded-md border px-3.5 py-1.5 text-sm font-medium transition-colors",
                shots === n
                  ? "border-amber-400 bg-amber-400/15 text-amber-300"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {n.toLocaleString()}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          More shots reduce statistical noise but take longer to simulate — 1,024 balances speed and fidelity for
          most register sizes.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-card/60 p-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Depolarizing Noise Model</h3>
          <p className="mt-1 text-xs text-muted-foreground">Simulates gate-level decoherence on every operation.</p>
        </div>
        <Switch checked={noiseEnabled} onCheckedChange={setNoiseEnabled} />
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card/60 p-5">
        <h3 className="text-sm font-semibold text-foreground">Simulation Backend</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setBackend("Local State-Vector Simulator")}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              backend === "Local State-Vector Simulator"
                ? "border-amber-400 bg-amber-400/10"
                : "border-border hover:border-foreground/30",
            )}
          >
            <p className="text-sm font-medium text-foreground">Local State-Vector Simulator</p>
            <p className="mt-1 text-xs text-muted-foreground">Exact amplitude tracking, up to 24 qubits.</p>
          </button>
          <div className="cursor-not-allowed rounded-lg border border-border p-3 opacity-50">
            <p className="text-sm font-medium text-foreground">QPU-7 Hardware Queue</p>
            <p className="mt-1 text-xs text-muted-foreground">Coming soon</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
        <span>Shots: {shots.toLocaleString()}</span>
        <span>Noise: {noiseEnabled ? "Enabled" : "Disabled"}</span>
        <span>Attempts: {attempts}</span>
      </div>

      <button
        type="button"
        onClick={runSimulation}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-300"
      >
        <Play className="size-3.5 fill-current" />
        Run Simulation
      </button>
    </div>
  )
}
