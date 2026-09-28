import { create } from "zustand"
import { persist } from "zustand/middleware"
import { sampleThreads } from "@/lib/community/fixtures"
import type { CommunityReply, CommunityThread, ContestEntry, NewReply, NewThread } from "@/lib/community/types"

interface CommunityState {
  threads: CommunityThread[]
  replies: CommunityReply[]
  votes: Record<string, string[]>
  entries: ContestEntry[]
  createThread: (input: NewThread) => string
  addReply: (input: NewReply) => string
  toggleVote: (threadId: string, voterId: string) => void
  enterContest: (contestId: string, learnerId: string) => void
}

export const useCommunity = create<CommunityState>()(
  persist((set) => ({
    threads: sampleThreads,
    replies: [],
    votes: {},
    entries: [],
    createThread: (input) => {
      const id = crypto.randomUUID()
      set((state) => ({ threads: [{ ...input, id, createdAt: Date.now(), sample: false, baseVotes: 0, baseReplies: 0 }, ...state.threads] }))
      return id
    },
    addReply: (input) => {
      const id = crypto.randomUUID()
      set((state) => ({ replies: [...state.replies, { ...input, id, createdAt: Date.now() }] }))
      return id
    },
    toggleVote: (threadId, voterId) => set((state) => {
      const voters = state.votes[threadId] ?? []
      return { votes: { ...state.votes, [threadId]: voters.includes(voterId) ? voters.filter((id) => id !== voterId) : [...voters, voterId] } }
    }),
    enterContest: (contestId, learnerId) => set((state) => state.entries.some((entry) => entry.contestId === contestId && entry.learnerId === learnerId) ? state : { entries: [...state.entries, { contestId, learnerId, joinedAt: Date.now() }] }),
  }), { name: "quantumloop-demo-community", partialize: (state) => ({ threads: state.threads, replies: state.replies, votes: state.votes, entries: state.entries }) }),
)
