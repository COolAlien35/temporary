/* ---------------------------------- Types ---------------------------------- */

export type FlagReason =
  | "Answer Sharing / Academic Dishonesty"
  | "Misinformation / Inaccurate Physics"
  | "Harassment / Uncivil"
  | "Spam / Off-Topic"
  | "AI-Generated / Low Effort"

export type FlagSeverity = "High" | "Medium" | "Low"
export type FlagStatus = "Pending" | "Resolved" | "Dismissed" | "Escalated"
export type ThreadCategory = "Strategy" | "Question" | "Bug" | "Circuit Debug" | "Hardware Studio" | "General"

export type PostAuthor = {
  id: string
  name: string
  initials: string
  role: "student" | "instructor" | "ta"
  badge?: string
  avatarColor?: string
  isFlaggedUser?: boolean
  previousFlagsCount: number
}

export type DiscussionComment = {
  id: string
  author: PostAuthor
  content: string
  timestamp: string
  upvotes: number
  isVerifiedSolution: boolean
  isInstructorPost: boolean
  isFlagged: boolean
  flagReason?: FlagReason
  flagReportedBy?: string
  flagNote?: string
  replies?: DiscussionComment[]
}

export type ModeratedThread = {
  id: string
  title: string
  author: PostAuthor
  category: ThreadCategory
  tags: string[]
  timestamp: string
  content: string
  upvotes: number
  repliesCount: number
  isLocked: boolean
  isPinned: boolean
  hasVerifiedSolution: boolean
  verifiedSolutionCommentId?: string
  flagCount: number
  highestSeverity?: FlagSeverity
  flagStatus: FlagStatus
  flagReason?: FlagReason
  reportedBy?: string
  flagReportedAt?: string
  moderatorNotes?: string
  comments: DiscussionComment[]
}

export type ModerationAction =
  | "dismissed_flag"
  | "verified_answer"
  | "unverified_answer"
  | "locked_thread"
  | "unlocked_thread"
  | "deleted_comment"
  | "warned_user"
  | "added_instructor_reply"

export type ModerationLogEntry = {
  id: string
  threadId: string
  threadTitle: string
  action: ModerationAction
  moderator: string
  targetUser: string
  reason: string
  timestamp: string
}

/* --------------------------------- Clock --------------------------------- */

/** Fixed dataset "now" so relative times are deterministic across server and client renders. */
export const NOW_MS = Date.parse("2026-09-25T15:00:00.000Z")
const minsAgo = (m: number) => new Date(NOW_MS - m * 60_000).toISOString()
const hoursAgo = (h: number) => minsAgo(h * 60)
const daysAgo = (d: number) => minsAgo(d * 1440)

export function relativeTime(iso: string, now = NOW_MS) {
  const diff = Math.max(0, now - Date.parse(iso))
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function formatFullDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  })
}

/* --------------------------------- Authors --------------------------------- */

function student(id: string, name: string, batch: string, previousFlagsCount = 0, isFlaggedUser = false): PostAuthor {
  return {
    id,
    name,
    initials: name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    role: "student",
    badge: batch,
    previousFlagsCount,
    isFlaggedUser,
  }
}

export const authors = {
  lena: student("stu-lena", "Lena Park", "Batch A"),
  theo: student("stu-theo", "Theo Brooks", "Batch B", 2, true),
  ari: student("stu-ari", "Ari Vega", "Batch A"),
  aisha: student("stu-aisha", "Aisha Rahman", "Batch A"),
  priya: student("stu-priya", "Priya Nair", "Batch B"),
  elena: student("stu-elena", "Elena Rostova", "Batch A"),
  kaito: student("stu-kaito", "Kaito Tanaka", "Batch C", 1, true),
  marcus: student("stu-marcus", "Marcus Vance", "Batch B"),
  sofia: student("stu-sofia", "Sofia Reyes", "Batch C"),
  rina: {
    id: "fac-rina",
    name: "Dr. Rina Kapoor",
    initials: "RK",
    role: "instructor",
    badge: "Lead Faculty",
    previousFlagsCount: 0,
  } as PostAuthor,
  alan: {
    id: "fac-alan",
    name: "Prof. Alan Vance",
    initials: "AV",
    role: "instructor",
    badge: "Verified Faculty",
    previousFlagsCount: 0,
  } as PostAuthor,
  jordan: {
    id: "ta-jordan",
    name: "Jordan Lee",
    initials: "JL",
    role: "ta",
    badge: "Teaching Assistant",
    previousFlagsCount: 0,
  } as PostAuthor,
} satisfies Record<string, PostAuthor>

