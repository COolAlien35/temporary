export type QuizStatus = "Active" | "Draft" | "Closed"
export type QuestionType = "Multiple Choice" | "Numeric" | "Circuit-Based"
export type AssignmentMode = "cohort" | "batch" | "students"

export interface BankQuestion {
  id: string
  unitId: string
  type: QuestionType
  prompt: string
  options?: string[]
  answer?: number
  numericAnswer?: string
  tolerance?: string
  circuitDescription?: string
  targetDistribution?: string
  explanation: string
  tags: string[]
  misconception?: string
  xp: number
  usageCount: number
  avgCorrect: number
}

export interface QuizAssignment {
  mode: AssignmentMode
  batch?: "Fall 2024 - A" | "Fall 2024 - B"
  studentIds: string[]
  dueDate: string
  allowRetakes: boolean
  maxRetakes: number
  latePenalty: boolean
  latePenaltyPercent: number
}

export interface Quiz {
  id: string
  title: string
  unitId: string
  questionIds: string[]
  timeLimit: number | null
  passMark: number
  instructions: string
  status: QuizStatus
  assignment: QuizAssignment
}

export interface QuestionResult {
  questionId: string
  correctPct: number
  mostChosenWrong: string
  misconception?: string
  optionBreakdown: { label: string; pct: number }[]
}

export interface Submission {
  studentName: string
  score: number
  timeTaken: string
  date: string
  retake: number
  passed: boolean
  answers: { questionId: string; chosenLabel: string; correct: boolean }[]
}

export interface QuizAnalytics {
  totalSubmissions: number
  avgScore: number
  passRate: number
  highest: number
  lowest: number
  distribution: { range: string; pct: number; color: string }[]
  perQuestion: QuestionResult[]
  submissions: Submission[]
}

export const misconceptionOptions = [
  "measurement-is-averaging",
  "grover-exponential-speedup",
  "entanglement-is-signaling",
  "cooling-power-vs-temperature-confusion",
]

export const batchOptions = ["Fall 2024 - A", "Fall 2024 - B"] as const

