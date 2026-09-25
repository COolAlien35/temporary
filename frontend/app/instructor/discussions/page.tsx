import { AppShell } from "@/components/shared/AppShell"
import { DiscussionsModerationPage } from "@/components/instructor/DiscussionsModerationPage"

export default function InstructorDiscussionsPage() {
  return (
    <AppShell variant="instructor">
      <div className="relative z-0 mx-auto max-w-7xl px-5 py-9 md:px-8">
        <DiscussionsModerationPage />
      </div>
    </AppShell>
  )
}
