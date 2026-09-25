import { AppShell } from "@/components/shared/AppShell"
import { NotificationsPage } from "@/components/instructor/NotificationsPage"

export default function InstructorNotificationsPage() {
  return (
    <AppShell variant="instructor">
      <div className="relative z-0 mx-auto max-w-7xl px-5 py-9 md:px-8">
        <NotificationsPage />
      </div>
    </AppShell>
  )
}
