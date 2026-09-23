"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { StageHeader } from "@/components/lab/stage-header"
import { GATE_COLORS, GATE_PALETTE, type GateType } from "@/lib/lab-data"
import { cn } from "@/lib/utils"

const STEPS = 4

export function StageBuild() {
  const { algorithm, gates, addGate, removeGate, predictionLocked, advanceStage } = useLab()
  const [selectedGate, setSelectedGate] = useState<GateType>("H")

  const handleContinue = () => {
    advanceStage(3, 4)
  }

  const gateAt = (step: number, qubit: number) => gates.find((g) => g.step === step && g.qubit === qubit)

  return (
    <div className="mx-auto max-w-3xl">
      <StageHeader
        eyebrow="Stage 3 of 9 · Circuit Assembly"
        title="Quantum Circuit Composition"
        action={
          <button
            type="button"
            onClick={handleContinue}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-primary"
          >
            Proceed to Run →
          </button>
        }
      />

      {predictionLocked && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          Prediction locked. Build your circuit to test it.
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {GATE_PALETTE.map((item) => (
          <button
            key={item.gate}
            type="button"
            onClick={() => setSelectedGate(item.gate)}
            title={item.label}
            className={cn(
              "flex size-9 items-center justify-center rounded-md border text-xs font-semibold transition-all",
              GATE_COLORS[item.gate],
              selectedGate === item.gate ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100",
            )}
          >
            {item.gate}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card/60 p-5">
        <div className="grid gap-3" style={{ gridTemplateColumns: `48px repeat(${STEPS}, 1fr)` }}>
          <div />
          {Array.from({ length: STEPS }).map((_, step) => (
            <div key={step} className="text-center font-mono text-[11px] text-muted-foreground">
              t{step}
            </div>
          ))}

          {Array.from({ length: algorithm.qubits }).map((_, qubit) => (
            <div key={qubit} className="contents">
              <div className="flex items-center font-mono text-xs text-muted-foreground">q[{qubit}]</div>
              {Array.from({ length: STEPS }).map((_, step) => {
                const placed = gateAt(step, qubit)
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      if (placed) {
                        removeGate(placed.id)
                      } else {
                        addGate({ step, qubit, gate: selectedGate })
                      }
                    }}
                    className={cn(
                      "group flex h-11 items-center justify-center rounded-md border text-xs font-semibold transition-colors",
                      placed
                        ? GATE_COLORS[placed.gate]
                        : "border-dashed border-border text-muted-foreground/50 hover:border-foreground/30 hover:text-foreground/70",
                    )}
                  >
                    {placed ? (
                      <span className="flex items-center gap-1">
                        {placed.gate}
                        <X className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </span>
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {gates.length === 0
          ? "Click a gate above, then click any dashed cell to place it. Click a placed gate to remove it."
          : `${gates.length} gate${gates.length === 1 ? "" : "s"} placed. Click a placed gate to remove it.`}
      </p>
    </div>
  )
}
