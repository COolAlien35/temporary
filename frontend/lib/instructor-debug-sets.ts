import type { StudioGateType } from "./studio/types"
import { students } from "./instructor-students"

export type DebugSetStatus = "Active" | "Draft" | "Archived"
export type DebugSetDifficulty = "Beginner" | "Intermediate" | "Advanced"

export const conceptOptions = [
  "Superposition",
  "Entanglement",
  "Phase Kickback",
  "Grover's Algorithm",
  "Quantum Fourier Transform",
  "Error Mitigation",
  "Teleportation",
] as const

export const algorithmSlugOptions = ["deutsch-jozsa", "qft", "grovers", "shor", "qec", "custom"] as const

export function basisStatesForQubits(qubits: number): string[] {
  const count = 2 ** qubits
  return Array.from({ length: count }, (_, i) => i.toString(2).padStart(qubits, "0"))
}

export interface FaultedGate {
  step: number
  qubit: number
  gate: StudioGateType
  target?: number
  isFault: boolean
  faultDescription?: string
}

export interface SocraticQuestion {
  id: string
  question: string
  expectedInsight: string
  followUp: string
  hintIfStuck: string
}

export interface DebugScenario {
  id: string
  title: string
  description: string
  status: DebugSetStatus
  difficulty: DebugSetDifficulty
  concept: (typeof conceptOptions)[number]
  algorithmSlug: (typeof algorithmSlugOptions)[number]
  qubits: number
  correctGates: FaultedGate[]
  faultDescription: string
  socraticFlow: SocraticQuestion[]
  hints: string[]
  expectedFix: string
  createdDate: string
}

export interface StudentAttempt {
  studentName: string
  solved: boolean
  attempts: number
  hintsUsed: number
  timeSeconds: number
  date: string
}

export interface DebugSetAnalytics {
  scenarioId: string
  totalAttempts: number
  solveRate: number
  avgAttempts: number
  avgHintsUsed: number
  avgTimeSeconds: number
  fastestTimeSeconds: number
  slowestTimeSeconds: number
  studentAttempts: StudentAttempt[]
}

let uidCounter = 0
function uid(prefix: string) {
  uidCounter += 1
  return `${prefix}-${uidCounter}`
}

function socraticQ(question: string, expectedInsight: string, followUp: string, hintIfStuck: string): SocraticQuestion {
  return { id: uid("sq"), question, expectedInsight, followUp, hintIfStuck }
}

