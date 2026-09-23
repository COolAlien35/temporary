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

function gateLine(g: StudioGate): string | null {
  if (SINGLE_METHOD[g.type]) return `${SINGLE_METHOD[g.type]} q[${g.qubit}];`
  switch (g.type) {
    case "RX":
      return `rx(${fmtTheta(g.theta)}) q[${g.qubit}];`
    case "RY":
      return `ry(${fmtTheta(g.theta)}) q[${g.qubit}];`
    case "RZ":
      return `rz(${fmtTheta(g.theta)}) q[${g.qubit}];`
    case "CNOT":
      return `cx q[${g.qubit}], q[${g.target ?? 1}];`
    case "CZ":
      return `cz q[${g.qubit}], q[${g.target ?? 1}];`
    case "SWAP":
      return `swap q[${g.qubit}], q[${g.target ?? 1}];`
    case "CP":
      return `cp(${fmtTheta(g.theta)}) q[${g.qubit}], q[${g.target ?? 1}];`
    case "CCX":
      return `ccx q[${g.qubit}], q[${g.target ?? 1}], q[${g.control2 ?? 2}];`
    case "BARRIER":
      return `barrier q[${g.qubit}];`
    case "MEASURE":
      return `measure q[${g.qubit}] -> c[${g.qubit}];`
    default:
      return null
  }
}

export function exportQasm(circuit: StudioCircuit): string {
  const lines = ["OPENQASM 2.0;", 'include "qelib1.inc";', "", `qreg q[${circuit.qubits}];`, `creg c[${circuit.qubits}];`, ""]
  const sorted = [...circuit.gates].sort((a, b) => a.step - b.step || a.qubit - b.qubit)
  for (const gate of sorted) {
    const line = gateLine(gate)
    if (line) lines.push(line)
  }
  const hasMeasure = circuit.gates.some((g) => g.type === "MEASURE")
  if (!hasMeasure) for (let i = 0; i < circuit.qubits; i++) lines.push(`measure q[${i}] -> c[${i}];`)
  return lines.join("\n")
}
