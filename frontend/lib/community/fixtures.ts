import type { CommunityThread } from "./types"

export const sampleThreads: CommunityThread[] = [
  { id: "t1", title: "How did you keep the Bell circuit short?", body: "I used H on q0 followed by CNOT to q1. What checks helped you confirm the measurement distribution?", authorId: null, authorName: "Lena Park", contestId: "entanglement-speed", tags: ["Strategy", "Question"], createdAt: Date.UTC(2026, 8, 12, 10), sample: true, baseVotes: 24, baseReplies: 12 },
  { id: "t2", title: "My simulator result differs from the expected state", body: "I expected 00 and 11, but I am seeing 01 and 10 too. Which gate should I inspect first?", authorId: null, authorName: "Theo Brooks", contestId: null, tags: ["Bug"], createdAt: Date.UTC(2026, 8, 10, 14), sample: true, baseVotes: 11, baseReplies: 7 },
  { id: "t3", title: "Best gate-count heuristics for GHZ circuits", body: "What is a good way to count the entangling operations in a four-qubit GHZ circuit?", authorId: null, authorName: "Ari Vega", contestId: "ghz-frontier", tags: ["Strategy"], createdAt: Date.UTC(2026, 8, 8, 9), sample: true, baseVotes: 38, baseReplies: 19 },
]
