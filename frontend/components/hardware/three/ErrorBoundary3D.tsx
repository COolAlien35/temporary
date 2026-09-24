"use client"

import { Component, type ReactNode } from "react"
import { Box } from "lucide-react"

interface Props {
  children: ReactNode
  fallbackLabel?: string
}

interface State {
  hasError: boolean
}

/** Catches WebGL/three.js render errors so one broken 3D view never takes down the page. */
export class ErrorBoundary3D extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error("[v0] 3D render error:", error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <Box className="h-5 w-5 text-white/30" />
          <p className="text-xs text-white/40">{this.props.fallbackLabel ?? "3D preview unavailable"}</p>
        </div>
      )
    }
    return this.props.children
  }
}
