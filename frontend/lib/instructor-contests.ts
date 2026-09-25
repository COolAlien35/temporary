export type ContestAccessType = "Public" | "Cohort" | "Batch" | "Invite Only"
export type InstructorContestStatus = "Live" | "Upcoming" | "Ended" | "Draft"
export type ContestDifficulty = "Beginner" | "Intermediate" | "Advanced"
export type ContestAccent = "cyan" | "violet" | "amber" | "green" | "fuchsia"
export type SubmissionStatus = "Approved" | "Flagged" | "Disqualified" | "Under Review"

export interface ContestScoringRule {
  id: string
  label: string
  maxPoints: number
  description: string
}

export interface ContestSubmission {
  id: string
  contestId: string
  studentId: string
  studentName: string
  studentInitials: string
  batch: string
  submittedAt: string
  fidelity: number
  gateCount: number
  circuitDepth: number
  score: number
  status: SubmissionStatus
  flagReason?: string
  instructorNotes?: string
  circuitSummary: string
}

export interface InstructorContest {
  id: string
  title: string
  status: InstructorContestStatus
  difficulty: ContestDifficulty
  accent: ContestAccent
  description: string
  problem: string
  rules: string[]
  scoringRubric: ContestScoringRule[]
  totalPoints: number
  startDate: string
  endDate: string
  countdown: string
  accessType: ContestAccessType
  targetCohorts: string[]
  targetBatches: string[]
  maxQubits: number
  gateBudget?: number
  allowedGates: string[]
  participantsCount: number
  submissionsCount: number
  avgFidelity: number
  flaggedCount: number
  createdAt: string
}

export const accentHex: Record<ContestAccent, string> = {
  cyan: "#00D4FF",
  violet: "#8B5CF6",
  amber: "#F5B942",
  green: "#10B981",
  fuchsia: "#E879F9",
}

export const allowedGateOptions = ["H", "X", "Y", "Z", "CNOT", "CZ", "SWAP", "T", "S", "Phase"]

export const cohortOptions = ["Cohort Alpha 2026", "Cohort Beta 2026"]
export const batchOptions = ["Batch A - Quantum Foundations", "Batch B - Algorithm Lab", "Batch C - Advanced QFT"]

