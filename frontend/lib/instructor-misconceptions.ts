export type MisconceptionSeverity = "Critical" | "Moderate" | "Low"
export type MisconceptionSource = "prediction" | "quiz" | "debug" | "manual"
export type MisconceptionStatus = "Classified" | "Unclassified" | "Under Review"

export interface MisconceptionTag {
  id: string
  slug: string
  title: string
  description: string
  concept: string
  unitId: string
  status: MisconceptionStatus
  severity: MisconceptionSeverity
  studentCount: number
  occurrences: number
  firstSeen: string
  lastSeen: string
  correction: string
  relatedAlgorithms: string[]
  linkedQuizQuestionIds: string[]
}

export interface StudentMisconceptionInstance {
  studentId: string
  studentName: string
  batch: string
  misconceptionSlug: string
  source: MisconceptionSource
  evidenceType: string
  evidenceDetail: string
  timestamp: string
  resolved: boolean
  resolvedDate?: string
}

export interface PredictionEvidence {
  studentName: string
  algorithmSlug: string
  concept: string
  predictedDistribution: Record<string, number>
  actualDistribution: Record<string, number>
  deltaScore: number
  misconceptionTriggered: string | null
  timestamp: string
}

export interface ConceptHealthScore {
  concept: string
  unitId: string
  totalStudents: number
  avgMastery: number
  misconceptionCount: number
  topMisconception: string
  trend: "improving" | "stable" | "declining"
  riskLevel: "green" | "amber" | "red"
}

/* --------------------------------- Unclassified entries --------------------------------- */

export interface UnclassifiedEntry {
  id: string
  status: "Unclassified" | "Under Review"
  concept: string
  unitId: string
  evidenceDetail: string
  students: string[]
  timestamp: string
}

/* --------------------------------- Misconception taxonomy --------------------------------- */

