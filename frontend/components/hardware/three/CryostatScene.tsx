"use client"

import { useMemo } from "react"
import { Html, OrbitControls, QuadraticBezierLine } from "@react-three/drei"
import { getComponent } from "@/lib/hardware/components"
import { LINES } from "@/lib/hardware/lines"
import { buildTransformMap, getPlateLayouts, getPortWorldPosition, STAGE_SPACING_MM } from "@/lib/hardware/three/layout"
import { getShapeModel } from "./models"
import type { Design } from "@/lib/hardware/types"
import { SceneCanvas } from "./SceneCanvas"

function Standoffs({ radius, yTop, yBottom }: { radius: number; yTop: number; yBottom: number }) {
  const count = 4
  const rods = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.PI / 4
        return [Math.cos(a) * radius * 0.86, Math.sin(a) * radius * 0.86] as const
      }),
    [radius],
  )
  const height = yTop - yBottom
  return (
    <>
      {rods.map(([x, z], i) => (
        <mesh key={i} position={[x, yBottom + height / 2, z]}>
          <cylinderGeometry args={[3, 3, height, 10]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </>
  )
}

function Plate({ y, radius, thickness, color, label, tempLabel }: { y: number; radius: number; thickness: number; color: string; label: string; tempLabel: string }) {
  return (
    <group position={[0, y, 0]}>
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[radius, radius, thickness, 64]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, thickness / 2 + 0.1, 0]}>
        <ringGeometry args={[radius - 4, radius, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} side={2} />
      </mesh>
      <Html position={[-radius - 14, thickness / 2, 0]} center={false} distanceFactor={0} occlude={false} zIndexRange={[1, 0]}>
        <div className="pointer-events-none -translate-x-full whitespace-nowrap rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
          <span className="font-semibold" style={{ color }}>
            {label}
          </span>
          <span className="ml-1.5 text-white/50">{tempLabel}</span>
        </div>
      </Html>
    </group>
  )
}

function PlacedItem({ shape, transform, selected }: { shape: string; transform: { position: [number, number, number]; rotationY: number }; selected: boolean }) {
  const Model = getShapeModel(shape)
  if (!Model) return null
  return (
    <group position={transform.position} rotation={[0, transform.rotationY, 0]}>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, 0]}>
          <ringGeometry args={[9, 12, 32]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.85} side={2} />
        </mesh>
      )}
      <Model />
    </group>
  )
}

interface CryostatSceneProps {
  design: Design
  hiddenLines: string[]
  selectedPlacedId: string | null
  className?: string
}

export function CryostatScene({ design, hiddenLines, selectedPlacedId, className }: CryostatSceneProps) {
  const plates = useMemo(() => getPlateLayouts(design.stages), [design.stages])
  const transforms = useMemo(() => buildTransformMap(design), [design])
  const maxRadius = Math.max(...plates.map((p) => p.radius), 100)
  const totalHeight = plates.length > 1 ? plates[0].y - plates[plates.length - 1].y : STAGE_SPACING_MM

  return (
    <SceneCanvas
      className={className}
      cameraPosition={[maxRadius * 1.9, totalHeight * 0.55, maxRadius * 1.9]}
      fov={42}
    >
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={maxRadius * 0.6} maxDistance={maxRadius * 6} target={[0, 0, 0]} />

      {plates.map((plate, i) => {
        const stage = design.stages[i]
        return (
          <group key={plate.stageId}>
            <Plate y={plate.y} radius={plate.radius} thickness={plate.thickness} color={stage.color} label={stage.label} tempLabel={stage.temperatureLabel} />
            {i < plates.length - 1 && (
              <Standoffs radius={Math.min(plate.radius, plates[i + 1].radius)} yTop={plate.y - plate.thickness / 2} yBottom={plates[i + 1].y + plates[i + 1].thickness / 2} />
            )}
          </group>
        )
      })}

      {design.placed.map((p) => {
        const def = getComponent(p.componentId)
        const transform = transforms.get(p.id)
        if (!def || !transform) return null
        return <PlacedItem key={p.id} shape={def.model.shape} transform={transform} selected={selectedPlacedId === p.id} />
      })}

      {design.routes
        .filter((r) => !hiddenLines.includes(r.lineType))
        .map((route) => {
          const fromPlaced = design.placed.find((p) => p.id === route.fromPlacedId)
          const toPlaced = design.placed.find((p) => p.id === route.toPlacedId)
          const fromT = fromPlaced && transforms.get(fromPlaced.id)
          const toT = toPlaced && transforms.get(toPlaced.id)
          if (!fromPlaced || !toPlaced || !fromT || !toT) return null
          const from = getPortWorldPosition(fromPlaced, route.fromPort, fromT)
          const to = getPortWorldPosition(toPlaced, route.toPort, toT)
          if (!from || !to) return null
          const mid: [number, number, number] = [(from[0] + to[0]) / 2, Math.max(from[1], to[1]) + 14, (from[2] + to[2]) / 2]
          const color = LINES[route.lineType]?.color ?? "#94a3b8"
          return <QuadraticBezierLine key={route.id} start={from} end={to} mid={mid} color={color} lineWidth={1.75} transparent opacity={0.85} />
        })}
    </SceneCanvas>
  )
}
