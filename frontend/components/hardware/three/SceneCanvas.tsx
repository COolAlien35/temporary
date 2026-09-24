"use client"

import { Suspense, type ReactNode } from "react"
import { Canvas } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { ErrorBoundary3D } from "./ErrorBoundary3D"

interface SceneCanvasProps {
  children: ReactNode
  /** camera distance in mm-equivalent units */
  cameraPosition?: [number, number, number]
  fov?: number
  className?: string
  dpr?: [number, number]
  fallbackLabel?: string
}

/**
 * Shared canvas shell used by every 3D view in the Hardware Studio: consistent
 * lighting, camera defaults, an environment map for metal reflections, and a
 * render-error boundary so a single broken view never breaks the page.
 */
export function SceneCanvas({
  children,
  cameraPosition = [80, 60, 100],
  fov = 40,
  className,
  dpr = [1, 1.75],
  fallbackLabel,
}: SceneCanvasProps) {
  return (
    <ErrorBoundary3D fallbackLabel={fallbackLabel}>
      <Canvas
        className={className}
        dpr={dpr}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: cameraPosition, fov, near: 0.1, far: 5000 }}
      >
        <color attach="background" args={["#05070c"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[120, 160, 80]} intensity={1.1} castShadow={false} />
        <directionalLight position={[-100, 40, -60]} intensity={0.35} color="#5eead4" />
        <pointLight position={[0, 40, 40]} intensity={0.25} color="#00D4FF" />
        <Suspense fallback={null}>
          <Environment preset="city" environmentIntensity={0.5} />
          {children}
        </Suspense>
      </Canvas>
    </ErrorBoundary3D>
  )
}