export const misconceptionTags: MisconceptionTag[] = [
  {
    id: "mc-1",
    slug: "measurement-collapses-every-qubit",
    title: "Measurement collapses every qubit",
    description:
      "Students believe that measuring one qubit in a register forces every other qubit in the system to also collapse to a definite classical value, regardless of whether they are entangled with the measured qubit.",
    concept: "Superposition",
    unitId: "u1",
    status: "Classified",
    severity: "Critical",
    studentCount: 14,
    occurrences: 47,
    firstSeen: "Sep 3, 2024",
    lastSeen: "Oct 21, 2024",
    correction: "Measurement collapses only the measured qubit(s); other qubits remain in their (possibly entangled) state.",
    relatedAlgorithms: ["Deutsch\u2013Jozsa", "Grover's"],
    linkedQuizQuestionIds: ["q-superposition-1", "q-superposition-4"],
  },
  {
    id: "mc-2",
    slug: "entanglement-is-signaling",
    title: "Entanglement means faster-than-light signaling",
    description:
      "Students think that because measuring one half of an entangled pair instantly determines the outcome of the other half, information is being transmitted between the two qubits faster than light.",
    concept: "Entanglement",
    unitId: "u3",
    status: "Classified",
    severity: "Critical",
    studentCount: 11,
    occurrences: 38,
    firstSeen: "Sep 8, 2024",
    lastSeen: "Oct 23, 2024",
    correction: "Entanglement creates correlations but cannot transmit usable information faster than light.",
    relatedAlgorithms: ["Custom"],
    linkedQuizQuestionIds: ["q-entanglement-2"],
  },
  {
    id: "mc-3",
    slug: "oracle-marks-answer-automatically",
    title: "Oracle marks the answer automatically",
    description:
      "Students assume the Grover oracle directly outputs or highlights the marked state, rather than applying a phase flip that later needs amplitude amplification to become observable.",
    concept: "Grover's Algorithm",
    unitId: "u5",
    status: "Classified",
    severity: "Moderate",
    studentCount: 8,
    occurrences: 22,
    firstSeen: "Sep 15, 2024",
    lastSeen: "Oct 20, 2024",
    correction: "The oracle marks states via phase flip; amplitude amplification is still needed to make the answer likely.",
    relatedAlgorithms: ["Grover's"],
    linkedQuizQuestionIds: ["q-grover-1", "q-grover-3"],
  },
  {
    id: "mc-4",
    slug: "more-gates-improve-precision",
    title: "More gates always improve precision",
    description:
      "Students believe adding more gates to a circuit always increases accuracy or fidelity, without accounting for real hardware noise accumulating with circuit depth.",
    concept: "Noise & Error",
    unitId: "u7",
    status: "Classified",
    severity: "Moderate",
    studentCount: 6,
    occurrences: 15,
    firstSeen: "Sep 20, 2024",
    lastSeen: "Oct 18, 2024",
    correction: "Additional gates introduce more noise in real hardware; circuit depth should be minimized.",
    relatedAlgorithms: ["Custom"],
    linkedQuizQuestionIds: ["q-noise-2"],
  },
  {
    id: "mc-5",
    slug: "grover-exponential-speedup",
    title: "Grover provides an exponential speedup",
    description:
      "Students conflate Grover's quadratic speedup with the exponential speedups seen in algorithms like Shor's, expecting search time to drop from N to log(N) instead of \u221aN.",
    concept: "Grover's Algorithm",
    unitId: "u5",
    status: "Classified",
    severity: "Moderate",
    studentCount: 5,
    occurrences: 12,
    firstSeen: "Sep 22, 2024",
    lastSeen: "Oct 12, 2024",
    correction: "Grover's provides a quadratic speedup (\u221aN), not exponential.",
    relatedAlgorithms: ["Grover's"],
    linkedQuizQuestionIds: ["q-grover-2"],
  },
  {
    id: "mc-6",
    slug: "measurement-is-averaging",
    title: "A measurement is an average of amplitudes",
    description:
      "Students describe a single measurement outcome as though it were an average over the amplitudes of a state, rather than one sampled outcome from a probability distribution.",
    concept: "Quantum Foundations",
    unitId: "u1",
    status: "Classified",
    severity: "Low",
    studentCount: 3,
    occurrences: 8,
    firstSeen: "Sep 5, 2024",
    lastSeen: "Oct 2, 2024",
    correction: "A single measurement is one sampled outcome; averaging requires many shots.",
    relatedAlgorithms: ["Custom"],
    linkedQuizQuestionIds: ["q-foundations-1"],
  },
  {
    id: "mc-7",
    slug: "helper-qubit-is-optional",
    title: "The helper qubit is optional",
    description:
      "Students skip the helper-qubit preparation step in phase-kickback algorithms, assuming it is a nice-to-have rather than a required part of the construction.",
    concept: "First Algorithms",
    unitId: "u4",
    status: "Classified",
    severity: "Low",
    studentCount: 2,
    occurrences: 5,
    firstSeen: "Sep 27, 2024",
    lastSeen: "Oct 9, 2024",
    correction: "The helper qubit prepared in |\u2212\u27e9 enables phase kickback \u2014 skipping it breaks the algorithm.",
    relatedAlgorithms: ["Deutsch\u2013Jozsa"],
    linkedQuizQuestionIds: [],
  },
  {
    id: "mc-8",
    slug: "cnot-always-flips-target",
    title: "CNOT always flips the target qubit",
    description:
      "Students believe a CNOT gate unconditionally flips its target qubit, forgetting that the flip only happens when the control qubit is in the |1\u27e9 state.",
    concept: "Gates and Circuits",
    unitId: "u2",
    status: "Classified",
    severity: "Low",
    studentCount: 2,
    occurrences: 4,
    firstSeen: "Sep 10, 2024",
    lastSeen: "Sep 30, 2024",
    correction: "CNOT flips the target only when the control qubit is |1\u27e9.",
    relatedAlgorithms: ["Custom"],
    linkedQuizQuestionIds: [],
  },
]

export const unclassifiedEntries: UnclassifiedEntry[] = [
  {
    id: "uc-1",
    status: "Unclassified",
    concept: "QFT",
    unitId: "u5",
    evidenceDetail: "Predicted a uniform distribution for the QFT of |001\u27e9 \u2014 the actual output distribution was sharply peaked.",
    students: ["Jonah Lee"],
    timestamp: "Oct 19, 2024",
  },
  {
    id: "uc-2",
    status: "Unclassified",
    concept: "Teleportation",
    unitId: "u3",
    evidenceDetail: "Claimed the teleportation protocol requires sending 3 classical bits \u2014 it actually needs only 2.",
    students: ["David Kim"],
    timestamp: "Oct 21, 2024",
  },
  {
    id: "uc-3",
    status: "Under Review",
    concept: "Variational Algorithms",
    unitId: "u6",
    evidenceDetail: "Confused ansatz circuit depth with the numerical precision of the optimization result.",
    students: ["Theo Brooks"],
    timestamp: "Oct 23, 2024",
  },
]

