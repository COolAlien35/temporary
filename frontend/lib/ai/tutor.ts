import type { SimResult, StudioCircuit } from "@/lib/studio/types"
import { computeCircuitInfo } from "@/lib/studio/circuit-info"
import { GATE_DEFS } from "@/lib/studio/gates"

export interface TutorContext {
  circuit: StudioCircuit
  result?: SimResult
  previousResult?: SimResult
}

export type TutorAction = "explain" | "changed" | "unexpected" | "optimize" | "generate"

function topOutcomes(probabilities: Record<string, number> | undefined, n = 3) {
  if (!probabilities) return []
  return Object.entries(probabilities)
    .filter(([, p]) => p > 0.001)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}

function detectEntanglement(circuit: StudioCircuit) {
  return circuit.gates.some((g) => g.type === "CNOT" || g.type === "CZ" || g.type === "SWAP" || g.type === "CP" || g.type === "CCX")
}

/**
 * Deterministic, circuit-aware mock tutor. Structured so a real LLM call can replace the body
 * of this function later without touching call sites — callers pass the same `askTutor(context,
 * prompt, action)` signature either way.
 */
export function askTutor(context: TutorContext, prompt: string, action: TutorAction = "explain"): string {
  const { circuit, result, previousResult } = context
  const info = computeCircuitInfo(circuit.qubits, circuit.gates)
  const entangled = detectEntanglement(circuit)

  switch (action) {
    case "explain": {
      if (circuit.gates.length === 0) return "This circuit is empty. Drag a gate onto a wire, or load a template from the left panel to get started."
      const gateList = Object.entries(info.gateCountByType)
        .map(([type, count]) => `${count}\u00d7 ${GATE_DEFS[type as keyof typeof GATE_DEFS]?.label ?? type}`)
        .join(", ")
      const top = topOutcomes(result?.probabilities)
      const outcomeText = top.length ? `The most likely outcomes are ${top.map(([k, p]) => `|${k}\u27e9 at ${(p * 100).toFixed(1)}%`).join(", ")}.` : "Run the circuit to see the resulting distribution."
      return `This circuit uses ${info.qubits} qubit${info.qubits > 1 ? "s" : ""} across ${info.depth} time step${info.depth === 1 ? "" : "s"}: ${gateList}. ${entangled ? "It contains a multi-qubit gate, so the qubits are entangled \u2014 measuring one affects what you'd expect from the others." : "There are no multi-qubit gates yet, so every qubit currently evolves independently."} ${outcomeText}`
    }
    case "changed": {
      if (!previousResult || !result) return "There's only one run recorded so far \u2014 run the circuit again after making a change to see a diff."
      const before = previousResult.probabilities
      const after = result.probabilities
      const deltas = Object.keys(after)
        .map((key) => ({ key, delta: (after[key] ?? 0) - (before[key] ?? 0) }))
        .filter((d) => Math.abs(d.delta) > 0.01)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      if (deltas.length === 0) return "The probability distribution is unchanged since the last run."
      return `Since the last run: ${deltas
        .slice(0, 4)
        .map((d) => `|${d.key}\u27e9 ${d.delta > 0 ? "increased" : "decreased"} by ${Math.abs(d.delta * 100).toFixed(1)} pts`)
        .join("; ")}.`
    }
    case "unexpected": {
      if (!result) return "Run the circuit first, then ask again \u2014 I'll compare the result against what the gate sequence predicts."
      const top = topOutcomes(result.probabilities, 1)
      const noise = result.fidelity < 0.98 ? ` Noise is also active (fidelity ${(result.fidelity * 100).toFixed(1)}%), which spreads probability toward a uniform mix \u2014 try the Noise Lab sliders at 0% to isolate the ideal behavior.` : ""
      return `${top.length ? `The dominant outcome is |${top[0][0]}\u27e9 at ${(top[0][1] * 100).toFixed(1)}%.` : "No single outcome dominates \u2014 the state is in superposition."} ${entangled ? "Because qubits are entangled, individual-qubit intuition (treating each qubit as independent) will look wrong until you consider the joint state." : "Double check gate order: gates in an earlier time-step column apply first."}${noise}`
    }
    case "optimize": {
      const suggestions: string[] = []
      if ((info.gateCountByType.I ?? 0) > 0) suggestions.push("Remove Identity gates \u2014 they don't change the state and only add depth.")
      const barrierCount = info.gateCountByType.BARRIER ?? 0
      if (barrierCount > 2) suggestions.push("You have several barriers \u2014 they're useful for readability but don't affect simulation, so trim ones that don't mark a real boundary.")
      if (info.tCount > 4) suggestions.push(`This circuit uses ${info.tCount} T-type gates. T-count matters a lot on real hardware \u2014 see if some can be replaced with cheaper Clifford gates (H, S, X, Y, Z, CNOT).`)
      if (info.depth > info.gateCount) suggestions.push("Some time-step columns are empty \u2014 compact the circuit by moving gates into earlier free columns to reduce depth.")
      if (suggestions.length === 0) suggestions.push("This circuit already looks reasonably tight \u2014 gate count and depth are proportionate for what it computes.")
      return suggestions.join(" ")
    }
    case "generate":
      return `Try describing a well-known circuit by name (e.g. "bell state", "GHZ", "Grover", "QFT", "teleportation") and I'll suggest a template you can load from the Templates panel.`
    default:
      return "Ask me to explain the circuit, summarize what changed, investigate an unexpected result, or suggest an optimization."
  }
}