export const debugScenarios: DebugScenario[] = [
  {
    id: "ds-1",
    title: "Bell State Fault",
    description:
      "A two-qubit circuit meant to build a maximally entangled Bell pair has an extraneous bit-flip after entanglement, biasing the outcome away from the expected |00\u27e9/|11\u27e9 split.",
    status: "Active",
    difficulty: "Beginner",
    concept: "Entanglement",
    algorithmSlug: "custom",
    qubits: 2,
    correctGates: [
      { step: 0, qubit: 0, gate: "H", isFault: false },
      { step: 1, qubit: 0, gate: "CNOT", target: 1, isFault: false },
      { step: 2, qubit: 1, gate: "X", isFault: true, faultDescription: "Extra Pauli-X on q[1] after the CNOT flips the correlated outcome." },
    ],
    faultDescription: "An extra X gate on q[1] after the CNOT flips the second qubit, turning the Bell pair into |01\u27e9/|10\u27e9 instead of |00\u27e9/|11\u27e9.",
    socraticFlow: [
      socraticQ(
        "What outcomes do you expect to see if this circuit is working correctly?",
        "The student should recall that a Bell pair collapses only to |00\u27e9 or |11\u27e9, never mixed values.",
        "Exactly \u2014 the two qubits should always agree with each other.",
        "Think back to what a Hadamard followed by a CNOT is supposed to build.",
      ),
      socraticQ(
        "Now look at the actual measurement results. Do the two qubits always agree?",
        "The student should notice the qubits disagree (01/10 appear instead of 00/11).",
        "Right, they're anti-correlated instead of correlated \u2014 something is flipping one qubit.",
        "Compare a few individual shots bit by bit instead of just eyeballing the histogram.",
      ),
      socraticQ(
        "Which gate, if removed or disabled, would restore the correlation?",
        "The student should identify the extra X gate placed after the CNOT on q[1].",
        "That's the fault \u2014 disable that gate and re-verify.",
        "Trace q[1] step by step after the CNOT; look for any gate that isn't part of the standard Bell recipe.",
      ),
    ],
    hints: [
      "A correct Bell pair only ever measures |00\u27e9 or |11\u27e9.",
      "Compare the two qubits shot-by-shot rather than looking at the aggregate histogram.",
      "Trace every gate applied to q[1] after the CNOT.",
    ],
    expectedFix: "Disable the extra X gate on q[1] that comes after the CNOT so the circuit is left with only H on q[0] and CNOT(0\u21921).",
    createdDate: "2024-09-02",
  },
  {
    id: "ds-2",
    title: "Grover Oracle Anomaly",
    description:
      "The 2-qubit Grover search circuit swaps its CZ oracle for a CNOT, which marks the wrong basis state and prevents amplitude amplification from converging on |11\u27e9.",
    status: "Active",
    difficulty: "Intermediate",
    concept: "Grover's Algorithm",
    algorithmSlug: "grovers",
    qubits: 2,
    correctGates: [
      { step: 0, qubit: 0, gate: "H", isFault: false },
      { step: 0, qubit: 1, gate: "H", isFault: false },
      { step: 1, qubit: 0, gate: "CNOT", target: 1, isFault: true, faultDescription: "Oracle should be a CZ, not a CNOT \u2014 this marks the wrong phase relationship." },
      { step: 2, qubit: 0, gate: "H", isFault: false },
      { step: 2, qubit: 1, gate: "H", isFault: false },
      { step: 3, qubit: 0, gate: "X", isFault: false },
      { step: 3, qubit: 1, gate: "X", isFault: false },
      { step: 4, qubit: 0, gate: "CZ", target: 1, isFault: false },
      { step: 5, qubit: 0, gate: "X", isFault: false },
      { step: 5, qubit: 1, gate: "X", isFault: false },
      { step: 6, qubit: 0, gate: "H", isFault: false },
      { step: 6, qubit: 1, gate: "H", isFault: false },
    ],
    faultDescription: "The oracle gate was implemented as CNOT instead of CZ, so it flips a qubit's value instead of marking it with a phase, breaking amplitude amplification.",
    socraticFlow: [
      socraticQ(
        "What is the oracle supposed to do to the marked state \u2014 change its value or change its phase?",
        "The student should recall that Grover oracles apply a phase flip, not a bit flip, to preserve superposition.",
        "Exactly \u2014 the oracle must leave amplitudes' magnitudes untouched and only flip the sign.",
        "Compare what a CZ gate does to a two-qubit state versus what a CNOT does.",
      ),
      socraticQ(
        "After running the circuit, does the measured distribution converge toward |11\u27e9 as expected?",
        "The student should notice the distribution stays closer to uniform instead of amplifying |11\u27e9.",
        "Right \u2014 amplitude amplification isn't happening, which points to the oracle step.",
        "Run the circuit and check the probability of |11\u27e9 relative to the other three states.",
      ),
      socraticQ(
        "Which single gate in the oracle stage doesn't match the phase-oracle pattern?",
        "The student should locate the CNOT standing in for the CZ in the oracle step.",
        "That's it \u2014 swap that CNOT for a CZ and the amplification should converge correctly.",
        "Look specifically at the gate right after the first Hadamard layer, before the diffusion operator.",
      ),
    ],
    hints: [
      "Grover oracles use phase flips (CZ), not bit flips (CNOT).",
      "Check whether the output distribution amplifies toward the marked state after just one iteration.",
      "The fault is isolated to a single gate in the oracle stage, before the diffusion operator.",
    ],
    expectedFix: "Replace the CNOT in the oracle stage with a CZ gate so the marked state receives a phase flip instead of a bit flip.",
    createdDate: "2024-09-10",
  },
  {
    id: "ds-3",
    title: "Phase Kickback Disruption",
    description:
      "A phase kickback demonstration is missing the Hadamard gate that should prepare the helper (ancilla) qubit into superposition before the controlled oracle acts on it.",
    status: "Active",
    difficulty: "Intermediate",
    concept: "Phase Kickback",
    algorithmSlug: "custom",
    qubits: 2,
    correctGates: [
      { step: 0, qubit: 0, gate: "H", isFault: false },
      { step: 1, qubit: 1, gate: "H", isFault: true, faultDescription: "This Hadamard on the helper qubit q[1] was disabled, so it never enters superposition before the controlled oracle." },
      { step: 2, qubit: 0, gate: "CZ", target: 1, isFault: false },
      { step: 3, qubit: 0, gate: "H", isFault: false },
    ],
    faultDescription: "The helper qubit q[1] never receives its Hadamard, so it stays in |0\u27e9 and cannot kick a phase back onto the control qubit.",
    socraticFlow: [
      socraticQ(
        "For phase kickback to occur, what state does the helper qubit need to be in before the controlled gate?",
        "The student should recall the helper qubit must be an eigenstate reached via superposition, typically prepared with H.",
        "Right \u2014 without that superposition there's nothing for the phase to kick back onto.",
        "Think about what state a controlled-Z needs its target in to actually create a phase effect on the control.",
      ),
      socraticQ(
        "Trace q[1] through the circuit. What state is it in right before the controlled gate fires?",
        "The student should notice q[1] is still |0\u27e9 because its Hadamard was skipped.",
        "Exactly \u2014 it never left |0\u27e9, so the CZ has nothing to act on meaningfully.",
        "Check each gate applied to q[1] in step order \u2014 is there a gate missing compared to q[0]?",
      ),
      socraticQ(
        "What single gate would you add back to restore the kickback effect?",
        "The student should identify that a Hadamard on q[1] before the CZ needs to be re-enabled.",
        "That's the fix \u2014 re-enable that Hadamard and the phase should kick back correctly.",
        "Compare this circuit to the standard phase kickback template \u2014 what's the very first gate on the helper qubit there?",
      ),
    ],
    hints: [
      "Phase kickback requires the helper qubit to already be in superposition.",
      "Trace q[1] step by step \u2014 does it ever leave |0\u27e9 before the controlled gate?",
      "Compare against the standard template: the helper qubit should get an H before anything else.",
    ],
    expectedFix: "Re-enable the Hadamard gate on the helper qubit q[1] so it is in superposition before the controlled-Z executes.",
    createdDate: "2024-09-14",
  },
  {
    id: "ds-4",
    title: "GHZ Chain Break",
    description:
      "A 3-qubit GHZ state circuit has its second CNOT targeting the wrong qubit, leaving the third qubit unentangled from the rest of the chain.",
    status: "Active",
    difficulty: "Beginner",
    concept: "Entanglement",
    algorithmSlug: "custom",
    qubits: 3,
    correctGates: [
      { step: 0, qubit: 0, gate: "H", isFault: false },
      { step: 1, qubit: 0, gate: "CNOT", target: 1, isFault: false },
      { step: 2, qubit: 1, gate: "CNOT", target: 0, isFault: true, faultDescription: "This CNOT should target q[2] to extend the chain, not loop back to q[0]." },
    ],
    faultDescription: "The second CNOT in the chain targets q[0] instead of q[2], so the third qubit is left in |0\u27e9 and never joins the GHZ state.",
    socraticFlow: [
      socraticQ(
        "In a 3-qubit GHZ state, how many qubits should end up entangled together?",
        "The student should recall that all three qubits must be entangled into a single chain.",
        "Right \u2014 every qubit needs to be linked into the chain, not just the first two.",
        "Think about what makes a GHZ state different from a simple Bell pair.",
      ),
      socraticQ(
        "Looking at q[2] specifically, does it ever interact with another qubit in this circuit?",
        "The student should notice q[2] is never targeted by any two-qubit gate.",
        "Exactly \u2014 q[2] is isolated and stays in |0\u27e9 the whole time.",
        "List every gate that touches q[2]. How many are there?",
      ),
      socraticQ(
        "Which gate should be redirected to actually reach q[2] and complete the chain?",
        "The student should identify the second CNOT's target qubit is wrong and should point to q[2] instead of q[0].",
        "That's the fault \u2014 retarget that CNOT from q[0] to q[2] to complete the chain.",
        "Look at the second CNOT's control and target \u2014 compare it to what a chained entanglement should look like.",
      ),
    ],
    hints: [
      "A GHZ state needs every qubit linked into one continuous chain.",
      "Check which qubits are actually touched by two-qubit gates \u2014 is one left out?",
      "The second CNOT's target qubit is the one to inspect.",
    ],
    expectedFix: "Change the second CNOT's target from q[0] to q[2] so the entanglement chain extends across all three qubits.",
    createdDate: "2024-09-18",
  },
  {
    id: "ds-5",
    title: "QFT Phase Error",
    description:
      "A 3-qubit Quantum Fourier Transform circuit applies a controlled-phase gate with the wrong rotation angle, distorting the frequency-domain output.",
    status: "Draft",
    difficulty: "Advanced",
    concept: "Quantum Fourier Transform",
    algorithmSlug: "qft",
    qubits: 3,
    correctGates: [
      { step: 0, qubit: 0, gate: "H", isFault: false },
      { step: 1, qubit: 0, gate: "CP", target: 1, isFault: true, faultDescription: "This controlled-phase gate uses angle \u03c0 instead of the required \u03c0/2 for this qubit pair." },
      { step: 2, qubit: 0, gate: "CP", target: 2, isFault: false },
      { step: 3, qubit: 1, gate: "H", isFault: false },
      { step: 4, qubit: 1, gate: "CP", target: 2, isFault: false },
      { step: 5, qubit: 2, gate: "H", isFault: false },
      { step: 6, qubit: 0, gate: "SWAP", target: 2, isFault: false },
    ],
    faultDescription: "The controlled-phase gate between q[0] and q[1] uses angle \u03c0 instead of \u03c0/2, corrupting the relative phase relationships the QFT depends on.",
    socraticFlow: [
      socraticQ(
        "In a QFT, how does the rotation angle of each controlled-phase gate relate to the distance between the two qubits?",
        "The student should recall the angle halves for each additional qubit of separation (\u03c0/2, \u03c0/4, ...).",
        "Exactly \u2014 adjacent qubits get \u03c0/2, and it halves again for each qubit further away.",
        "Write out the standard QFT angle sequence for a 3-qubit register before checking the circuit.",
      ),
      socraticQ(
        "Which controlled-phase gate's angle doesn't match that expected sequence?",
        "The student should identify the q[0]\u2192q[1] gate is using \u03c0 instead of \u03c0/2.",
        "Right \u2014 that gate's angle is doubled compared to what it should be.",
        "Compare each CP gate's angle against the expected \u03c0/2, \u03c0/4 pattern one by one.",
      ),
      socraticQ(
        "What angle should that gate use instead, and why?",
        "The student should conclude it needs \u03c0/2 because q[0] and q[1] are adjacent in the register.",
        "That's correct \u2014 set that angle to \u03c0/2 and the frequency-domain output should match expectations.",
        "Adjacent qubits in the QFT always get the largest phase step in the sequence \u2014 what is that step?",
      ),
    ],
    hints: [
      "QFT rotation angles follow a halving pattern: \u03c0/2, \u03c0/4, \u03c0/8, ...",
      "Compare each controlled-phase gate's angle against its expected position in that sequence.",
      "The faulty gate connects the first two qubits in the register.",
    ],
    expectedFix: "Change the controlled-phase angle between q[0] and q[1] from \u03c0 to \u03c0/2 to match the expected QFT rotation sequence.",
    createdDate: "2024-09-22",
  },
  {
    id: "ds-6",
    title: "Teleportation Protocol Fault",
    description:
      "A quantum teleportation circuit applies the classical correction gates in the wrong order, so the reconstructed qubit doesn't match the original state.",
    status: "Draft",
    difficulty: "Advanced",
    concept: "Teleportation",
    algorithmSlug: "custom",
    qubits: 3,
    correctGates: [
      { step: 0, qubit: 1, gate: "H", isFault: false },
      { step: 1, qubit: 1, gate: "CNOT", target: 2, isFault: false },
      { step: 2, qubit: 0, gate: "CNOT", target: 1, isFault: false },
      { step: 3, qubit: 0, gate: "H", isFault: false },
      { step: 4, qubit: 2, gate: "X", isFault: true, faultDescription: "The X correction is applied before the Z correction, but the protocol requires Z before X." },
      { step: 5, qubit: 2, gate: "Z", isFault: false },
    ],
    faultDescription: "The classical correction gates on q[2] are applied in the order X then Z, but the teleportation protocol requires the Z correction to be applied before the X correction.",
    socraticFlow: [
      socraticQ(
        "In the teleportation protocol, do the order of the classical correction gates matter?",
        "The student should recall that X and Z corrections don't commute, so order matters for reconstructing the exact state.",
        "Right \u2014 since X and Z don't commute, swapping their order changes the resulting state.",
        "Try applying X then Z versus Z then X to the same qubit on paper \u2014 do you get the same result?",
      ),
      socraticQ(
        "Looking at the correction stage on q[2], which gate fires first in this circuit?",
        "The student should notice the X gate is applied before the Z gate.",
        "Exactly \u2014 X is currently first, which is the reverse of what's required.",
        "Check the step numbers assigned to the two correction gates on q[2].",
      ),
      socraticQ(
        "What's the correct order for these two correction gates, and how would you fix it?",
        "The student should conclude Z must come before X and reorder the two gates.",
        "That's the fix \u2014 swap their step order so Z fires before X.",
        "Recall the standard protocol: Bob applies a correction based on Alice's two classical bits \u2014 which one determines Z and which determines X, and in what order?",
      ),
    ],
    hints: [
      "X and Z corrections don't commute \u2014 order matters.",
      "Check the step numbers on the two correction gates applied to the receiving qubit.",
      "The standard protocol applies the Z correction before the X correction.",
    ],
    expectedFix: "Reorder the correction gates on q[2] so the Z gate is applied before the X gate.",
    createdDate: "2024-09-26",
  },
]

