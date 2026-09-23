import type { StudioCircuit, StudioGate } from "./types"

const SINGLE_METHOD: Record<string, string> = {
  I: "id",
  H: "h",
  X: "x",
  Y: "y",
  Z: "z",
  S: "s",
  SDG: "sdg",
  T: "t",
  TDG: "tdg",
}

function fmtTheta(theta = Math.PI / 2): string {
  const overPi = theta / Math.PI
  if (Math.abs(overPi - 0.25) < 1e-6) return "pi/4"
  if (Math.abs(overPi - 0.5) < 1e-6) return "pi/2"
  if (Math.abs(overPi - 1) < 1e-6) return "pi"
  return theta.toFixed(4)
}

function gateLine(g: StudioGate): string {
  if (SINGLE_METHOD[g.type]) return `qc.${SINGLE_METHOD[g.type]}(${g.qubit})`
  switch (g.type) {
    case "RX":
      return `qc.rx(${fmtTheta(g.theta)}, ${g.qubit})`
    case "RY":
      return `qc.ry(${fmtTheta(g.theta)}, ${g.qubit})`
    case "RZ":
      return `qc.rz(${fmtTheta(g.theta)}, ${g.qubit})`
    case "CNOT":
      return `qc.cx(${g.qubit}, ${g.target ?? 1})`
    case "CZ":
      return `qc.cz(${g.qubit}, ${g.target ?? 1})`
    case "SWAP":
      return `qc.swap(${g.qubit}, ${g.target ?? 1})`
    case "CP":
      return `qc.cp(${fmtTheta(g.theta)}, ${g.qubit}, ${g.target ?? 1})`
    case "CCX":
      return `qc.ccx(${g.qubit}, ${g.target ?? 1}, ${g.control2 ?? 2})`
    case "BARRIER":
      return `qc.barrier(${g.qubit})`
    case "MEASURE":
      return `qc.measure(${g.qubit}, ${g.qubit})`
    default:
      return `# unsupported gate ${g.type}`
  }
}

export function exportQiskit(circuit: StudioCircuit): string {
  const lines = ["from qiskit import QuantumCircuit", "", `qc = QuantumCircuit(${circuit.qubits}, ${circuit.qubits})`, ""]
  const sorted = [...circuit.gates].sort((a, b) => a.step - b.step || a.qubit - b.qubit)

  if (sorted.length === 0) {
    lines.push("# No gates placed yet \u2014 drag gates onto the canvas or write qc.<gate>() calls here.")
  } else {
    let lastStep = sorted[0].step
    for (const gate of sorted) {
      if (gate.step !== lastStep) {
        lines.push("")
        lastStep = gate.step
      }
      lines.push(gateLine(gate))
    }
  }

  const hasMeasure = circuit.gates.some((g) => g.type === "MEASURE")
  if (!hasMeasure) lines.push("", "qc.measure_all()")

  return lines.join("\n")
}