export const CURRENT_MODERATOR = authors.rina

/* ------------------------------ Helpers (data) ------------------------------ */

let seq = 0
function comment(
  author: PostAuthor,
  content: string,
  timestamp: string,
  upvotes: number,
  extra: Partial<DiscussionComment> = {},
): DiscussionComment {
  seq += 1
  return {
    id: `c-${seq}`,
    author,
    content,
    timestamp,
    upvotes,
    isVerifiedSolution: false,
    isInstructorPost: author.role !== "student",
    isFlagged: false,
    ...extra,
  }
}

/* --------------------------------- Threads --------------------------------- */

const fidelityAnswer = comment(
  authors.rina,
  "Great question. Two things moved the needle for the top submissions:\n\n- **Dynamical decoupling:** insert `X–X` echo pairs on idle qubits during long CNOT chains. It refocuses low-frequency dephasing and typically buys you 2–4% fidelity on the noisy backend.\n- **Randomized benchmarking first:** run a short RB sweep to find which qubit pair has the lowest two-qubit error, then map your logical qubits onto that pair.\n\nCombine both and keep circuit depth under ~40 and you should comfortably clear 95%.",
  hoursAgo(20),
  31,
  { isVerifiedSolution: true },
)

const ghzAnswer = comment(
  authors.alan,
  "The optimal pattern is a **log-depth fan-out tree** rather than a linear CNOT chain. For $$n$$ qubits you still need $$n-1$$ CNOTs, but depth drops from $$n-1$$ to $$\\lceil \\log_2 n \\rceil$$.\n\nProof sketch: after each layer the number of qubits in the entangled register doubles, since every entangled qubit can act as a control in parallel. I've attached the circuit diagram in the Module 4 resources.",
  daysAgo(2),
  44,
  { isVerifiedSolution: true },
)