export const contests: InstructorContest[] = [
  {
    id: "entanglement-speed",
    title: "Entanglement Speed Challenge",
    status: "Live",
    difficulty: "Intermediate",
    accent: "cyan",
    description: "Build a high-fidelity Bell state with the fewest gates.",
    problem:
      "Build a two-qubit circuit that produces a Bell state with fidelity above 95%. Your circuit should be readable, efficient, and reproducible.",
    rules: ["Correctness and fidelity: 60 points", "Gate efficiency: 25 points", "Submission speed: 15 points"],
    scoringRubric: [
      { id: "r1", label: "State fidelity", maxPoints: 60, description: "How close the output state is to the ideal Bell state." },
      { id: "r2", label: "Gate efficiency", maxPoints: 25, description: "Fewer gates for the same fidelity scores higher." },
      { id: "r3", label: "Submission speed", maxPoints: 15, description: "Earlier correct submissions earn a small bonus." },
    ],
    totalPoints: 100,
    startDate: "2026-09-20T09:00:00Z",
    endDate: "2026-09-27T09:00:00Z",
    countdown: "Ends in 2d 4h",
    accessType: "Public",
    targetCohorts: [],
    targetBatches: [],
    maxQubits: 2,
    gateBudget: 6,
    allowedGates: ["H", "X", "CNOT", "CZ"],
    participantsCount: 142,
    submissionsCount: 128,
    avgFidelity: 96.4,
    flaggedCount: 1,
    createdAt: "2026-09-15T10:00:00Z",
  },
  {
    id: "ghz-frontier",
    title: "GHZ State Frontier",
    status: "Upcoming",
    difficulty: "Advanced",
    accent: "violet",
    description: "Scale a GHZ state across four qubits under a gate budget.",
    problem: "Create a four-qubit GHZ state while using no more than 8 entangling operations.",
    rules: ["State fidelity: 55 points", "Gate budget: 30 points", "Explanation quality: 15 points"],
    scoringRubric: [
      { id: "r1", label: "State fidelity", maxPoints: 55, description: "Overlap with the ideal 4-qubit GHZ state." },
      { id: "r2", label: "Gate budget", maxPoints: 30, description: "Staying under the entangling-gate budget." },
      { id: "r3", label: "Explanation quality", maxPoints: 15, description: "Clarity of the submitted circuit writeup." },
    ],
    totalPoints: 100,
    startDate: "2026-09-25T18:00:00Z",
    endDate: "2026-10-02T18:00:00Z",
    countdown: "Starts in 6h",
    accessType: "Cohort",
    targetCohorts: ["Cohort Alpha 2026"],
    targetBatches: [],
    maxQubits: 4,
    gateBudget: 8,
    allowedGates: ["H", "X", "CNOT", "CZ", "SWAP"],
    participantsCount: 88,
    submissionsCount: 0,
    avgFidelity: 0,
    flaggedCount: 0,
    createdAt: "2026-09-18T12:00:00Z",
  },
  {
    id: "measurement-lab",
    title: "Measurement Lab Sprint",
    status: "Ended",
    difficulty: "Beginner",
    accent: "amber",
    description: "Predict the measurement distribution of a prepared qubit.",
    problem: "Prepare a single qubit and explain its measurement probabilities from the circuit alone.",
    rules: ["Prediction accuracy: 70 points", "Circuit clarity: 30 points"],
    scoringRubric: [
      { id: "r1", label: "Prediction accuracy", maxPoints: 70, description: "Match between predicted and simulated distribution." },
      { id: "r2", label: "Circuit clarity", maxPoints: 30, description: "Readable, well-annotated circuit." },
    ],
    totalPoints: 100,
    startDate: "2026-08-10T09:00:00Z",
    endDate: "2026-08-17T09:00:00Z",
    countdown: "Final results posted",
    accessType: "Batch",
    targetCohorts: [],
    targetBatches: ["Batch A - Quantum Foundations"],
    maxQubits: 1,
    gateBudget: undefined,
    allowedGates: ["H", "X", "Y", "Z"],
    participantsCount: 231,
    submissionsCount: 219,
    avgFidelity: 91.2,
    flaggedCount: 0,
    createdAt: "2026-08-01T09:00:00Z",
  },
  {
    id: "noise-navigator",
    title: "Noise Navigator",
    status: "Live",
    difficulty: "Advanced",
    accent: "green",
    description: "Design a circuit that stays stable under realistic noise.",
    problem: "Maximize output fidelity on a noisy simulator while preserving the target state.",
    rules: ["Noisy fidelity: 65 points", "Resource efficiency: 20 points", "Debug notes: 15 points"],
    scoringRubric: [
      { id: "r1", label: "Noisy fidelity", maxPoints: 65, description: "Fidelity measured on the noisy simulator backend." },
      { id: "r2", label: "Resource efficiency", maxPoints: 20, description: "Circuit depth and gate count relative to budget." },
      { id: "r3", label: "Debug notes", maxPoints: 15, description: "Quality of mitigation reasoning submitted." },
    ],
    totalPoints: 100,
    startDate: "2026-09-22T09:00:00Z",
    endDate: "2026-09-30T14:00:00Z",
    countdown: "Ends in 5d 1h",
    accessType: "Public",
    targetCohorts: [],
    targetBatches: [],
    maxQubits: 3,
    gateBudget: 12,
    allowedGates: ["H", "X", "Y", "Z", "CNOT", "T", "S"],
    participantsCount: 64,
    submissionsCount: 45,
    avgFidelity: 84.7,
    flaggedCount: 2,
    createdAt: "2026-09-14T09:00:00Z",
  },
  {
    id: "qft-optimization",
    title: "QFT Optimization Grand Prix",
    status: "Draft",
    difficulty: "Advanced",
    accent: "fuchsia",
    description: "Optimize a Quantum Fourier Transform circuit for depth and fidelity.",
    problem: "Implement a 3-qubit QFT circuit that minimizes circuit depth while keeping fidelity above 90%.",
    rules: ["State fidelity: 50 points", "Circuit depth: 35 points", "Documentation: 15 points"],
    scoringRubric: [
      { id: "r1", label: "State fidelity", maxPoints: 50, description: "Overlap with the ideal QFT output state." },
      { id: "r2", label: "Circuit depth", maxPoints: 35, description: "Lower depth for equivalent fidelity scores higher." },
      { id: "r3", label: "Documentation", maxPoints: 15, description: "Clarity of the submitted approach writeup." },
    ],
    totalPoints: 100,
    startDate: "2026-10-05T09:00:00Z",
    endDate: "2026-10-12T09:00:00Z",
    countdown: "Not yet published",
    accessType: "Batch",
    targetCohorts: [],
    targetBatches: ["Batch C - Advanced QFT"],
    maxQubits: 3,
    gateBudget: 14,
    allowedGates: ["H", "X", "CNOT", "CZ", "Phase", "S", "T"],
    participantsCount: 0,
    submissionsCount: 0,
    avgFidelity: 0,
    flaggedCount: 0,
    createdAt: "2026-09-23T09:00:00Z",
  },
]

