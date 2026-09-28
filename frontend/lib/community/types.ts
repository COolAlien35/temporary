export interface CommunityThread {
  id: string
  title: string
  body: string
  authorId: string | null
  authorName: string
  contestId: string | null
  tags: string[]
  createdAt: number
  sample: boolean
  baseVotes: number
  baseReplies: number
}

export interface CommunityReply {
  id: string
  threadId: string
  authorId: string | null
  authorName: string
  body: string
  createdAt: number
}

export interface ContestEntry {
  contestId: string
  learnerId: string
  joinedAt: number
}

export type NewThread = Pick<CommunityThread, "title" | "body" | "contestId" | "tags"> & { authorId: string | null; authorName: string }
export type NewReply = Pick<CommunityReply, "threadId" | "body" | "authorId" | "authorName">