const studentPool = students.map((s) => s.name)

function buildStudentAttempts(count: number, solveRate: number, avgHints: number, avgSeconds: number): StudentAttempt[] {
  const rows: StudentAttempt[] = []
  for (let i = 0; i < count; i++) {
    const name = studentPool[i % studentPool.length]
    const solved = i % 100 < solveRate
    const jitterHints = ((i * 7) % 5) - 2
    const jitterTime = ((i * 13) % 61) - 30
    rows.push({
      studentName: name,
      solved,
      attempts: solved ? 1 + (i % 3) : 2 + (i % 4),
      hintsUsed: Math.max(0, avgHints + jitterHints),
      timeSeconds: Math.max(30, avgSeconds + jitterTime * 4),
      date: `Oct ${1 + (i % 26)}, 2024`,
    })
  }
  return rows
}

function analyticsFor(scenarioId: string, count: number, solveRate: number, avgHints: number, avgSeconds: number): DebugSetAnalytics {
  const studentAttempts = buildStudentAttempts(count, solveRate, avgHints, avgSeconds)
  const solvedRows = studentAttempts.filter((r) => r.solved)
  const times = studentAttempts.map((r) => r.timeSeconds)
  return {
    scenarioId,
    totalAttempts: count,
    solveRate,
    avgAttempts: Math.round((studentAttempts.reduce((n, r) => n + r.attempts, 0) / count) * 10) / 10,
    avgHintsUsed: Math.round((studentAttempts.reduce((n, r) => n + r.hintsUsed, 0) / count) * 10) / 10,
    avgTimeSeconds: Math.round(studentAttempts.reduce((n, r) => n + r.timeSeconds, 0) / count),
    fastestTimeSeconds: Math.min(...times),
    slowestTimeSeconds: Math.max(...times),
    studentAttempts,
  }
}

export const debugSetAnalytics: Record<string, DebugSetAnalytics> = {
  "ds-1": analyticsFor("ds-1", 48, 92, 1, 95),
  "ds-2": analyticsFor("ds-2", 41, 64, 3, 210),
  "ds-3": analyticsFor("ds-3", 35, 71, 2, 165),
  "ds-4": analyticsFor("ds-4", 44, 85, 1, 110),
}

export function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  if (minutes === 0) return `${seconds} sec`
  return `${minutes} min ${seconds} sec`
}