export const threads: ModeratedThread[] = [
  {
    id: "th-grover-dump",
    title: "Full solution code for Grover Search Challenge 3",
    author: authors.theo,
    category: "Circuit Debug",
    tags: ["Grover", "Challenge 3", "Code Dump"],
    timestamp: minsAgo(52),
    content:
      "Here is the exact Python Qiskit script that passes all 5 testcases with 100% score:\n\n```\nfrom qiskit import QuantumCircuit\nqc = QuantumCircuit(3)\nqc.h([0, 1, 2])\n# oracle for |101>\nqc.x(1); qc.ccz(0, 1, 2); qc.x(1)\n# diffuser\nqc.h([0, 1, 2]); qc.x([0, 1, 2])\nqc.ccz(0, 1, 2)\nqc.x([0, 1, 2]); qc.h([0, 1, 2])\n```\n\nJust copy it in, no need to understand the oracle.",
    upvotes: 3,
    repliesCount: 2,
    isLocked: false,
    isPinned: false,
    hasVerifiedSolution: false,
    flagCount: 2,
    highestSeverity: "High",
    flagStatus: "Pending",
    flagReason: "Answer Sharing / Academic Dishonesty",
    reportedBy: "Priya Nair",
    flagReportedAt: minsAgo(34),
    moderatorNotes: "This user pasted the entire working oracle matrix for the active graded contest challenge.",
    comments: [
      comment(authors.marcus, "Isn't Challenge 3 still open until Friday? This feels like it breaks the contest rules.", minsAgo(45), 6),
      comment(authors.priya, "Reported. Please take this down — some of us spent hours on the oracle.", minsAgo(34), 9, {
        isFlagged: false,
      }),
    ],
  },
  {
    id: "th-phase-kickback",
    title: "Phase kickback doesn't actually require superposition in target qubit?",
    author: authors.elena,
    category: "Question",
    tags: ["Phase Kickback", "Misconception", "Deutsch-Jozsa"],
    timestamp: hoursAgo(3),
    content:
      "I tried putting target in `|0>` and the phase still inverted in my custom matrix simulator, so I think the textbook is wrong and you don't need the `|->` state for Deutsch-Jozsa. Everyone can skip the extra H gate on the ancilla.",
    upvotes: 5,
    repliesCount: 3,
    isLocked: false,
    isPinned: false,
    hasVerifiedSolution: false,
    flagCount: 1,
    highestSeverity: "Medium",
    flagStatus: "Pending",
    flagReason: "Misinformation / Inaccurate Physics",
    reportedBy: "Aisha Rahman",
    flagReportedAt: hoursAgo(2),
    moderatorNotes: "Spreading fundamental misconception about why target qubit needs |-> state",
    comments: [
      comment(
        authors.aisha,
        "I think your simulator has a bug — with the target in `|0>` the oracle only flips the target, it never writes a phase back onto the control.",
        hoursAgo(2),
        8,
        { isFlagged: false },
      ),
      comment(authors.ari, "Could you share the matrix you used? Might be an ordering issue.", hoursAgo(1), 3, {
        replies: [comment(authors.elena, "Sure, will post it tonight.", minsAgo(50), 1)],
      }),
    ],
  },
  {
    id: "th-fidelity",
    title: "How did you keep fidelity above 95% in noisy simulator?",
    author: authors.lena,
    category: "Strategy",
    tags: ["Strategy", "Noise", "Error Mitigation"],
    timestamp: daysAgo(1),
    content:
      "My Bell-pair circuits hover around 91% on the noisy backend. Curious what tricks people used to push past 95% — transpiler settings, qubit mapping, anything.",
    upvotes: 24,
    repliesCount: 12,
    isLocked: false,
    isPinned: true,
    hasVerifiedSolution: true,
    verifiedSolutionCommentId: fidelityAnswer.id,
    flagCount: 0,
    flagStatus: "Resolved",
    comments: [
      fidelityAnswer,
      comment(authors.ari, "Mapping to the best RB pair alone got me from 90% to 94%.", hoursAgo(18), 11),
      comment(authors.priya, "Optimization level 3 in the transpiler also helped a bit.", hoursAgo(16), 4),
    ],
  },
  {
    id: "th-ghz",
    title: "Best gate-count heuristics for GHZ circuits",
    author: authors.ari,
    category: "Strategy",
    tags: ["Optimization", "GHZ", "Gate Count"],
    timestamp: daysAgo(3),
    content: "For the 8-qubit GHZ challenge I'm at depth 7. Is there a known lower bound, or tricks for reducing depth without extra ancillas?",
    upvotes: 38,
    repliesCount: 19,
    isLocked: false,
    isPinned: true,
    hasVerifiedSolution: true,
    verifiedSolutionCommentId: ghzAnswer.id,
    flagCount: 0,
    flagStatus: "Resolved",
    comments: [
      ghzAnswer,
      comment(authors.lena, "The fan-out tree got me to depth 3 for 8 qubits. Wild.", daysAgo(2), 15),
    ],
  },
  {
    id: "th-bell",
    title: "Simulator result differs from expected Bell state |Φ+>",
    author: authors.theo,
    category: "Bug",
    tags: ["Bell State", "Simulator", "Qubit Ordering"],
    timestamp: daysAgo(2),
    content: "I get `|01>` and `|10>` counts instead of `|00>` and `|11>`. Is the simulator broken?",
    upvotes: 11,
    repliesCount: 7,
    isLocked: false,
    isPinned: false,
    hasVerifiedSolution: false,
    flagCount: 0,
    flagStatus: "Resolved",
    comments: [
      comment(
        authors.jordan,
        "This is the little-endian vs big-endian qubit ordering convention. The simulator lists qubit 0 as the rightmost bit — double-check your X gate placement.",
        daysAgo(2),
        14,
      ),
      comment(authors.theo, "That was it, thank you!", daysAgo(2), 2),
    ],
  },
  {
    id: "th-pulse",
    title: "Can someone review my Hardware Studio pulse schedule?",
    author: authors.marcus,
    category: "Hardware Studio",
    tags: ["Pulse Schedule", "Transmon", "CR Gate"],
    timestamp: daysAgo(1),
    content:
      "My cross-resonance gate calibration drifts after ~20 shots. Attaching my pulse schedule — does the echo sequence look right?",
    upvotes: 16,
    repliesCount: 5,
    isLocked: false,
    isPinned: false,
    hasVerifiedSolution: false,
    flagCount: 0,
    flagStatus: "Resolved",
    comments: [
      comment(authors.lena, "Your echo pulses look asymmetric — the second π pulse is 8ns shorter.", hoursAgo(22), 7),
    ],
  },
  {
    id: "th-midterm",
    title: "Is anyone selling previous year Quantum Midterm solutions?",
    author: authors.kaito,
    category: "General",
    tags: ["Midterm", "Solutions"],
    timestamp: hoursAgo(6),
    content: "Looking to buy last year's graded midterm solutions. DM me, will pay.",
    upvotes: 0,
    repliesCount: 3,
    isLocked: true,
    isPinned: false,
    hasVerifiedSolution: false,
    flagCount: 3,
    highestSeverity: "High",
    flagStatus: "Escalated",
    flagReason: "Answer Sharing / Academic Dishonesty",
    reportedBy: "3 students",
    flagReportedAt: hoursAgo(5),
    moderatorNotes: "Escalated to Academic Integrity Office. Thread locked pending review.",
    comments: [
      comment(authors.aisha, "This is not okay. Reporting.", hoursAgo(5), 12),
      comment(authors.jordan, "Thread locked. This has been escalated to the academic integrity office.", hoursAgo(4), 9),
    ],
  },
  {
    id: "th-hadamard",
    title: "Why does my Hadamard transform output negative amplitudes?",
    author: authors.sofia,
    category: "Question",
    tags: ["Hadamard", "Foundations"],
    timestamp: hoursAgo(4),
    content: "Applying H to `|1>` gives me $$\\frac{1}{\\sqrt{2}}(|0\\rangle - |1\\rangle)$$. Why is there a minus sign? Is my matrix wrong?",
    upvotes: 9,
    repliesCount: 4,
    isLocked: false,
    isPinned: false,
    hasVerifiedSolution: false,
    flagCount: 1,
    highestSeverity: "Low",
    flagStatus: "Pending",
    flagReason: "AI-Generated / Low Effort",
    reportedBy: "Lena Park",
    flagReportedAt: hoursAgo(1),
    moderatorNotes: "The top reply reads like an unedited chatbot answer — might confuse newcomers.",
    comments: [
      comment(
        authors.priya,
        "As an AI language model, the Hadamard gate is a fundamental quantum gate that creates superposition. It is important to note that negative amplitudes are a key concept in quantum computing.",
        hoursAgo(3),
        1,
        {
          isFlagged: true,
          flagReason: "AI-Generated / Low Effort",
          flagReportedBy: "Lena Park",
          flagNote: "Doesn't actually answer the question.",
        },
      ),
      comment(authors.marcus, "Your matrix is right! The minus is the relative phase — it's what makes interference work.", hoursAgo(2), 6),
    ],
  },
]

