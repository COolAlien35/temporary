"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Atom,
  Download,
  Flame,
  Gauge,
  MessageSquare,
  Search,
  ShieldAlert,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react"
import {
  assignmentOptions,
  masteryLevel,
  reasonOptions,
  studentInitials,
  students,
  type MasteryStatus,
  type Student,
} from "@/lib/instructor-students"

type BatchFilter = "All" | "A" | "B"
type MasteryFilter = "All" | "High" | "Mid" | "Low"
type StatusFilter = "All" | MasteryStatus
type SortOption = "Lowest Mastery" | "Recent Activity" | "XP" | "A-Z"
type Tab = "Mastery" | "Predict→Build" | "Debug & Contests" | "Forum"

const TABS: Tab[] = ["Mastery", "Predict→Build", "Debug & Contests", "Forum"]
const SORT_OPTIONS: SortOption[] = ["Lowest Mastery", "Recent Activity", "XP", "A-Z"]

const statusStyles: Record<MasteryStatus, { text: string; bg: string; dot: string }> = {
  "On Track": { text: "text-[#4ADE80]", bg: "bg-[#4ADE80]/12", dot: "#4ADE80" },
  "At-Risk": { text: "text-[#FB7185]", bg: "bg-[#FB7185]/12", dot: "#FB7185" },
  Inactive: { text: "text-[#F5B942]", bg: "bg-[#F5B942]/12", dot: "#F5B942" },
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Users
  accent: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[.16em] text-white/45">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
          <p className="mt-1 text-xs text-white/45">{detail}</p>
        </div>
        <span
          className="flex size-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}18`, color: accent }}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <div className="absolute -bottom-10 -right-8 size-24 rounded-full blur-2xl" style={{ backgroundColor: `${accent}12` }} />
    </div>
  )
}

function FilterPillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: T[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-[.14em] text-white/35">{label}</span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-lg border px-3 py-1.5 text-xs transition ${
            value === option
              ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]"
              : "border-white/10 text-white/50 hover:text-white"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function ProgressBar({ value, color = "#00D4FF" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10">
      <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  )
}

function StatusBadge({ status }: { status: MasteryStatus }) {
  const style = statusStyles[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${style.text} ${style.bg}`}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
      {status}
    </span>
  )
}

function Avatar({ name, size = "size-9" }: { name: string; size?: string }) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] text-[11px] font-semibold text-[#07101a]`}
    >
      {studentInitials(name)}
    </div>
  )
}

function exportCsv(rows: Student[]) {
  const header = ["Name", "Email", "Batch", "Mastery", "Status", "Predict Accuracy", "Debug Attempts", "XP"]
  const lines = rows.map((s) =>
    [s.name, s.email, s.batch, `${s.mastery}%`, s.status, `${s.predictAccuracy}%`, s.debugAttempts, s.xp].join(","),
  )
  const csv = [header.join(","), ...lines].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "student-roster.csv"
  link.click()
  URL.revokeObjectURL(url)
}

