import { AppShell } from "@/components/shared/AppShell"
import { StudentRosterPage } from "@/components/instructor/StudentRosterPage"

export default function InstructorStudentsPage() {
  return (
    <AppShell variant="instructor">
      <StudentRosterPage />
    </AppShell>
  )
}
