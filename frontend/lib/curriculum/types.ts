export type UnitLevel = "Beginner" | "Intermediate" | "Advanced"
export type LessonType = "Concept" | "Interactive" | "Studio task" | "Lab"
export type ContentBlock = { type: "heading" | "paragraph" | "math" | "callout" | "code"; text: string; tone?: "key" | "mistake" | "try" }
export type Checkpoint = { id: string; prompt: string; options: string[]; answer: number; explanation: string }
export type Lesson = { id: string; title: string; type: LessonType; minutes: number; xp: number; sections: ContentBlock[]; checkpoints: Checkpoint[]; takeaways: string[]; links: Array<{ label: string; href: string }> }
export type Unit = { id: string; title: string; tagline: string; level: UnitLevel; minutes: number; prerequisites: string[]; lessons: Lesson[]; xpTotal: number; badge: string; tools: string[] }
export type Question = { id: string; prompt: string; options: string[]; answer: number; explanation: string; tags: string[]; xp: number }
export type ProgressState = { lessonsCompleted: string[]; quizScores: Record<string, number>; xp: number; streak: number; flaggedQuestions: string[] }