export const submissions: ContestSubmission[] = [
  {
    id: "sub-1",
    contestId: "entanglement-speed",
    studentId: "ari-vega",
    studentName: "Ari Vega",
    studentInitials: "AV",
    batch: "Batch A - Quantum Foundations",
    submittedAt: "2026-09-24T14:22:00Z",
    fidelity: 99.1,
    gateCount: 3,
    circuitDepth: 2,
    score: 98,
    status: "Approved",
    circuitSummary: "H(q0) → CNOT(q0,q1) → Measure",
  },
  {
    id: "sub-2",
    contestId: "entanglement-speed",
    studentId: "noah-singh",
    studentName: "Noah Singh",
    studentInitials: "NS",
    batch: "Batch A - Quantum Foundations",
    submittedAt: "2026-09-24T15:03:00Z",
    fidelity: 97.8,
    gateCount: 4,
    circuitDepth: 3,
    score: 93,
    status: "Approved",
    circuitSummary: "H(q0) → CNOT(q0,q1) → Z(q1) → Measure",
  },
  {
    id: "sub-3",
    contestId: "entanglement-speed",
    studentId: "lena-park",
    studentName: "Lena Park",
    studentInitials: "LP",
    batch: "Batch B - Algorithm Lab",
    submittedAt: "2026-09-24T16:41:00Z",
    fidelity: 100,
    gateCount: 0,
    circuitDepth: 0,
    score: 100,
    status: "Flagged",
    flagReason: "Suspicious gate count: 0 gates with 100% fidelity",
    instructorNotes: "",
    circuitSummary: "Empty circuit — no gates applied",
  },
  {
    id: "sub-4",
    contestId: "entanglement-speed",
    studentId: "maya-chen",
    studentName: "Maya Chen",
    studentInitials: "MC",
    batch: "Batch B - Algorithm Lab",
    submittedAt: "2026-09-24T17:12:00Z",
    fidelity: 96.5,
    gateCount: 3,
    circuitDepth: 2,
    score: 91,
    status: "Approved",
    circuitSummary: "H(q0) → CNOT(q0,q1) → Measure",
  },
  {
    id: "sub-5",
    contestId: "entanglement-speed",
    studentId: "theo-brooks",
    studentName: "Theo Brooks",
    studentInitials: "TB",
    batch: "Batch A - Quantum Foundations",
    submittedAt: "2026-09-24T18:55:00Z",
    fidelity: 95.2,
    gateCount: 5,
    circuitDepth: 4,
    score: 87,
    status: "Approved",
    circuitSummary: "H(q0) → X(q1) → CNOT(q0,q1) → H(q1) → Measure",
  },
  {
    id: "sub-6",
    contestId: "noise-navigator",
    studentId: "elena-rostova",
    studentName: "Elena Rostova",
    studentInitials: "ER",
    batch: "Batch C - Advanced QFT",
    submittedAt: "2026-09-23T11:20:00Z",
    fidelity: 88.4,
    gateCount: 9,
    circuitDepth: 6,
    score: 82,
    status: "Approved",
    circuitSummary: "H(q0) → T(q0) → CNOT(q0,q1) → S(q1) → CNOT(q1,q2) → Measure",
  },
  {
    id: "sub-7",
    contestId: "noise-navigator",
    studentId: "marcus-vance",
    studentName: "Marcus Vance",
    studentInitials: "MV",
    batch: "Batch A - Quantum Foundations",
    submittedAt: "2026-09-23T12:05:00Z",
    fidelity: 79.6,
    gateCount: 11,
    circuitDepth: 8,
    score: 71,
    status: "Approved",
    circuitSummary: "H(q0) → CNOT(q0,q1) → X(q2) → CNOT(q1,q2) → T(q2) → Measure",
  },
  {
    id: "sub-8",
    contestId: "noise-navigator",
    studentId: "ari-vega",
    studentName: "Ari Vega",
    studentInitials: "AV",
    batch: "Batch A - Quantum Foundations",
    submittedAt: "2026-09-23T13:30:00Z",
    fidelity: 91.2,
    gateCount: 8,
    circuitDepth: 5,
    score: 89,
    status: "Under Review",
    instructorNotes: "Checking noisy backend calibration before final score.",
    circuitSummary: "H(q0) → CNOT(q0,q1) → CNOT(q1,q2) → T(q1) → Measure",
  },
  {
    id: "sub-9",
    contestId: "noise-navigator",
    studentId: "noah-singh",
    studentName: "Noah Singh",
    studentInitials: "NS",
    batch: "Batch A - Quantum Foundations",
    submittedAt: "2026-09-23T14:10:00Z",
    fidelity: 96.9,
    gateCount: 8,
    circuitDepth: 5,
    score: 90,
    status: "Flagged",
    flagReason: "Identical circuit AST to another student (99.8% similarity)",
    instructorNotes: "",
    circuitSummary: "H(q0) → CNOT(q0,q1) → CNOT(q1,q2) → S(q1) → Measure",
  },
  {
    id: "sub-10",
    contestId: "measurement-lab",
    studentId: "lena-park",
    studentName: "Lena Park",
    studentInitials: "LP",
    batch: "Batch B - Algorithm Lab",
    submittedAt: "2026-08-15T09:40:00Z",
    fidelity: 94.0,
    gateCount: 2,
    circuitDepth: 2,
    score: 96,
    status: "Approved",
    circuitSummary: "H(q0) → Measure",
  },
  {
    id: "sub-11",
    contestId: "measurement-lab",
    studentId: "maya-chen",
    studentName: "Maya Chen",
    studentInitials: "MC",
    batch: "Batch B - Algorithm Lab",
    submittedAt: "2026-08-17T09:05:00Z",
    fidelity: 90.5,
    gateCount: 2,
    circuitDepth: 2,
    score: 89,
    status: "Disqualified",
    flagReason: "Late submission timestamp after hard deadline",
    instructorNotes: "Submitted 5 minutes past the hard deadline.",
    circuitSummary: "X(q0) → Measure",
  },
  {
    id: "sub-12",
    contestId: "measurement-lab",
    studentId: "theo-brooks",
    studentName: "Theo Brooks",
    studentInitials: "TB",
    batch: "Batch A - Quantum Foundations",
    submittedAt: "2026-08-16T10:12:00Z",
    fidelity: 88.9,
    gateCount: 3,
    circuitDepth: 2,
    score: 85,
    status: "Under Review",
    instructorNotes: "Prediction reasoning is unclear — awaiting clarification.",
    circuitSummary: "H(q0) → S(q0) → Measure",
  },
]

