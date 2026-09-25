import type { StudioGateType } from "./studio/types"

export type ChallengeStatus = "Active" | "Draft" | "Closed"
export type ChallengeDifficulty = "Beginner" | "Intermediate" | "Advanced"
export type AssignmentMode = "cohort" | "batch" | "students"
export type SubmissionStatus = "Auto-passed" | "Auto-failed" | "Needs review" | "Overridden"

export const batchOptions = ["Fall 2024 - A", "Fall 2024 - B"] as const

export const algorithmOptions = ["Deutsch\u2013Jozsa", "QFT", "Grover's", "Shor's", "QEC", "Custom"] as const

export const overrideReasons = [
  "Edge case \u2014 valid alternative circuit",
  "Hardware noise compensation",
  "Partial credit for approach",
  "Grading dispute",
  "Other",
] as const

export function basisStates(qubits: number): string[] {
  const count = 2 ** qubits
  return Array.from({ length: count }, (_, i) => i.toString(2).padStart(qubits, "0"))
}

export interface ScoringWeights {
  correctness: number
  efficiency: number
  speed: number
  passThreshold: number
}

export interface ChallengeAssignment {
  mode: AssignmentMode
  batch?: (typeof batchOptions)[number]
  studentIds: string[]
  dueDate: string
  allowRetakes: boolean
  maxRetakes: number
  latePenalty: boolean
  latePenaltyPercent: number
}

export interface Challenge {
  id: string
  title: string
  description: string
  unitId?: string
  algorithm?: (typeof algorithmOptions)[number]
  difficulty: ChallengeDifficulty
  estimatedMinutes: number
  status: ChallengeStatus
  qubits: number
  gateBudget: number
  allowedGates: StudioGateType[]
  targetDistribution: Record<string, number>
  tolerance: number
  templateKey: string
  scoring: ScoringWeights
  hints: string[]
  assignment: ChallengeAssignment
}

export interface SubmittedGate {
  step: number
  qubit: number
  gate: StudioGateType
  target?: number
}

export interface ChallengeSubmission {
  id: string
  studentName: string
  fidelity: number
  gateCount: number
  correctnessScore: number
  efficiencyScore: number
  speedScore: number
  score: number
  status: SubmissionStatus
  submittedDate: string
  reviewReason?: string
  overrideReason?: string
  overrideNotes?: string
  gates: SubmittedGate[]
  actualDistribution: Record<string, number>
}

export interface ChallengeAnalytics {
  totalSubmissions: number
  autoPassRate: number
  manualOverrideCount: number
  avgFidelity: number
  avgGateCount: number
  distribution: { label: string; pct: number; color: string }[]
  submissions: ChallengeSubmission[]
}

const defaultScoring: ScoringWeights = { correctness: 60, efficiency: 25, speed: 15, passThreshold: 70 }
const singleAndMultiGates: StudioGateType[] = ["H", "X", "Y", "Z", "S", "T", "CNOT", "CZ", "SWAP"]

