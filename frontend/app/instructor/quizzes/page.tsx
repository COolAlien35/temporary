import { AppShell } from "@/components/shared/AppShell"
import { QuizManagerPage } from "@/components/instructor/QuizManagerPage"

export default function InstructorQuizzesPage() {
  return (
    <AppShell variant="instructor">
      <QuizManagerPage />
    </AppShell>
  )
}