export const questionBank: BankQuestion[] = [
  {
    id: "bq-1",
    unitId: "u1",
    type: "Multiple Choice",
    prompt: "After applying H to |0⟩, what is P(|1⟩)?",
    options: ["0", "1/2", "1", "It depends on the global phase"],
    answer: 1,
    explanation: "H|0⟩ = (|0⟩+|1⟩)/√2, so each outcome has probability 1/2.",
    tags: ["superposition", "measurement"],
    xp: 2,
    usageCount: 3,
    avgCorrect: 81,
  },
  {
    id: "bq-2",
    unitId: "u1",
    type: "Multiple Choice",
    prompt: "A single measurement of a qubit in superposition reveals:",
    options: ["The average of all amplitudes", "One sampled outcome", "Every amplitude at once", "Nothing useful"],
    answer: 1,
    explanation: "A measurement returns exactly one outcome; repeated trials estimate the probability distribution.",
    tags: ["measurement", "superposition"],
    misconception: "measurement-is-averaging",
    xp: 2,
    usageCount: 2,
    avgCorrect: 54,
  },
  {
    id: "bq-3",
    unitId: "u1",
    type: "Numeric",
    prompt: "If |α|² = 0.36, what is |β|² for a normalized single-qubit state?",
    numericAnswer: "0.64",
    tolerance: "0.02",
    explanation: "Normalization requires |α|² + |β|² = 1, so |β|² = 1 − 0.36 = 0.64.",
    tags: ["normalization", "amplitudes"],
    xp: 3,
    usageCount: 1,
    avgCorrect: 62,
  },
  {
    id: "bq-4",
    unitId: "u1",
    type: "Multiple Choice",
    prompt: "A global phase e^{iγ} applied to a state |ψ⟩ will:",
    options: ["Change every measurement probability", "Have no effect on measurement probabilities", "Collapse the state", "Double the qubit count"],
    answer: 1,
    explanation: "Global phase is physically unobservable — only relative phase affects interference and probabilities.",
    tags: ["phase", "measurement"],
    xp: 2,
    usageCount: 2,
    avgCorrect: 47,
  },
  {
    id: "bq-5",
    unitId: "u2",
    type: "Multiple Choice",
    prompt: "Which property must every quantum gate satisfy?",
    options: ["It must be unitary", "It must be diagonal", "It must be classical", "It must destroy information"],
    answer: 0,
    explanation: "Unitary operators preserve total probability (U†U = I) and are always reversible.",
    tags: ["gates", "unitary"],
    xp: 2,
    usageCount: 3,
    avgCorrect: 74,
  },
  {
    id: "bq-6",
    unitId: "u2",
    type: "Multiple Choice",
    prompt: "In a circuit diagram, a controlled gate fires its target operation when:",
    options: ["The control qubit is in state |1⟩", "The circuit reaches the last column", "Any qubit is measured", "The target qubit is |0⟩"],
    answer: 0,
    explanation: "A controlled gate applies its operation on the target only when the control condition (typically |1⟩) is met.",
    tags: ["circuits", "controlled-gates"],
    xp: 2,
    usageCount: 2,
    avgCorrect: 69,
  },
  {
    id: "bq-7",
    unitId: "u2",
    type: "Circuit-Based",
    prompt: "Build a circuit that creates a Bell state from |00⟩.",
    circuitDescription: "Apply H to qubit 0, then CNOT with qubit 0 as control and qubit 1 as target.",
    targetDistribution: "00: 0.5, 11: 0.5",
    explanation: "H creates superposition on qubit 0 and CNOT correlates the two qubits into (|00⟩+|11⟩)/√2.",
    tags: ["entanglement", "bell-state"],
    xp: 4,
    usageCount: 2,
    avgCorrect: 58,
  },
  {
    id: "bq-8",
    unitId: "u3",
    type: "Multiple Choice",
    prompt: "Two entangled qubits are measured at distant locations. What can be transmitted using only entanglement?",
    options: ["Usable information faster than light", "Nothing — no classical channel is created", "Any classical bit instantly", "The full quantum state"],
    answer: 1,
    explanation: "Entanglement produces correlated outcomes but cannot be used alone to signal information faster than light.",
    tags: ["entanglement", "no-signaling"],
    misconception: "entanglement-is-signaling",
    xp: 3,
    usageCount: 2,
    avgCorrect: 41,
  },
  {
    id: "bq-9",
    unitId: "u3",
    type: "Multiple Choice",
    prompt: "Which best describes quantum teleportation?",
    options: [
      "Physically moving a particle instantly",
      "Transferring a quantum state using entanglement plus classical communication",
      "Cloning a qubit without measurement",
      "A purely classical protocol",
    ],
    answer: 1,
    explanation: "Teleportation reconstructs a state at a distant location using shared entanglement and two classical bits.",
    tags: ["entanglement", "teleportation"],
    xp: 3,
    usageCount: 1,
    avgCorrect: 65,
  },
  {
    id: "bq-10",
    unitId: "u3",
    type: "Multiple Choice",
    prompt: "A maximally entangled two-qubit state cannot be written as:",
    options: ["A tensor product of two single-qubit states", "A superposition of basis states", "A normalized vector", "A pure state"],
    answer: 0,
    explanation: "Entangled states are, by definition, not separable into an independent tensor product of the individual qubits.",
    tags: ["entanglement", "tensor-product"],
    xp: 3,
    usageCount: 1,
    avgCorrect: 57,
  },
  {
    id: "bq-11",
    unitId: "u4",
    type: "Multiple Choice",
    prompt: "In the Deutsch-Jozsa algorithm, interference is used to:",
    options: ["Amplify the amplitude of the correct global answer", "Randomize all outcomes equally", "Avoid using an oracle", "Collapse the state before computation"],
    answer: 0,
    explanation: "Interference concentrates amplitude onto the outcome that reveals whether the function is constant or balanced.",
    tags: ["algorithms", "interference"],
    xp: 3,
    usageCount: 1,
    avgCorrect: 66,
  },
  {
    id: "bq-12",
    unitId: "u5",
    type: "Multiple Choice",
    prompt: "What speedup does ideal Grover search provide over an unstructured classical search?",
    options: ["Exponential", "Quadratic", "None", "It solves every search in one step"],
    answer: 1,
    explanation: "Grover reduces query complexity from O(N) to O(√N) — a quadratic, not exponential, speedup.",
    tags: ["grover", "search"],
    misconception: "grover-exponential-speedup",
    xp: 3,
    usageCount: 3,
    avgCorrect: 38,
  },
  {
    id: "bq-13",
    unitId: "u5",
    type: "Multiple Choice",
    prompt: "The Grover diffusion operator's main role is to:",
    options: ["Mark the correct answer", "Reflect amplitudes about the average", "Measure every qubit", "Add classical noise"],
    answer: 1,
    explanation: "The diffusion operator amplifies the marked amplitude by reflecting all amplitudes about their mean.",
    tags: ["grover", "amplitude-amplification"],
    xp: 3,
    usageCount: 2,
    avgCorrect: 49,
  },
  {
    id: "bq-14",
    unitId: "u5",
    type: "Numeric",
    prompt: "For N = 1,000,000 unstructured items, roughly how many Grover iterations are needed (√N, rounded)?",
    numericAnswer: "1000",
    tolerance: "50",
    explanation: "Grover's optimal iteration count scales as O(√N); √1,000,000 = 1000.",
    tags: ["grover", "complexity"],
    xp: 4,
    usageCount: 1,
    avgCorrect: 44,
  },
  {
    id: "bq-15",
    unitId: "u5",
    type: "Multiple Choice",
    prompt: "The Quantum Fourier Transform is a key building block for:",
    options: ["Shor's factoring algorithm", "Classical bubble sort", "Manual gate calibration", "Qubit cooling"],
    answer: 0,
    explanation: "QFT underlies phase estimation, which Shor's algorithm uses to extract periodicity for factoring.",
    tags: ["qft", "shor"],
    xp: 3,
    usageCount: 1,
    avgCorrect: 60,
  },
  {
    id: "bq-16",
    unitId: "u6",
    type: "Multiple Choice",
    prompt: "A variational quantum algorithm uses a classical optimizer to:",
    options: ["Tune parameters of a quantum circuit", "Replace all quantum gates", "Measure qubits without a circuit", "Avoid using a cost function"],
    answer: 0,
    explanation: "Variational algorithms alternate between a parameterized quantum circuit and a classical optimizer adjusting those parameters.",
    tags: ["variational", "optimization"],
    xp: 3,
    usageCount: 1,
    avgCorrect: 71,
  },
  {
    id: "bq-17",
    unitId: "u7",
    type: "Multiple Choice",
    prompt: "T1 primarily describes what in a superconducting qubit?",
    options: ["Energy relaxation time", "Classical clock rate", "Readout bandwidth", "Room temperature"],
    answer: 0,
    explanation: "T1 is the characteristic energy-relaxation time — how long a qubit stays in an excited state before decaying.",
    tags: ["noise", "T1"],
    xp: 2,
    usageCount: 2,
    avgCorrect: 55,
  },
  {
    id: "bq-18",
    unitId: "u7",
    type: "Multiple Choice",
    prompt: "Lowering a dilution refrigerator's temperature further will always increase usable cooling power. True or false?",
    options: ["True — lower temperature always means more cooling power", "False — cooling power and temperature are related but not interchangeable", "True, but only above 1K", "False — temperature has no relation to cooling power"],
    answer: 1,
    explanation: "Cooling power typically decreases as temperature drops; the two are related but distinct engineering quantities.",
    tags: ["hardware", "cryogenics"],
    misconception: "cooling-power-vs-temperature-confusion",
    xp: 3,
    usageCount: 2,
    avgCorrect: 46,
  },
  {
    id: "bq-19",
    unitId: "u7",
    type: "Multiple Choice",
    prompt: "Which error-correcting approach spreads one logical qubit across many physical qubits?",
    options: ["Surface codes", "Overclocking", "Analog filtering", "Classical parity only"],
    answer: 0,
    explanation: "Surface codes (and other stabilizer codes) encode a logical qubit redundantly across physical qubits to detect and correct errors.",
    tags: ["error-correction", "surface-code"],
    xp: 3,
    usageCount: 1,
    avgCorrect: 63,
  },
  {
    id: "bq-20",
    unitId: "u7",
    type: "Numeric",
    prompt: "A qubit has T1 = 80 microseconds. Roughly what fraction of population remains excited after one T1 (as a decimal, e^-1)?",
    numericAnswer: "0.37",
    tolerance: "0.03",
    explanation: "After one T1 period, the excited-state population decays to 1/e ≈ 0.37 of its initial value.",
    tags: ["noise", "T1"],
    xp: 4,
    usageCount: 1,
    avgCorrect: 33,
  },
  {
    id: "bq-21",
    unitId: "u8",
    type: "Circuit-Based",
    prompt: "Design a circuit that produces a uniform superposition across 3 qubits.",
    circuitDescription: "Apply H independently to each of the 3 qubits.",
    targetDistribution: "each of 8 basis states: 0.125",
    explanation: "Applying H to every qubit independently produces an equal superposition over all 2^n basis states.",
    tags: ["circuits", "superposition"],
    xp: 3,
    usageCount: 1,
    avgCorrect: 70,
  },
  {
    id: "bq-22",
    unitId: "u9",
    type: "Multiple Choice",
    prompt: "In a dilution refrigerator, the mixing chamber stage is used to reach:",
    options: ["The coldest stage, typically millikelvin temperatures", "Room temperature", "The 4K stage only", "The warmest stage"],
    answer: 0,
    explanation: "The mixing chamber is the final and coldest stage of a dilution refrigerator, reaching millikelvin temperatures.",
    tags: ["hardware", "cryogenics"],
    xp: 3,
    usageCount: 1,
    avgCorrect: 59,
  },
]