export const challenges: Challenge[] = [
  {
    id: "ch-1",
    title: "Bell State Builder",
    description:
      "Construct a two-qubit circuit that produces a maximally entangled Bell pair. Your circuit should collapse to |00\u27e9 or |11\u27e9 with equal probability and nothing else.",
    unitId: "u3",
    algorithm: "Custom",
    difficulty: "Beginner",
    estimatedMinutes: 10,
    status: "Active",
    qubits: 2,
    gateBudget: 4,
    allowedGates: ["H", "X", "CNOT"],
    targetDistribution: { "00": 50, "01": 0, "10": 0, "11": 50 },
    tolerance: 5,
    templateKey: "bell",
    scoring: defaultScoring,
    hints: ["A single Hadamard puts one qubit into superposition.", "CNOT correlates the two qubits once one is in superposition."],
    assignment: {
      mode: "cohort",
      studentIds: [],
      dueDate: "2024-10-12",
      allowRetakes: true,
      maxRetakes: 3,
      latePenalty: false,
      latePenaltyPercent: 10,
    },
  },
  {
    id: "ch-2",
    title: "Grover's Oracle Construction",
    description: "Build the oracle-plus-diffusion circuit that amplifies the |11\u27e9 marked state in a 2-qubit search space.",
    unitId: "u5",
    algorithm: "Grover's",
    difficulty: "Intermediate",
    estimatedMinutes: 25,
    status: "Active",
    qubits: 2,
    gateBudget: 14,
    allowedGates: ["H", "X", "Z", "CZ", "CNOT"],
    targetDistribution: { "00": 0, "01": 0, "10": 0, "11": 100 },
    tolerance: 5,
    templateKey: "grover-2q",
    scoring: defaultScoring,
    hints: [
      "Start with Hadamards on both qubits to reach uniform superposition.",
      "The oracle for |11\u27e9 is a single CZ gate.",
      "The diffusion operator reflects amplitudes about the mean \u2014 sandwich it between X and H layers.",
    ],
    assignment: {
      mode: "batch",
      batch: "Fall 2024 - A",
      studentIds: [],
      dueDate: "2024-10-22",
      allowRetakes: true,
      maxRetakes: 2,
      latePenalty: true,
      latePenaltyPercent: 15,
    },
  },
  {
    id: "ch-3",
    title: "GHZ State Extension",
    description: "Extend a Bell pair into a 3-qubit GHZ state where the register collapses entirely to |000\u27e9 or |111\u27e9.",
    unitId: "u3",
    algorithm: "Custom",
    difficulty: "Intermediate",
    estimatedMinutes: 15,
    status: "Active",
    qubits: 3,
    gateBudget: 6,
    allowedGates: ["H", "CNOT"],
    targetDistribution: { "000": 50, "001": 0, "010": 0, "011": 0, "100": 0, "101": 0, "110": 0, "111": 50 },
    tolerance: 5,
    templateKey: "ghz",
    scoring: defaultScoring,
    hints: ["Build the Bell pair on the first two qubits first.", "Chain a second CNOT from one of the entangled qubits onto the third."],
    assignment: {
      mode: "batch",
      batch: "Fall 2024 - B",
      studentIds: [],
      dueDate: "2024-10-25",
      allowRetakes: true,
      maxRetakes: 2,
      latePenalty: false,
      latePenaltyPercent: 10,
    },
  },
  {
    id: "ch-4",
    title: "Quantum Teleportation Circuit",
    description: "Reconstruct the full teleportation protocol: entangle a Bell pair, perform a Bell measurement, and apply the classical correction.",
    unitId: "u3",
    algorithm: "Custom",
    difficulty: "Advanced",
    estimatedMinutes: 30,
    status: "Draft",
    qubits: 3,
    gateBudget: 12,
    allowedGates: ["H", "X", "Z", "CNOT", "CZ"],
    targetDistribution: { "000": 12.5, "001": 12.5, "010": 12.5, "011": 12.5, "100": 12.5, "101": 12.5, "110": 12.5, "111": 12.5 },
    tolerance: 8,
    templateKey: "teleportation",
    scoring: defaultScoring,
    hints: ["Entangle qubits 1 and 2 before touching qubit 0.", "The correction gates depend on the classical measurement outcomes."],
    assignment: {
      mode: "cohort",
      studentIds: [],
      dueDate: "",
      allowRetakes: true,
      maxRetakes: 2,
      latePenalty: false,
      latePenaltyPercent: 10,
    },
  },
  {
    id: "ch-5",
    title: "QFT Optimization",
    description: "Implement a 3-qubit Quantum Fourier Transform using the minimum number of controlled-phase gates and swaps.",
    unitId: "u5",
    algorithm: "QFT",
    difficulty: "Advanced",
    estimatedMinutes: 25,
    status: "Draft",
    qubits: 3,
    gateBudget: 8,
    allowedGates: ["H", "CNOT", "SWAP"],
    targetDistribution: { "000": 12.5, "001": 12.5, "010": 12.5, "011": 12.5, "100": 12.5, "101": 12.5, "110": 12.5, "111": 12.5 },
    tolerance: 6,
    templateKey: "qft-3q",
    scoring: { correctness: 55, efficiency: 35, speed: 10, passThreshold: 70 },
    hints: ["Order matters \u2014 apply the controlled-phase gates before the final swap.", "A trailing SWAP reorders the qubits into the standard bit order."],
    assignment: {
      mode: "cohort",
      studentIds: [],
      dueDate: "",
      allowRetakes: true,
      maxRetakes: 1,
      latePenalty: false,
      latePenaltyPercent: 10,
    },
  },
  {
    id: "ch-6",
    title: "Noise-Resilient Bell State",
    description: "Design a Bell-state circuit that keeps fidelity above threshold even when depolarizing noise is applied during simulation.",
    unitId: "u7",
    algorithm: "Custom",
    difficulty: "Intermediate",
    estimatedMinutes: 20,
    status: "Closed",
    qubits: 2,
    gateBudget: 6,
    allowedGates: ["H", "X", "CNOT", "S", "T"],
    targetDistribution: { "00": 50, "01": 0, "10": 0, "11": 50 },
    tolerance: 10,
    templateKey: "bell",
    scoring: defaultScoring,
    hints: ["Fewer gates mean fewer opportunities for noise to accumulate."],
    assignment: {
      mode: "cohort",
      studentIds: [],
      dueDate: "2024-09-28",
      allowRetakes: false,
      maxRetakes: 1,
      latePenalty: true,
      latePenaltyPercent: 20,
    },
  },
]

