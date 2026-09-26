export type StaffRole = "Lead Instructor" | "Co-Instructor" | "Teaching Assistant" | "Auditor"
export type StaffStatus = "Active" | "Invited" | "Suspended"

export type StaffMember = {
  id: string
  name: string
  email: string
  role: StaffRole
  status: StaffStatus
  initials: string
  assignedBatches: string[]
  joinedDate: string
  permissions: Record<"canEditCurriculum" | "canManageContests" | "canModerateDiscussions" | "canBroadcastAnnouncements" | "canManageCohortsAndGrades" | "canManageTeamRoles", boolean>
}

export type CohortBatch = { id: string; name: string; cohortId: string; schedule: string; taAssigned: string; studentCount: number; maxCapacity: number }
export type CohortConfig = { id: string; name: string; term: string; status: "Active" | "Upcoming" | "Archived"; startDate: string; endDate: string; timezone: string; description: string; totalEnrolled: number; batches: CohortBatch[]; simulatorBudgetPerStudentQubits: number; dailyShotLimit: number; hardwareAccessLevel: "Simulator Only" | "Noisy Emulator + Simulator" | "Full QPUs (Rigetti/IBM)" }
export type CourseRulesConfig = { passingMasteryThreshold: number; atRiskMasteryThreshold: number; lateSubmissionPenaltyPerDay: number; maxGracePeriodHours: number; allowAiAssistantInContests: boolean; enableAutoMisconceptionTagging: boolean; defaultSimulatorShots: number; noiseModelPresets: string }
export type IntegrationConfig = { lmsProvider: "Canvas" | "Blackboard" | "Moodle" | "LTI 1.3" | "None"; lmsStatus: "Connected" | "Disconnected" | "Syncing"; lastSyncTimestamp?: string; webhookUrlDiscussions?: string; webhookUrlAlerts?: string; exportGradesFormat: "CSV" | "JSON" | "Direct LTI Gradebook Push" }

const permissions = (overrides: Partial<StaffMember["permissions"]> = {}): StaffMember["permissions"] => ({ canEditCurriculum: false, canManageContests: false, canModerateDiscussions: false, canBroadcastAnnouncements: false, canManageCohortsAndGrades: false, canManageTeamRoles: false, ...overrides })
export const staffMembers: StaffMember[] = [
  { id: "rina-kapoor", name: "Dr. Rina Kapoor", email: "rina.kapoor@quantumloop.edu", role: "Lead Instructor", status: "Active", initials: "RK", assignedBatches: ["All"], joinedDate: "Jan 12, 2026", permissions: permissions({ canEditCurriculum: true, canManageContests: true, canModerateDiscussions: true, canBroadcastAnnouncements: true, canManageCohortsAndGrades: true, canManageTeamRoles: true }) },
  { id: "alan-vance", name: "Prof. Alan Vance", email: "alan.vance@quantumloop.edu", role: "Co-Instructor", status: "Active", initials: "AV", assignedBatches: ["All"], joinedDate: "Jan 18, 2026", permissions: permissions({ canEditCurriculum: true, canManageContests: true, canModerateDiscussions: true, canBroadcastAnnouncements: true, canManageCohortsAndGrades: true }) },
  { id: "marcus-chen", name: "Marcus Chen", email: "marcus.chen@quantumloop.edu", role: "Teaching Assistant", status: "Active", initials: "MC", assignedBatches: ["Batch A"], joinedDate: "Feb 3, 2026", permissions: permissions({ canManageContests: true, canModerateDiscussions: true, canBroadcastAnnouncements: true }) },
  { id: "sarah-lin", name: "Sarah Lin", email: "sarah.lin@quantumloop.edu", role: "Teaching Assistant", status: "Active", initials: "SL", assignedBatches: ["Batch B"], joinedDate: "Feb 7, 2026", permissions: permissions({ canModerateDiscussions: true, canBroadcastAnnouncements: true }) },
  { id: "elias-thorne", name: "Dr. Elias Thorne", email: "dr.elias.thorne@mit.edu", role: "Co-Instructor", status: "Invited", initials: "ET", assignedBatches: ["All"], joinedDate: "Pending invite", permissions: permissions() },
]

export const cohorts: CohortConfig[] = [
  { id: "alpha-2026", name: "Cohort Alpha 2026", term: "Fall 2026", status: "Active", startDate: "Sep 1, 2026", endDate: "Dec 18, 2026", timezone: "Eastern Time (EST)", description: "Foundations of quantum computing, circuits, algorithms, and hardware-aware reasoning.", totalEnrolled: 8, simulatorBudgetPerStudentQubits: 24, dailyShotLimit: 10000, hardwareAccessLevel: "Noisy Emulator + Simulator", batches: [{ id: "batch-a", name: "Batch A", cohortId: "alpha-2026", schedule: "Tue/Thu 10:00 AM - 12:00 PM EST", taAssigned: "Marcus Chen", studentCount: 4, maxCapacity: 20 }, { id: "batch-b", name: "Batch B", cohortId: "alpha-2026", schedule: "Tue/Thu 6:00 PM - 8:00 PM EST", taAssigned: "Sarah Lin", studentCount: 4, maxCapacity: 20 }] },
  { id: "beta-2026", name: "Cohort Beta 2026", term: "Winter 2026-27", status: "Upcoming", startDate: "Nov 2, 2026", endDate: "Feb 26, 2027", timezone: "Eastern Time (EST)", description: "Upcoming quantum foundations cohort currently accepting registrations.", totalEnrolled: 14, simulatorBudgetPerStudentQubits: 24, dailyShotLimit: 10000, hardwareAccessLevel: "Simulator Only", batches: [] },
]

export const defaultCourseRules: CourseRulesConfig = { passingMasteryThreshold: 75, atRiskMasteryThreshold: 50, lateSubmissionPenaltyPerDay: 5, maxGracePeriodHours: 24, allowAiAssistantInContests: false, enableAutoMisconceptionTagging: true, defaultSimulatorShots: 1024, noiseModelPresets: "Realistic Superconducting Transmon" }
export const defaultIntegration: IntegrationConfig = { lmsProvider: "Canvas", lmsStatus: "Connected", lastSyncTimestamp: "2 hours ago", webhookUrlDiscussions: "https://hooks.slack.com/services/quantumloop/discussions", webhookUrlAlerts: "", exportGradesFormat: "CSV" }
export const rolePermissionLabels = ["Edit Curriculum & Quiz Banks", "Create / Schedule Contests", "Forum Moderation & Flag Resolution", "Broadcast Faculty Announcements", "Manage Cohorts & Export Final Grades", "Manage Staff Roles & API Keys"]
export const getCohort = (id: string) => cohorts.find((cohort) => cohort.id === id) ?? cohorts[0]