export const quizzes: Quiz[] = [
  {
    id: "quiz-1",
    title: "Quantum Foundations Quiz",
    unitId: "u1",
    questionIds: ["bq-1", "bq-2", "bq-3", "bq-4", "bq-1", "bq-2", "bq-3", "bq-4", "bq-1", "bq-2"],
    timeLimit: 20,
    passMark: 70,
    instructions: "Answer every question. You may flag questions and return to them before submitting.",
    status: "Active",
    assignment: {
      mode: "cohort",
      studentIds: [],
      dueDate: "2024-10-10",
      allowRetakes: true,
      maxRetakes: 2,
      latePenalty: false,
      latePenaltyPercent: 10,
    },
  },
  {
    id: "quiz-2",
    title: "Gates & Circuits Assessment",
    unitId: "u2",
    questionIds: ["bq-5", "bq-6", "bq-7", "bq-5", "bq-6", "bq-7", "bq-5", "bq-6"],
    timeLimit: 15,
    passMark: 70,
    instructions: "Read each circuit carefully before answering.",
    status: "Active",
    assignment: {
      mode: "batch",
      batch: "Fall 2024 - A",
      studentIds: [],
      dueDate: "2024-10-18",
      allowRetakes: false,
      maxRetakes: 1,
      latePenalty: true,
      latePenaltyPercent: 15,
    },
  },
  {
    id: "quiz-3",
    title: "Entanglement Checkpoint",
    unitId: "u3",
    questionIds: ["bq-8", "bq-9", "bq-10", "bq-8", "bq-9", "bq-10"],
    timeLimit: null,
    passMark: 70,
    instructions: "A short checkpoint to confirm entanglement fundamentals before moving on.",
    status: "Active",
    assignment: {
      mode: "batch",
      batch: "Fall 2024 - B",
      studentIds: [],
      dueDate: "2024-10-22",
      allowRetakes: true,
      maxRetakes: 3,
      latePenalty: false,
      latePenaltyPercent: 10,
    },
  },
  {
    id: "quiz-4",
    title: "Grover's Algorithm Deep Dive",
    unitId: "u5",
    questionIds: ["bq-12", "bq-13", "bq-14", "bq-15", "bq-12", "bq-13", "bq-14", "bq-15", "bq-12", "bq-13", "bq-14", "bq-15"],
    timeLimit: 30,
    passMark: 75,
    instructions: "Covers Grover's algorithm, amplitude amplification, and the Quantum Fourier Transform.",
    status: "Draft",
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
    id: "quiz-5",
    title: "Noise & Error Correction Final",
    unitId: "u7",
    questionIds: ["bq-17", "bq-18", "bq-19", "bq-20", "bq-17", "bq-18", "bq-19", "bq-20", "bq-17", "bq-18", "bq-19", "bq-20", "bq-17", "bq-18", "bq-19"],
    timeLimit: 40,
    passMark: 70,
    instructions: "Final assessment for the Noise & Error Correction unit. No retakes.",
    status: "Closed",
    assignment: {
      mode: "cohort",
      studentIds: [],
      dueDate: "2024-09-30",
      allowRetakes: false,
      maxRetakes: 1,
      latePenalty: true,
      latePenaltyPercent: 20,
    },
  },
]

