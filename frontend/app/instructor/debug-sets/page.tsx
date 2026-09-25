import { AppShell } from "@/components/shared/AppShell"
import { DebugSetManagerPage } from "@/components/instructor/DebugSetManagerPage"

export default function InstructorDebugSetsPage() {
  return (
    <AppShell variant="instructor">
      <div className="relative z-0 mx-auto max-w-7xl px-5 py-9 md:px-8">
        <DebugSetManagerPage />
      </div>
    </AppShell>
  )
}
