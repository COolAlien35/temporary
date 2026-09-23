export interface MockRunResult {
  counts: Record<string, number>
  statevector: number[]
  error?: { line: number; message: string }
  summary: string
}

export function runQiskitMock(code: string, shots = 1024): MockRunResult {
  const syntaxLine = code.split("\n").findIndex((line) => /qc\.(h|x|y|z|s|t|cx)\([^)]*$/.test(line.trim()))
  if (syntaxLine >= 0) {
    return { counts: {}, statevector: [], error: { line: syntaxLine + 1, message: "Syntax error: incomplete gate call" }, summary: "Run failed" }
  }
  const hasCnot = /qc\.cx\(\s*0\s*,\s*1\s*\)/i.test(code)
  const hasH = /qc\.h\(/i.test(code)
  const key = hasCnot && hasH ? "11" : hasH ? "00" : "00"
  return { counts: { [key]: shots }, statevector: key === "11" ? [0, 0, 0, 1] : [1, 0, 0, 0], summary: `Ran ${shots} shots · 1 outcome` }
}

export function validateQiskitCode(code: string, qubits = 2) {
  const markers: { line: number; message: string; severity: "warning" | "error" }[] = []
  code.split("\n").forEach((raw, index) => {
    const line = raw.trim()
    const gate = line.match(/qc\.([a-z]+)\(([^)]*)\)/i)
    if (!gate) return
    if (!["h", "x", "y", "z", "s", "t", "cx", "measure", "barrier"].includes(gate[1].toLowerCase())) {
      markers.push({ line: index + 1, message: `Unknown gate: ${gate[1]}`, severity: "error" })
    }
    const indexes = gate[2].match(/\d+/g)?.map(Number) ?? []
    if (indexes.some((value) => value >= qubits)) markers.push({ line: index + 1, message: `Qubit index out of range (0-${qubits - 1})`, severity: "error" })
  })
  if (!/qc\.measure(?:_all)?\s*\(/i.test(code)) markers.push({ line: Math.max(1, code.split("\n").length), message: "Measurement is missing at the end of the circuit", severity: "warning" })
  return markers
}

export default runQiskitMock