const studentNamesPool = [
  "Aisha Rahman",
  "Jonah Lee",
  "Sofia Martinez",
  "David Kim",
  "Priya Nair",
  "Marcus Chen",
  "Elena Rossi",
  "Theo Brooks",
]

function buildSubmissions(count: number, avg: number, passMark: number): Submission[] {
  const rows: Submission[] = []
  for (let i = 0; i < count; i++) {
    const name = studentNamesPool[i % studentNamesPool.length]
    const jitter = ((i * 7) % 41) - 20
    const score = Math.max(20, Math.min(100, avg + jitter))
    rows.push({
      studentName: name,
      score,
      timeTaken: `${8 + (i % 12)}m ${(i * 13) % 60}s`,
      date: `Oct ${2 + (i % 20)}, 2024`,
      retake: i % 5 === 0 ? 1 : 0,
      passed: score >= passMark,
      answers: [],
    })
  }
  return rows
}

function distributionFor(avg: number): { range: string; pct: number; color: string }[] {
  const low = Math.max(4, 30 - Math.round(avg / 4))
  const midLow = 100 - low - Math.max(6, Math.round(avg / 5)) - Math.max(4, Math.round((100 - avg) / 6))
  const mid = Math.max(6, Math.round(avg / 5))
  const high = Math.max(4, Math.round((100 - avg) / 6))
  const top = Math.max(0, 100 - low - Math.max(0, midLow) - mid - high)
  return [
    { range: "0–49%", pct: low, color: "#FB7185" },
    { range: "50–69%", pct: Math.max(0, midLow), color: "#F5B942" },
    { range: "70–89%", pct: mid + top, color: "#4ADE80" },
    { range: "90–100%", pct: high, color: "#00D4FF" },
  ]
}