/* --------------------------------- Student instances --------------------------------- */

export const studentMisconceptionInstances: StudentMisconceptionInstance[] = [
  { studentId: "aisha-rahman", studentName: "Aisha Rahman", batch: "A", misconceptionSlug: "measurement-collapses-every-qubit", source: "prediction", evidenceType: "Predict-stage guess", evidenceDetail: "Predicted all qubits reset to |0\u27e9 after measuring qubit 0 of a Bell pair.", timestamp: "2 hrs ago", resolved: false },
  { studentId: "aisha-rahman", studentName: "Aisha Rahman", batch: "A", misconceptionSlug: "entanglement-is-signaling", source: "quiz", evidenceType: "Quiz answer", evidenceDetail: "Selected \u201cthe measured qubit sends a signal to its partner\u201d on the entanglement quiz.", timestamp: "1 day ago", resolved: false },
  { studentId: "aisha-rahman", studentName: "Aisha Rahman", batch: "A", misconceptionSlug: "oracle-marks-answer-automatically", source: "debug", evidenceType: "Debug scenario", evidenceDetail: "Assumed the oracle circuit alone would output the marked state without a diffusion step.", timestamp: "3 days ago", resolved: false },
  { studentId: "jonah-lee", studentName: "Jonah Lee", batch: "A", misconceptionSlug: "oracle-marks-answer-automatically", source: "prediction", evidenceType: "Predict-stage guess", evidenceDetail: "Predicted 100% probability on the marked state after only the oracle, before diffusion.", timestamp: "5 hrs ago", resolved: false },
  { studentId: "jonah-lee", studentName: "Jonah Lee", batch: "A", misconceptionSlug: "grover-exponential-speedup", source: "quiz", evidenceType: "Quiz answer", evidenceDetail: "Answered that Grover's finds the item in log(N) queries.", timestamp: "6 days ago", resolved: true, resolvedDate: "Oct 15, 2024" },
  { studentId: "sofia-martinez", studentName: "Sofia Martinez", batch: "B", misconceptionSlug: "more-gates-improve-precision", source: "manual", evidenceType: "Instructor flag", evidenceDetail: "Added six redundant gates to a noise-resilience challenge, reasoning that more gates would improve fidelity.", timestamp: "2 days ago", resolved: true, resolvedDate: "Oct 20, 2024" },
  { studentId: "david-kim", studentName: "David Kim", batch: "A", misconceptionSlug: "entanglement-is-signaling", source: "prediction", evidenceType: "Predict-stage guess", evidenceDetail: "Predicted a Bell-pair measurement outcome that implied information transfer between qubits.", timestamp: "9 days ago", resolved: false },
  { studentId: "david-kim", studentName: "David Kim", batch: "A", misconceptionSlug: "measurement-collapses-every-qubit", source: "debug", evidenceType: "Debug scenario", evidenceDetail: "Attempted to fix a decoherence bug by resetting every qubit after a single measurement.", timestamp: "11 days ago", resolved: false },
  { studentId: "priya-nair", studentName: "Priya Nair", batch: "B", misconceptionSlug: "grover-exponential-speedup", source: "quiz", evidenceType: "Quiz answer", evidenceDetail: "Selected the exponential-speedup option on the Grover's Algorithm quiz.", timestamp: "4 days ago", resolved: true, resolvedDate: "Oct 19, 2024" },
  { studentId: "marcus-chen", studentName: "Marcus Chen", batch: "A", misconceptionSlug: "oracle-marks-answer-automatically", source: "prediction", evidenceType: "Predict-stage guess", evidenceDetail: "Predicted the oracle alone would make the marked state observable without amplification.", timestamp: "1 hr ago", resolved: false },
  { studentId: "marcus-chen", studentName: "Marcus Chen", batch: "A", misconceptionSlug: "measurement-is-averaging", source: "quiz", evidenceType: "Quiz answer", evidenceDetail: "Described a single-shot measurement as averaging the amplitudes of the state.", timestamp: "5 days ago", resolved: false },
  { studentId: "elena-rossi", studentName: "Elena Rossi", batch: "B", misconceptionSlug: "more-gates-improve-precision", source: "debug", evidenceType: "Debug scenario", evidenceDetail: "Added extra gates to a noisy circuit while trying to improve fidelity, worsening the result.", timestamp: "3 days ago", resolved: true, resolvedDate: "Oct 22, 2024" },
  { studentId: "theo-brooks", studentName: "Theo Brooks", batch: "A", misconceptionSlug: "measurement-collapses-every-qubit", source: "quiz", evidenceType: "Quiz answer", evidenceDetail: "Answered that measuring one qubit resets the entire register to classical bits.", timestamp: "4 hrs ago", resolved: false },
  { studentId: "theo-brooks", studentName: "Theo Brooks", batch: "A", misconceptionSlug: "entanglement-is-signaling", source: "prediction", evidenceType: "Predict-stage guess", evidenceDetail: "Predicted the second qubit's state would change before it was measured, due to signaling.", timestamp: "2 days ago", resolved: false },
  { studentId: "aisha-rahman", studentName: "Aisha Rahman", batch: "A", misconceptionSlug: "measurement-is-averaging", source: "manual", evidenceType: "Instructor flag", evidenceDetail: "Described the outcome of a single shot as \u201cthe average of the two amplitudes.\u201d", timestamp: "6 days ago", resolved: false },
  { studentId: "jonah-lee", studentName: "Jonah Lee", batch: "A", misconceptionSlug: "helper-qubit-is-optional", source: "debug", evidenceType: "Debug scenario", evidenceDetail: "Removed the helper qubit preparation step and could not explain the resulting failure.", timestamp: "8 days ago", resolved: true, resolvedDate: "Oct 14, 2024" },
  { studentId: "sofia-martinez", studentName: "Sofia Martinez", batch: "B", misconceptionSlug: "cnot-always-flips-target", source: "quiz", evidenceType: "Quiz answer", evidenceDetail: "Said CNOT flips the target regardless of the control qubit's state.", timestamp: "10 days ago", resolved: true, resolvedDate: "Oct 11, 2024" },
  { studentId: "priya-nair", studentName: "Priya Nair", batch: "B", misconceptionSlug: "oracle-marks-answer-automatically", source: "manual", evidenceType: "Instructor flag", evidenceDetail: "Explained the oracle step during office hours as directly revealing the answer.", timestamp: "7 days ago", resolved: false },
  { studentId: "marcus-chen", studentName: "Marcus Chen", batch: "A", misconceptionSlug: "more-gates-improve-precision", source: "debug", evidenceType: "Debug scenario", evidenceDetail: "Added three extra gates to a challenge submission expecting a fidelity boost.", timestamp: "9 days ago", resolved: false },
  { studentId: "david-kim", studentName: "David Kim", batch: "A", misconceptionSlug: "helper-qubit-is-optional", source: "quiz", evidenceType: "Quiz answer", evidenceDetail: "Answered that the helper qubit preparation step could be skipped without consequence.", timestamp: "12 days ago", resolved: false },
  { studentId: "elena-rossi", studentName: "Elena Rossi", batch: "B", misconceptionSlug: "grover-exponential-speedup", source: "prediction", evidenceType: "Predict-stage guess", evidenceDetail: "Predicted Grover's would find the marked item in a single query for N=16.", timestamp: "5 days ago", resolved: true, resolvedDate: "Oct 17, 2024" },
  { studentId: "theo-brooks", studentName: "Theo Brooks", batch: "A", misconceptionSlug: "cnot-always-flips-target", source: "debug", evidenceType: "Debug scenario", evidenceDetail: "Built a circuit assuming CNOT would flip the target with the control in |0\u27e9.", timestamp: "6 days ago", resolved: false },
  { studentId: "jonah-lee", studentName: "Jonah Lee", batch: "A", misconceptionSlug: "measurement-is-averaging", source: "manual", evidenceType: "Instructor flag", evidenceDetail: "Described the histogram of many shots as a single averaged measurement.", timestamp: "13 days ago", resolved: true, resolvedDate: "Oct 10, 2024" },
  { studentId: "priya-nair", studentName: "Priya Nair", batch: "B", misconceptionSlug: "entanglement-is-signaling", source: "quiz", evidenceType: "Quiz answer", evidenceDetail: "Chose the option implying faster-than-light signaling on the entanglement quiz.", timestamp: "14 days ago", resolved: true, resolvedDate: "Oct 8, 2024" },
]

