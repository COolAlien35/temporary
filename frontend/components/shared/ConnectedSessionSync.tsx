"use client"

import { useEffect } from "react"
import { connectedAuthConfigured, connectedProvider, profileForToken } from "@/lib/services/connected-auth"
import { LearningLoopApiError } from "@/lib/services/learning-loop-api"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { useSession } from "@/store/use-session"

export function ConnectedSessionSync() {
  useEffect(() => {
    if (!connectedAuthConfigured) return
    let generation = 0
    let active = true
    const { data } = connectedProvider().auth.onAuthStateChange((event, session) => {
      const current = ++generation
      // Keep Supabase API calls out of its synchronous auth callback.
      window.setTimeout(() => {
        if (!active || current !== generation) return
        if (event === "SIGNED_OUT" || !session) {
          if (useSession.getState().mode === "connected") {
            useLearnerProgress.getState().switchLearner(null)
            useSession.getState().endSession()
          }
          return
        }
        if (window.location.pathname === "/reset-password") return
        const currentSession = useSession.getState()
        const sameLearner = currentSession.mode === "connected" && currentSession.user?.id === session.user.id
        if (currentSession.mode === "connected" && !sameLearner) {
          useLearnerProgress.getState().switchLearner(null)
          currentSession.endSession()
        }
        void profileForToken(session.access_token).then((result) => {
          if (!active || current !== generation || useSession.getState().mode === "demo") return
          useSession.getState().startSession(result)
          useLearnerProgress.getState().switchLearner(result.user.id)
        }).catch((error: unknown) => {
          if (!active || current !== generation || useSession.getState().mode !== "connected") return
          const temporaryFailure = !(error instanceof LearningLoopApiError) || error.status === 429 || error.status >= 500
          if (event === "TOKEN_REFRESHED" && sameLearner && temporaryFailure) return
          useLearnerProgress.getState().switchLearner(null)
          useSession.getState().endSession()
        })
      }, 0)
    })
    return () => { active = false; generation++; data.subscription.unsubscribe() }
  }, [])

  return null
}