export const quizAnalytics: Record<string, QuizAnalytics> = {
  "quiz-1": {
    totalSubmissions: 89,
    avgScore: 76,
    passRate: 82,
    highest: 100,
    lowest: 30,
    distribution: distributionFor(76),
    perQuestion: [
      { questionId: "bq-1", correctPct: 81, mostChosenWrong: "1", misconception: undefined, optionBreakdown: [{ label: "0", pct: 6 }, { label: "1/2", pct: 81 }, { label: "1", pct: 9 }, { label: "It depends on the global phase", pct: 4 }] },
      { questionId: "bq-2", correctPct: 54, mostChosenWrong: "The average of all amplitudes", misconception: "measurement-is-averaging", optionBreakdown: [{ label: "The average of all amplitudes", pct: 31 }, { label: "One sampled outcome", pct: 54 }, { label: "Every amplitude at once", pct: 11 }, { label: "Nothing useful", pct: 4 }] },
      { questionId: "bq-3", correctPct: 62, mostChosenWrong: "0.36", misconception: undefined, optionBreakdown: [{ label: "0.64", pct: 62 }, { label: "0.36", pct: 24 }, { label: "1", pct: 8 }, { label: "0", pct: 6 }] },
      { questionId: "bq-4", correctPct: 47, mostChosenWrong: "Change every measurement probability", misconception: undefined, optionBreakdown: [{ label: "Change every measurement probability", pct: 41 }, { label: "Have no effect on measurement probabilities", pct: 47 }, { label: "Collapse the state", pct: 8 }, { label: "Double the qubit count", pct: 4 }] },
    ],
    submissions: buildSubmissions(8, 76, 70),
  },
  "quiz-2": {
    totalSubmissions: 72,
    avgScore: 68,
    passRate: 61,
    highest: 100,
    lowest: 22,
    distribution: distributionFor(68),
    perQuestion: [
      { questionId: "bq-5", correctPct: 74, mostChosenWrong: "It must be diagonal", optionBreakdown: [{ label: "It must be unitary", pct: 74 }, { label: "It must be diagonal", pct: 16 }, { label: "It must be classical", pct: 6 }, { label: "It must destroy information", pct: 4 }] },
      { questionId: "bq-6", correctPct: 69, mostChosenWrong: "The circuit reaches the last column", optionBreakdown: [{ label: "The control qubit is in state |1⟩", pct: 69 }, { label: "The circuit reaches the last column", pct: 19 }, { label: "Any qubit is measured", pct: 8 }, { label: "The target qubit is |0⟩", pct: 4 }] },
      { questionId: "bq-7", correctPct: 58, mostChosenWrong: "Apply CNOT before H", optionBreakdown: [{ label: "H then CNOT", pct: 58 }, { label: "CNOT then H", pct: 27 }, { label: "Two independent H gates", pct: 11 }, { label: "X on both qubits", pct: 4 }] },
    ],
    submissions: buildSubmissions(6, 68, 70),
  },
  "quiz-3": {
    totalSubmissions: 45,
    avgScore: 71,
    passRate: 67,
    highest: 100,
    lowest: 28,
    distribution: distributionFor(71),
    perQuestion: [
      { questionId: "bq-8", correctPct: 41, mostChosenWrong: "Usable information faster than light", misconception: "entanglement-is-signaling", optionBreakdown: [{ label: "Usable information faster than light", pct: 46 }, { label: "Nothing — no classical channel is created", pct: 41 }, { label: "Any classical bit instantly", pct: 9 }, { label: "The full quantum state", pct: 4 }] },
      { questionId: "bq-9", correctPct: 65, mostChosenWrong: "Physically moving a particle instantly", optionBreakdown: [{ label: "Physically moving a particle instantly", pct: 22 }, { label: "Transferring a quantum state using entanglement plus classical communication", pct: 65 }, { label: "Cloning a qubit without measurement", pct: 9 }, { label: "A purely classical protocol", pct: 4 }] },
      { questionId: "bq-10", correctPct: 57, mostChosenWrong: "A superposition of basis states", optionBreakdown: [{ label: "A tensor product of two single-qubit states", pct: 57 }, { label: "A superposition of basis states", pct: 28 }, { label: "A normalized vector", pct: 10 }, { label: "A pure state", pct: 5 }] },
    ],
    submissions: buildSubmissions(5, 71, 70),
  },
}