/* --------------------------------- Prediction evidence --------------------------------- */

export const predictionEvidence: PredictionEvidence[] = [
  {
    studentName: "Aisha Rahman",
    algorithmSlug: "Custom (Bell State)",
    concept: "Entanglement",
    predictedDistribution: { "00": 50, "01": 50, "10": 0, "11": 0 },
    actualDistribution: { "00": 50, "01": 0, "10": 0, "11": 50 },
    deltaScore: 0.71,
    misconceptionTriggered: "entanglement-is-signaling",
    timestamp: "2 hrs ago",
  },
  {
    studentName: "Jonah Lee",
    algorithmSlug: "Grover's",
    concept: "Grover's Algorithm",
    predictedDistribution: { "00": 0, "01": 0, "10": 0, "11": 100 },
    actualDistribution: { "00": 6, "01": 6, "10": 6, "11": 82 },
    deltaScore: 0.24,
    misconceptionTriggered: "oracle-marks-answer-automatically",
    timestamp: "5 hrs ago",
  },
  {
    studentName: "Sofia Martinez",
    algorithmSlug: "Custom (Noise-Resilient Bell)",
    concept: "Noise & Error",
    predictedDistribution: { "00": 60, "01": 0, "10": 0, "11": 40 },
    actualDistribution: { "00": 48, "01": 4, "10": 3, "11": 45 },
    deltaScore: 0.15,
    misconceptionTriggered: "more-gates-improve-precision",
    timestamp: "2 days ago",
  },
  {
    studentName: "David Kim",
    algorithmSlug: "Custom (Teleportation)",
    concept: "Teleportation",
    predictedDistribution: { "000": 12.5, "001": 12.5, "010": 12.5, "011": 12.5, "100": 12.5, "101": 12.5, "110": 12.5, "111": 12.5 },
    actualDistribution: { "000": 14, "001": 12, "010": 13, "011": 12, "100": 12, "101": 13, "110": 12, "111": 12 },
    deltaScore: 0.42,
    misconceptionTriggered: null,
    timestamp: "9 days ago",
  },
  {
    studentName: "Priya Nair",
    algorithmSlug: "Grover's",
    concept: "Grover's Algorithm",
    predictedDistribution: { "00": 25, "01": 25, "10": 25, "11": 25 },
    actualDistribution: { "00": 6, "01": 6, "10": 6, "11": 82 },
    deltaScore: 0.58,
    misconceptionTriggered: "grover-exponential-speedup",
    timestamp: "4 days ago",
  },
  {
    studentName: "Marcus Chen",
    algorithmSlug: "Grover's",
    concept: "Grover's Algorithm",
    predictedDistribution: { "00": 0, "01": 0, "10": 0, "11": 100 },
    actualDistribution: { "00": 6, "01": 6, "10": 6, "11": 82 },
    deltaScore: 0.19,
    misconceptionTriggered: "oracle-marks-answer-automatically",
    timestamp: "1 hr ago",
  },
  {
    studentName: "Elena Rossi",
    algorithmSlug: "Custom (Noise-Resilient Bell)",
    concept: "Noise & Error",
    predictedDistribution: { "00": 65, "01": 0, "10": 0, "11": 35 },
    actualDistribution: { "00": 48, "01": 4, "10": 3, "11": 45 },
    deltaScore: 0.28,
    misconceptionTriggered: "more-gates-improve-precision",
    timestamp: "3 days ago",
  },
  {
    studentName: "Theo Brooks",
    algorithmSlug: "Custom (Bell State)",
    concept: "Entanglement",
    predictedDistribution: { "00": 25, "01": 25, "10": 25, "11": 25 },
    actualDistribution: { "00": 50, "01": 0, "10": 0, "11": 50 },
    deltaScore: 0.5,
    misconceptionTriggered: "entanglement-is-signaling",
    timestamp: "2 days ago",
  },
  {
    studentName: "Jonah Lee",
    algorithmSlug: "QFT",
    concept: "QFT",
    predictedDistribution: { "000": 12.5, "001": 12.5, "010": 12.5, "011": 12.5, "100": 12.5, "101": 12.5, "110": 12.5, "111": 12.5 },
    actualDistribution: { "000": 4, "001": 62, "010": 4, "011": 4, "100": 4, "101": 4, "110": 14, "111": 4 },
    deltaScore: 0.61,
    misconceptionTriggered: null,
    timestamp: "1 day ago",
  },
]

