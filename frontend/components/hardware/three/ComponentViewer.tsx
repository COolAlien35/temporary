"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls, Center } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { Box, Layers3, Ruler, MousePointerClick, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { getComponent } from "@/lib/hardware/components"
import { getShapeModel } from "./models"
import { getPortAnchors } from "@/lib/hardware/three/registry"
import { LINES } from "@/lib/hardware/lines"
import { SceneCanvas } from "./SceneCanvas"

interface ComponentViewerProps {
  componentId: string
  className?: string
  /** show the overlay toggle bar (wireframe / explode / dimensions / ports) */
  controls?: boolean
  autoRotate?: boolean
  interactive?: boolean
}

function WireframeToggle({ group, wireframe }: { group: THREE.Group | null; wireframe: boolean }) {
  useEffect(() => {
    if (!group) return
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => {
          if ("wireframe" in m) (m as THREE.MeshStandardMaterial).wireframe = wireframe
        })
      }
    })
  }, [group, wireframe])
  return null
}

function SlowSpin({ enabled }: { enabled: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (enabled && ref.current) ref.current.rotation.y += delta * 0.35
  })
  return <group ref={ref} />
}

function DimensionLines({ x, y, z }: { x: number; y: number; z: number }) {
  const points = useMemo(() => {
    const hx = x / 2 + 4
    const hy = y / 2
    const hz = z / 2 + 4
    return {
      width: [new THREE.Vector3(-x / 2, -hy - 4, hz), new THREE.Vector3(x / 2, -hy - 4, hz)],
      height: [new THREE.Vector3(hx, -y / 2, hz), new THREE.Vector3(hx, y / 2, hz)],
      depth: [new THREE.Vector3(hx, -hy - 4, -z / 2), new THREE.Vector3(hx, -hy - 4, z / 2)],
    }
  }, [x, y, z])
  const mkGeo = (pts: THREE.Vector3[]) => new THREE.BufferGeometry().setFromPoints(pts)
  return (
    <group>
      {/* @ts-expect-error r3f's `line` intrinsic collides with the DOM/SVG `line` element type */}
      <line geometry={mkGeo(points.width)}>
        <lineBasicMaterial color="#00D4FF" />
      </line>
      {/* @ts-expect-error r3f's `line` intrinsic collides with the DOM/SVG `line` element type */}
      <line geometry={mkGeo(points.height)}>
        <lineBasicMaterial color="#00D4FF" />
      </line>
      {/* @ts-expect-error r3f's `line` intrinsic collides with the DOM/SVG `line` element type */}
      <line geometry={mkGeo(points.depth)}>
        <lineBasicMaterial color="#00D4FF" />
      </line>
    </group>
  )
}

function PortLabels({ shape, compatibleLines }: { shape: string; compatibleLines: string[] }) {
  const anchors = getPortAnchors(shape)
  const color = LINES[compatibleLines[0] as keyof typeof LINES]?.color ?? "#f97316"
  return (
    <group>
      {anchors.map((a) => (
        <group key={a.id} position={a.position}>
          <mesh>
            <sphereGeometry args={[0.9, 12, 12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function ModelStage({
  componentId,
  wireframe,
  explode,
  showDimensions,
  showPorts,
  autoRotate,
}: {
  componentId: string
  wireframe: boolean
  explode: number
  showDimensions: boolean
  showPorts: boolean
  autoRotate: boolean
}) {
  const def = getComponent(componentId)
  const Model = def ? getShapeModel(def.model.shape) : undefined
  const [group, setGroup] = useState<THREE.Group | null>(null)
  const spinRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (autoRotate && spinRef.current) spinRef.current.rotation.y += delta * 0.4
  })

  if (!def || !Model) return null

  return (
    <Center>
      <group ref={spinRef}>
        <group ref={setGroup}>
          <Model explode={explode} />
        </group>
        <WireframeToggle group={group} wireframe={wireframe} />
        {showDimensions && <DimensionLines x={def.dimensionsMm.x} y={def.dimensionsMm.y} z={def.dimensionsMm.z} />}
        {showPorts && <PortLabels shape={def.model.shape} compatibleLines={def.compatibleLines} />}
      </group>
    </Center>
  )
}

/** Mounts children only once the container scrolls near the viewport, so grids
 * of many viewers don't all open a WebGL context at once (browsers cap the
 * number of live contexts, and exceeding it silently breaks every canvas). */
function useInView(rootMargin = "200px") {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  return { ref, inView }
}

export function ComponentViewer({ componentId, className, controls = false, autoRotate = true, interactive = true }: ComponentViewerProps) {
  const [wireframe, setWireframe] = useState(false)
  const [exploded, setExploded] = useState(false)
  const [showDimensions, setShowDimensions] = useState(false)
  const [showPorts, setShowPorts] = useState(false)
  const [lightMode, setLightMode] = useState(false)
  const { ref, inView } = useInView()
  const def = getComponent(componentId)
  const maxDim = def ? Math.max(def.dimensionsMm.x, def.dimensionsMm.y, def.dimensionsMm.z) : 40
  const camDist = Math.max(60, maxDim * 2.4)

  return (
    <div ref={ref} className={cn("relative", className)}>
      {inView ? (
        <SceneCanvas cameraPosition={[camDist * 0.6, camDist * 0.45, camDist * 0.8]} fov={38} fallbackLabel="Model preview unavailable" background={lightMode ? "light" : "dark"}>
          <ModelStage
            componentId={componentId}
            wireframe={wireframe}
            explode={exploded ? 1 : 0}
            showDimensions={showDimensions}
            showPorts={showPorts}
            autoRotate={autoRotate && !exploded}
          />
          {interactive && <OrbitControls enablePan={false} minDistance={maxDim * 0.8} maxDistance={maxDim * 6} />}
        </SceneCanvas>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Box className="h-6 w-6 text-white/15" aria-hidden="true" />
        </div>
      )}

      {controls && (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-1.5">
          <ViewerToggle lightMode={lightMode} icon={Layers3} label="Explode" active={exploded} onClick={() => setExploded((v) => !v)} />
          <ViewerToggle lightMode={lightMode} icon={Box} label="Wireframe" active={wireframe} onClick={() => setWireframe((v) => !v)} />
          <ViewerToggle lightMode={lightMode} icon={Ruler} label="Dimensions" active={showDimensions} onClick={() => setShowDimensions((v) => !v)} />
          <ViewerToggle lightMode={lightMode} icon={MousePointerClick} label="Ports" active={showPorts} onClick={() => setShowPorts((v) => !v)} />
          <ViewerToggle lightMode={lightMode} icon={lightMode ? Moon : Sun} label={lightMode ? "Dark" : "Light"} active={lightMode} onClick={() => setLightMode((v) => !v)} />
        </div>
      )}
    </div>
  )
}

function ViewerToggle({
  lightMode,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  lightMode: boolean
  icon: typeof Box
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "pointer-events-auto flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium backdrop-blur-sm transition-colors",
        lightMode
          ? active
            ? "border-sky-500 bg-sky-100 text-sky-700"
            : "border-slate-300 bg-white/95 text-slate-700 shadow-sm hover:border-sky-400 hover:bg-sky-50 hover:text-slate-900"
          : active
            ? "border-[#00D4FF]/50 bg-[#00D4FF]/15 text-[#00D4FF]"
            : "border-white/10 bg-black/40 text-white/70 hover:text-white",
      )}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  )
}