export function statusBadgeClass(status: InstructorContestStatus) {
  switch (status) {
    case "Live":
      return "border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#4ADE80]"
    case "Upcoming":
      return "border-[#F5B942]/30 bg-[#F5B942]/10 text-[#F5B942]"
    case "Ended":
      return "border-white/10 bg-white/5 text-white/50"
    case "Draft":
      return "border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#8B5CF6]"
  }
}

export function difficultyBadgeClass(difficulty: ContestDifficulty) {
  switch (difficulty) {
    case "Beginner":
      return "text-[#4ADE80]"
    case "Intermediate":
      return "text-[#00D4FF]"
    case "Advanced":
      return "text-[#E879F9]"
  }
}

export function submissionStatusBadgeClass(status: SubmissionStatus) {
  switch (status) {
    case "Approved":
      return "border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#4ADE80]"
    case "Flagged":
      return "border-[#F5B942]/30 bg-[#F5B942]/10 text-[#F5B942]"
    case "Disqualified":
      return "border-[#FB7185]/30 bg-[#FB7185]/10 text-[#FB7185]"
    case "Under Review":
      return "border-[#00D4FF]/30 bg-[#00D4FF]/10 text-[#00D4FF]"
  }
}

export function fidelityColor(fidelity: number) {
  if (fidelity >= 95) return "#4ADE80"
  if (fidelity >= 85) return "#00D4FF"
  if (fidelity >= 70) return "#F5B942"
  return "#FB7185"
}