/* --------------------------------- Concept health --------------------------------- */

export const conceptHealthScores: ConceptHealthScore[] = [
  { concept: "Superposition", unitId: "u1", totalStudents: 8, avgMastery: 61, misconceptionCount: 2, topMisconception: "Measurement collapses every qubit", trend: "stable", riskLevel: "amber" },
  { concept: "Entanglement", unitId: "u3", totalStudents: 8, avgMastery: 48, misconceptionCount: 1, topMisconception: "Entanglement means faster-than-light signaling", trend: "declining", riskLevel: "red" },
  { concept: "Gates and Circuits", unitId: "u2", totalStudents: 8, avgMastery: 72, misconceptionCount: 1, topMisconception: "CNOT always flips the target qubit", trend: "improving", riskLevel: "green" },
  { concept: "Grover's Algorithm", unitId: "u5", totalStudents: 8, avgMastery: 55, misconceptionCount: 2, topMisconception: "Oracle marks the answer automatically", trend: "stable", riskLevel: "amber" },
  { concept: "Noise & Error", unitId: "u7", totalStudents: 8, avgMastery: 52, misconceptionCount: 1, topMisconception: "More gates always improve precision", trend: "declining", riskLevel: "red" },
  { concept: "First Algorithms", unitId: "u4", totalStudents: 8, avgMastery: 64, misconceptionCount: 1, topMisconception: "The helper qubit is optional", trend: "improving", riskLevel: "green" },
  { concept: "QFT", unitId: "u5", totalStudents: 8, avgMastery: 41, misconceptionCount: 1, topMisconception: "Unclassified prediction mismatch", trend: "declining", riskLevel: "red" },
]

