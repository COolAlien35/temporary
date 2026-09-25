import { AppShell } from "@/components/shared/AppShell"
import { ContestManagerPage } from "@/components/instructor/ContestManagerPage"

export default function InstructorContestsPage() {
  return (
    <AppShell variant="instructor">
      <ContestManagerPage />
    </AppShell>
  )
}
