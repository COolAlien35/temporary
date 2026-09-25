import { AppShell } from "@/components/shared/AppShell"
import { ChallengeManagerPage } from "@/components/instructor/ChallengeManagerPage"

export default function InstructorChallengesPage() {
  return (
    <AppShell variant="instructor">
      <ChallengeManagerPage />
    </AppShell>
  )
}