/* ------------------------------- Moderation log ------------------------------- */

export const moderationLog: ModerationLogEntry[] = [
  {
    id: "log-1",
    threadId: "th-midterm",
    threadTitle: "Is anyone selling previous year Quantum Midterm solutions?",
    action: "locked_thread",
    moderator: "Jordan Lee",
    targetUser: "Kaito Tanaka",
    reason: "Solicitation of graded exam solutions. Escalated to integrity office.",
    timestamp: hoursAgo(4),
  },
  {
    id: "log-2",
    threadId: "th-midterm",
    threadTitle: "Is anyone selling previous year Quantum Midterm solutions?",
    action: "warned_user",
    moderator: "Dr. Rina Kapoor",
    targetUser: "Kaito Tanaka",
    reason: "Formal academic integrity warning issued.",
    timestamp: hoursAgo(4),
  },
  {
    id: "log-3",
    threadId: "th-fidelity",
    threadTitle: "How did you keep fidelity above 95% in noisy simulator?",
    action: "verified_answer",
    moderator: "Dr. Rina Kapoor",
    targetUser: "Lena Park",
    reason: "Pinned faculty explanation on dynamical decoupling and RB.",
    timestamp: hoursAgo(20),
  },
  {
    id: "log-4",
    threadId: "th-fidelity",
    threadTitle: "How did you keep fidelity above 95% in noisy simulator?",
    action: "added_instructor_reply",
    moderator: "Dr. Rina Kapoor",
    targetUser: "Lena Park",
    reason: "Official instructor response posted.",
    timestamp: hoursAgo(20),
  },
  {
    id: "log-5",
    threadId: "th-bell",
    threadTitle: "Simulator result differs from expected Bell state |Φ+>",
    action: "dismissed_flag",
    moderator: "Jordan Lee",
    targetUser: "Theo Brooks",
    reason: "Flagged as spam in error — legitimate bug report.",
    timestamp: daysAgo(2),
  },
  {
    id: "log-6",
    threadId: "th-ghz",
    threadTitle: "Best gate-count heuristics for GHZ circuits",
    action: "verified_answer",
    moderator: "Prof. Alan Vance",
    targetUser: "Ari Vega",
    reason: "Pinned log-depth fan-out proof.",
    timestamp: daysAgo(2),
  },
  {
    id: "log-7",
    threadId: "th-pulse",
    threadTitle: "Can someone review my Hardware Studio pulse schedule?",
    action: "deleted_comment",
    moderator: "Jordan Lee",
    targetUser: "Anonymous",
    reason: "Off-topic promotional link removed.",
    timestamp: daysAgo(1),
  },
  {
    id: "log-8",
    threadId: "th-ghz",
    threadTitle: "Best gate-count heuristics for GHZ circuits",
    action: "unverified_answer",
    moderator: "Prof. Alan Vance",
    targetUser: "Ari Vega",
    reason: "Replaced earlier heuristic with the proven optimal construction.",
    timestamp: daysAgo(3),
  },
]

