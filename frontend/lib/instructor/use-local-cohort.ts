"use client"

import { useMemo } from "react"
import { useCoursework } from "@/store/use-coursework"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { useSession } from "@/store/use-session"
import { buildLocalCohort, buildMissedQuestions } from "./local-cohort"

export function useLocalCohort() {
  const names = useSession((state) => state.profiles)
  const progress = useLearnerProgress()
  const submissions = useCoursework((state) => state.submissions)
  const students = useMemo(() => buildLocalCohort(names, progress, submissions), [names, progress, submissions])
  const missedQuestions = useMemo(() => buildMissedQuestions(students), [students])
  return { students, missedQuestions }
}