/* --------------------------------- Helpers --------------------------------- */

export function severityBadgeClass(severity: MisconceptionSeverity): { text: string; bg: string } {
  switch (severity) {
    case "Critical":
      return { text: "text-[#FB7185]", bg: "bg-[#FB7185]/12" }
    case "Moderate":
      return { text: "text-[#F5B942]", bg: "bg-[#F5B942]/12" }
    case "Low":
    default:
      return { text: "text-white/60", bg: "bg-white/10" }
  }
}

export function statusBadgeClass(status: MisconceptionStatus): { text: string; bg: string } {
  switch (status) {
    case "Classified":
      return { text: "text-[#4ADE80]", bg: "bg-[#4ADE80]/12" }
    case "Unclassified":
      return { text: "text-[#F5B942]", bg: "bg-[#F5B942]/12" }
    case "Under Review":
    default:
      return { text: "text-[#A78BFA]", bg: "bg-[#A78BFA]/12" }
  }
}

export function trendIcon(trend: ConceptHealthScore["trend"]): string {
  if (trend === "improving") return "\u2191"
  if (trend === "declining") return "\u2193"
  return "\u2192"
}

export function riskColorClass(riskLevel: ConceptHealthScore["riskLevel"]): string {
  if (riskLevel === "green") return "#4ADE80"
  if (riskLevel === "amber") return "#F5B942"
  return "#FB7185"
}

export function trendColor(trend: ConceptHealthScore["trend"]): string {
  if (trend === "improving") return "#4ADE80"
  if (trend === "declining") return "#FB7185"
  return "#F5B942"
}

export function sourceIconLabel(source: MisconceptionSource): string {
  switch (source) {
    case "prediction":
      return "Prediction"
    case "quiz":
      return "Quiz"
    case "debug":
      return "Debug"
    case "manual":
    default:
      return "Manual"
  }
}