/* ------------------------------- Style helpers ------------------------------- */

export const severityColor: Record<FlagSeverity, string> = {
  High: "#FB7185",
  Medium: "#F5B942",
  Low: "#00D4FF",
}

export const statusBadgeClass: Record<FlagStatus, string> = {
  Pending: "bg-[#F5B942]/15 text-[#F5B942]",
  Resolved: "bg-[#4ADE80]/15 text-[#4ADE80]",
  Dismissed: "bg-white/10 text-white/55",
  Escalated: "bg-[#FB7185]/15 text-[#FB7185]",
}

export const shortFlagReason: Record<FlagReason, string> = {
  "Answer Sharing / Academic Dishonesty": "Academic Dishonesty",
  "Misinformation / Inaccurate Physics": "Misinformation",
  "Harassment / Uncivil": "Harassment",
  "Spam / Off-Topic": "Spam",
  "AI-Generated / Low Effort": "Low Effort",
}

export const actionMeta: Record<ModerationAction, { label: string; color: string }> = {
  dismissed_flag: { label: "Dismissed flag", color: "#9CA3AF" },
  verified_answer: { label: "Verified answer", color: "#4ADE80" },
  unverified_answer: { label: "Unverified answer", color: "#F5B942" },
  locked_thread: { label: "Locked thread", color: "#A78BFA" },
  unlocked_thread: { label: "Unlocked thread", color: "#00D4FF" },
  deleted_comment: { label: "Deleted content", color: "#FB7185" },
  warned_user: { label: "Warned student", color: "#F5B942" },
  added_instructor_reply: { label: "Instructor reply", color: "#00D4FF" },
}

export const CATEGORIES: ThreadCategory[] = ["Circuit Debug", "Strategy", "Question", "Bug", "Hardware Studio", "General"]
export const FLAG_REASONS: FlagReason[] = [
  "Answer Sharing / Academic Dishonesty",
  "Misinformation / Inaccurate Physics",
  "Harassment / Uncivil",
  "Spam / Off-Topic",
  "AI-Generated / Low Effort",
]

/** Platform-wide baseline (beyond this module's sample) used to anchor dashboard metrics. */
export const communityBaseline = {
  totalPosts: 612,
  verifiedAnswersElsewhere: 12,
  resolvedThisWeekBaseline: 26,
}

export function findComment(comments: DiscussionComment[], id: string): DiscussionComment | undefined {
  for (const c of comments) {
    if (c.id === id) return c
    const nested = c.replies && findComment(c.replies, id)
    if (nested) return nested
  }
  return undefined
}

export function mapComments(
  comments: DiscussionComment[],
  fn: (c: DiscussionComment) => DiscussionComment | null,
): DiscussionComment[] {
  return comments.flatMap((c) => {
    const next = fn(c)
    if (!next) return []
    return [{ ...next, replies: next.replies ? mapComments(next.replies, fn) : undefined }]
  })
}