const studentNamesPool = ["Aisha Rahman", "Jonah Lee", "Sofia Martinez", "David Kim", "Priya Nair", "Marcus Chen", "Elena Rossi", "Theo Brooks"]

function buildSubmissions(challenge: Challenge, count: number, avgFidelity: number): ChallengeSubmission[] {
  const rows: ChallengeSubmission[] = []
  const states = basisStates(challenge.qubits)
  for (let i = 0; i < count; i++) {
    const name = studentNamesPool[i % studentNamesPool.length]
    const jitter = ((i * 11) % 31) - 15
    const fidelity = Math.max(35, Math.min(100, avgFidelity + jitter))
    const gateJitter = i % 4
    const gateCount = Math.max(1, challenge.gateBudget - 2 + gateJitter)
    const correctnessScore = Math.round((fidelity / 100) * challenge.scoring.correctness)
    const efficiencyScore = Math.round(Math.max(0, 1 - Math.max(0, gateCount - challenge.gateBudget) / challenge.gateBudget) * challenge.scoring.efficiency)
    const speedScore = Math.round((0.6 + (i % 5) * 0.08) * challenge.scoring.speed)
    const score = Math.min(100, correctnessScore + efficiencyScore + speedScore)

    let status: SubmissionStatus
    let reviewReason: string | undefined
    if (i % 9 === 0) {
      status = "Needs review"
      reviewReason = `Fidelity ${fidelity}% is within ${challenge.tolerance}% of the pass threshold \u2014 flagged for manual confirmation.`
    } else if (i % 13 === 0) {
      status = "Needs review"
      reviewReason = "Non-standard gate sequence detected \u2014 distribution matches but uses a prohibited gate."
    } else if (score >= challenge.scoring.passThreshold) {
      status = "Auto-passed"
    } else {
      status = "Auto-failed"
    }

    const actualDistribution: Record<string, number> = {}
    for (const state of states) {
      const target = challenge.targetDistribution[state] ?? 0
      const noise = target > 0 ? Math.max(0, target - (100 - fidelity) / states.length) : Math.min(6, (100 - fidelity) / states.length)
      actualDistribution[state] = Math.round(noise)
    }
    const total = Object.values(actualDistribution).reduce((a, b) => a + b, 0) || 1
    for (const state of states) {
      actualDistribution[state] = Math.round((actualDistribution[state] / total) * 100)
    }

    const gates: SubmittedGate[] = []
    let step = 0
    for (let q = 0; q < challenge.qubits && gates.length < gateCount; q++) {
      gates.push({ step, qubit: q, gate: "H" })
      step++
    }
    for (let q = 0; q < challenge.qubits - 1 && gates.length < gateCount; q++) {
      gates.push({ step, qubit: q, gate: "CNOT", target: q + 1 })
      step++
    }
    while (gates.length < gateCount) {
      gates.push({ step, qubit: gates.length % challenge.qubits, gate: "X" })
      step++
    }

    rows.push({
      id: `${challenge.id}-sub-${i}`,
      studentName: name,
      fidelity,
      gateCount,
      correctnessScore,
      efficiencyScore,
      speedScore,
      score,
      status,
      submittedDate: `Oct ${2 + (i % 24)}, 2024`,
      reviewReason,
      gates,
      actualDistribution,
    })
  }
  return rows
}

function distributionFor(passRate: number, reviewRate: number): { label: string; pct: number; color: string }[] {
  const fail = Math.max(0, 100 - passRate - reviewRate)
  return [
    { label: "Auto-passed", pct: passRate, color: "#4ADE80" },
    { label: "Needs review", pct: reviewRate, color: "#F5B942" },
    { label: "Auto-failed", pct: fail, color: "#FB7185" },
  ]
}

function analyticsFor(challenge: Challenge, count: number, avgFidelity: number, passRate: number, reviewRate: number): ChallengeAnalytics {
  const submissions = buildSubmissions(challenge, count, avgFidelity)
  const avgGateCount = Math.round(submissions.reduce((n, s) => n + s.gateCount, 0) / Math.max(1, submissions.length))
  const manualOverrideCount = submissions.filter((s) => s.status === "Needs review").length
  return {
    totalSubmissions: count,
    autoPassRate: passRate,
    manualOverrideCount,
    avgFidelity,
    avgGateCount,
    distribution: distributionFor(passRate, reviewRate),
    submissions,
  }
}

export const challengeAnalytics: Record<string, ChallengeAnalytics> = {
  "ch-1": analyticsFor(challenges[0], 52, 92, 87, 6),
  "ch-2": analyticsFor(challenges[1], 38, 78, 66, 13),
  "ch-3": analyticsFor(challenges[2], 24, 85, 79, 8),
  "ch-6": analyticsFor(challenges[5], 72, 71, 58, 11),
}
