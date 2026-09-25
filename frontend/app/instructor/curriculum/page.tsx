import { AppShell } from "@/components/shared/AppShell"
import { CurriculumManagerPage } from "@/components/instructor/CurriculumManagerPage"

export default function InstructorCurriculumPage() {
  return (
    <AppShell variant="instructor">
      <CurriculumManagerPage />
    </AppShell>
  )
}