export function StudentRosterPage() {
  const [search, setSearch] = useState("")
  const [batchFilter, setBatchFilter] = useState<BatchFilter>("All")
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>("All")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All")
  const [sortBy, setSortBy] = useState<SortOption>("Lowest Mastery")

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("Mastery")
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideForm, setOverrideForm] = useState({
    assignment: assignmentOptions[0],
    newScore: "",
    reason: reasonOptions[0],
    notes: "",
  })
  const [saved, setSaved] = useState(false)

  const filteredStudents = useMemo(() => {
    let result = students.filter((student) => {
      if (search && !student.name.toLowerCase().includes(search.toLowerCase())) return false
      if (batchFilter !== "All" && student.batch !== batchFilter) return false
      if (masteryFilter !== "All" && masteryLevel(student.mastery) !== masteryFilter) return false
      if (statusFilter !== "All" && student.status !== statusFilter) return false
      return true
    })

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "Lowest Mastery":
          return a.mastery - b.mastery
        case "Recent Activity":
          return b.streak - a.streak
        case "XP":
          return b.xp - a.xp
        case "A-Z":
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return result
  }, [search, batchFilter, masteryFilter, statusFilter, sortBy])

  const selectedStudent = students.find((s) => s.id === selectedId) ?? null

  useEffect(() => {
    if (!selectedStudent) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [selectedStudent])

  function openStudent(student: Student) {
    setSelectedId(student.id)
    setActiveTab("Mastery")
    setOverrideForm({ assignment: assignmentOptions[0], newScore: String(student.mastery), reason: reasonOptions[0], notes: "" })
    setSaved(false)
  }

  function closeDrawer() {
    setSelectedId(null)
    setOverrideOpen(false)
  }

  function saveOverride() {
    setSaved(true)
    setOverrideOpen(false)
  }

  return (
    <main className="relative z-0 mx-auto max-w-7xl px-5 py-9 md:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg border border-[#F5B942]/30 bg-[#F5B942]/10 text-[#F5B942]">
              <Atom className="size-4" />
            </span>
            <p className="text-xs uppercase tracking-[.24em] text-[#F5B942]">Instructor view</p>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Student roster</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
            Search, filter, and drill into any learner&apos;s mastery, prediction accuracy, and forum activity.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-xs text-white/55">
          <Zap className="size-3.5 text-[#F5B942]" /> Data synced from learner activity · just now
        </div>
      </div>

      {/* Stat cards */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total enrolled" value="128" detail="Across batches A & B" icon={Users} accent="#00D4FF" />
        <StatCard label="Needs intervention" value="12" detail="Low trend or inactive" icon={ShieldAlert} accent="#FB7185" />
        <StatCard label="Avg. mastery" value="74%" detail="Across 36 concepts" icon={Gauge} accent="#4ADE80" />
        <StatCard label="Active (24h)" value="89" detail="Logged in learners" icon={Zap} accent="#F5B942" />
      </section>

      {/* Filter & search bar */}
      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student name"
              className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00D4FF]/40"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] uppercase tracking-[.14em] text-white/35">Sort</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-[#00D4FF]/40"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-[#0f1420]">
                  {option}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => exportCsv(filteredStudents)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/70 transition hover:border-[#00D4FF]/40 hover:text-[#00D4FF]"
            >
              <Download className="size-3.5" /> Export CSV
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-white/8 pt-4">
          <FilterPillGroup label="Batch" options={["All", "A", "B"] as BatchFilter[]} value={batchFilter} onChange={setBatchFilter} />
          <FilterPillGroup
            label="Mastery"
            options={["All", "High", "Mid", "Low"] as MasteryFilter[]}
            value={masteryFilter}
            onChange={setMasteryFilter}
          />
          <FilterPillGroup
            label="Status"
            options={["All", "On Track", "At-Risk", "Inactive"] as StatusFilter[]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>
      </section>

      {/* Roster table */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]">
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[56px_1.6fr_1.1fr_110px_110px_110px_110px] gap-3 border-b border-white/10 px-5 py-3 text-[11px] uppercase tracking-wider text-white/35">
              <span>#</span>
              <span>Student</span>
              <span>Mastery</span>
              <span>Predict acc.</span>
              <span>Debug attempts</span>
              <span>Contest XP</span>
              <span>Status</span>
            </div>

            {filteredStudents.map((student, index) => (
              <button
                key={student.id}
                type="button"
                onClick={() => openStudent(student)}
                className="grid w-full grid-cols-[56px_1.6fr_1.1fr_110px_110px_110px_110px] items-center gap-3 border-b border-white/5 px-5 py-4 text-left text-sm transition last:border-0 hover:bg-white/[.04]"
              >
                <span className="font-semibold text-white/45">{index + 1}</span>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={student.name} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{student.name}</p>
                    <p className="truncate text-xs text-white/40">Batch {student.batch}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-9 text-xs text-white/60">{student.mastery}%</span>
                  <ProgressBar
                    value={student.mastery}
                    color={student.mastery >= 75 ? "#4ADE80" : student.mastery >= 50 ? "#F5B942" : "#FB7185"}
                  />
                </div>
                <span className="text-white/60">{student.predictAccuracy}%</span>
                <span className="text-white/60">{student.debugAttempts}</span>
                <span className="text-[#F5B942]">{student.contestXp.toLocaleString()}</span>
                <StatusBadge status={student.status} />
              </button>
            ))}

            {filteredStudents.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-white/40">No students match these filters.</div>
            )}
          </div>
        </div>
      </section>

      {/* Drill-down drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/70" onClick={closeDrawer} />
          <div className="absolute right-0 top-14 flex h-[calc(100%-3.5rem)] w-full max-w-md min-h-0 flex-col overflow-hidden border-l border-white/10 bg-[#0D111C] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
              <div className="flex items-start gap-3">
                <Avatar name={selectedStudent.name} size="size-12" />
                <div>
                  <p className="text-base font-semibold text-white">{selectedStudent.name}</p>
                  <p className="text-xs text-white/45">{selectedStudent.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                    <span className="rounded-full border border-white/10 px-2 py-0.5">Batch {selectedStudent.batch}</span>
                    <span className="flex items-center gap-1 rounded-full border border-[#FFB800]/20 px-2 py-0.5 text-[#FFB800]">
                      <Flame className="size-3" /> {selectedStudent.streak}d streak
                    </span>
                    <span className="rounded-full border border-[#00D4FF]/20 px-2 py-0.5 text-[#00D4FF]">
                      {selectedStudent.xp.toLocaleString()} XP
                    </span>
                  </div>
                </div>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-md p-1 text-white/40 hover:text-white">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5">
              <button
                type="button"
                onClick={() => setOverrideOpen(true)}
                className="w-full rounded-lg border border-[#00D4FF]/40 bg-[#00D4FF]/10 px-3 py-2 text-sm font-medium text-[#00D4FF] transition hover:bg-[#00D4FF]/20"
              >
                Adjust score
              </button>
              {saved && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-[#4ADE80]">
                  <Sparkles className="size-3.5" /> Score override saved.
                </p>
              )}
            </div>

            <div className="px-5">
              <div className="flex flex-wrap gap-2 border-b border-white/8 pb-4">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                      activeTab === tab
                        ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]"
                        : "border-white/10 text-white/50 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {activeTab === "Mastery" && (
                <div className="flex flex-col gap-3">
                  {selectedStudent.concepts.map((concept) => (
                    <div key={concept.concept} className="rounded-xl border border-white/8 bg-black/10 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">{concept.concept}</p>
                        <span className="text-xs text-white/50">{concept.mastery}%</span>
                      </div>
                      <div className="mt-2">
                        <ProgressBar
                          value={concept.mastery}
                          color={concept.mastery >= 75 ? "#4ADE80" : concept.mastery >= 50 ? "#F5B942" : "#FB7185"}
                        />
                      </div>
                      {concept.misconception && (
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#A78BFA]/12 px-2 py-1 text-[10px] font-medium text-[#A78BFA]">
                          <AlertTriangle className="size-3" /> {concept.misconception}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "Predict→Build" && (
                <div className="flex flex-col gap-2">
                  {selectedStudent.predictLog.map((entry, index) => (
                    <div
                      key={`${entry.concept}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/10 p-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{entry.concept}</p>
                        <p className="mt-0.5 text-xs text-white/40">{entry.timestamp}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                          entry.result === "correct" ? "bg-[#4ADE80]/12 text-[#4ADE80]" : "bg-[#FB7185]/12 text-[#FB7185]"
                        }`}
                      >
                        {entry.result === "correct" ? "Correct" : "Wrong"}
                      </span>
                    </div>
                  ))}
                  {selectedStudent.predictLog.length === 0 && <p className="text-sm text-white/40">No predictions logged yet.</p>}
                </div>
              )}

              {activeTab === "Debug & Contests" && (
                <div className="flex flex-col gap-5">
                  <div>
                    <p className="text-xs uppercase tracking-[.14em] text-white/35">Debug scenarios</p>
                    <div className="mt-2 flex flex-col gap-2">
                      {selectedStudent.debugScenarios.map((scenario, index) => (
                        <div
                          key={`${scenario.title}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/10 p-3.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-white">{scenario.title}</p>
                            <p className="mt-0.5 text-xs text-white/40">{scenario.timestamp}</p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                              scenario.result === "solved"
                                ? "bg-[#4ADE80]/12 text-[#4ADE80]"
                                : scenario.result === "failed"
                                  ? "bg-[#FB7185]/12 text-[#FB7185]"
                                  : "bg-[#F5B942]/12 text-[#F5B942]"
                            }`}
                          >
                            {scenario.result}
                          </span>
                        </div>
                      ))}
                      {selectedStudent.debugScenarios.length === 0 && (
                        <p className="text-sm text-white/40">No debug attempts yet.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[.14em] text-white/35">Contest placements</p>
                    <div className="mt-2 flex flex-col gap-2">
                      {selectedStudent.contests.map((contest) => (
                        <div
                          key={contest.name}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/10 p-3.5"
                        >
                          <div className="flex items-center gap-2 text-sm text-white">
                            <Trophy className="size-3.5 text-[#F5B942]" /> {contest.name}
                          </div>
                          <span className="text-xs text-white/50">
                            {contest.placement} · {contest.xp} XP
                          </span>
                        </div>
                      ))}
                      {selectedStudent.contests.length === 0 && (
                        <p className="text-sm text-white/40">Hasn&apos;t entered a contest yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Forum" && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/8 bg-black/10 p-4 text-center">
                    <MessageSquare className="mx-auto size-4 text-[#00D4FF]" />
                    <p className="mt-3 text-2xl font-semibold text-white">{selectedStudent.forum.threadsStarted}</p>
                    <p className="mt-1 text-[11px] text-white/40">Threads started</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/10 p-4 text-center">
                    <Sparkles className="mx-auto size-4 text-[#F5B942]" />
                    <p className="mt-3 text-2xl font-semibold text-white">{selectedStudent.forum.upvotedAnswers}</p>
                    <p className="mt-1 text-[11px] text-white/40">Upvoted answers</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/10 p-4 text-center">
                    <Trophy className="mx-auto size-4 text-[#A78BFA]" />
                    <p className="mt-3 text-2xl font-semibold text-white">{selectedStudent.forum.reputation}</p>
                    <p className="mt-1 text-[11px] text-white/40">Reputation</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grade override modal */}
      {overrideOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOverrideOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1420] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[.16em] text-[#00D4FF]">Grade override</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{selectedStudent.name}</h3>
              </div>
              <button type="button" onClick={() => setOverrideOpen(false)} className="rounded-md p-1 text-white/40 hover:text-white">
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-white/50">Assignment</span>
                <select
                  value={overrideForm.assignment}
                  onChange={(event) => setOverrideForm((form) => ({ ...form, assignment: event.target.value }))}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#00D4FF]/40"
                >
                  {assignmentOptions.map((option) => (
                    <option key={option} value={option} className="bg-[#0f1420]">
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-white/50">Current score</span>
                  <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm text-white/60">
                    {selectedStudent.mastery}%
                  </div>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-white/50">New score</span>
                  <input
                    value={overrideForm.newScore}
                    onChange={(event) => setOverrideForm((form) => ({ ...form, newScore: event.target.value }))}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#00D4FF]/40"
                    inputMode="numeric"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-white/50">Reason</span>
                <select
                  value={overrideForm.reason}
                  onChange={(event) => setOverrideForm((form) => ({ ...form, reason: event.target.value }))}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#00D4FF]/40"
                >
                  {reasonOptions.map((option) => (
                    <option key={option} value={option} className="bg-[#0f1420]">
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-white/50">Notes</span>
                <textarea
                  value={overrideForm.notes}
                  onChange={(event) => setOverrideForm((form) => ({ ...form, notes: event.target.value }))}
                  rows={3}
                  placeholder="Add context for this override…"
                  className="resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00D4FF]/40"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOverrideOpen(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveOverride}
                className="rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#07101a] transition hover:bg-[#00D4FF]/85"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
