"use client"

// Reusable building blocks for the 14 procedural component models.
// All units are millimeters; 1 three.js unit = 1 mm.
import { useMemo } from "react"
import * as THREE from "three"
import { RoundedBox } from "@react-three/drei"
import { createFinishMaterial, GOLD_PIN, KNURL_ACCENT, COPPER_WIRE, type FinishId } from "@/lib/hardware/three/materials"

type Vec3 = [number, number, number]

/** A single SMA connector: hex body, knurled coupling nut, white PTFE dielectric ring, gold center pin. */
export function SmaConnector({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  facing = 1,
}: {
  position?: Vec3
  rotation?: Vec3
  scale?: number
  /** 1 = pin points +local Z, -1 = pin points -local Z */
  facing?: 1 | -1
}) {
  const bodyMat = useMemo(() => createFinishMaterial("brass"), [])
  const dielectric = useMemo(() => createFinishMaterial("ptfe"), [])
  const dir = facing
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* hex body */}
      <mesh material={bodyMat} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[3.1, 3.1, 6, 6]} />
      </mesh>
      {/* knurled coupling nut */}
      <mesh material={KNURL_ACCENT} position={[0, 0, 3.6 * dir]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.6, 2.6, 3.2, 18]} />
      </mesh>
      {/* threaded barrel */}
      <mesh material={bodyMat} position={[0, 0, 5.4 * dir]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.7, 1.7, 2.4, 16]} />
      </mesh>
      {/* PTFE dielectric */}
      <mesh material={dielectric} position={[0, 0, 6.4 * dir]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.15, 1.15, 1.2, 16]} />
      </mesh>
      {/* gold center pin */}
      <mesh material={GOLD_PIN} position={[0, 0, 7.4 * dir]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 2.2, 10]} />
      </mesh>
    </group>
  )
}

/** A Nano-D style rectangular DC connector shell with two visible pin rows. */
export function NanoD({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pins = 9,
}: {
  position?: Vec3
  rotation?: Vec3
  pins?: number
}) {
  const shell = useMemo(() => createFinishMaterial("steel"), [])
  const w = 8
  const h = 4
  const d = 5
  const row = Math.ceil(pins / 2)
  return (
    <group position={position} rotation={rotation}>
      <mesh material={shell}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {[-1, 1].map((sign) =>
        Array.from({ length: row }).map((_, i) => (
          <mesh key={`${sign}-${i}`} material={GOLD_PIN} position={[-w / 2 + ((i + 1) * w) / (row + 1), sign * (h / 4), d / 2 + 0.6]}>
            <cylinderGeometry args={[0.25, 0.25, 1.4, 8]} />
          </mesh>
        )),
      )}
    </group>
  )
}

/** A hex nut / flange ring, used on connector barrels and bulkheads. */
export function HexNut({ position = [0, 0, 0], radius = 3, thickness = 2, finish = "steel" as FinishId }: { position?: Vec3; radius?: number; thickness?: number; finish?: FinishId }) {
  const mat = useMemo(() => createFinishMaterial(finish), [finish])
  return (
    <mesh material={mat} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[radius, radius, thickness, 6]} />
    </mesh>
  )
}

/** A rounded-edge box housing — the workhorse body for filters, circulators, isolators, couplers. */
export function BoxHousing({
  size,
  finish,
  radius = 1.2,
  position = [0, 0, 0],
}: {
  size: Vec3
  finish: FinishId
  radius?: number
  position?: Vec3
}) {
  const mat = useMemo(() => createFinishMaterial(finish), [finish])
  return (
    <RoundedBox args={size} radius={Math.min(radius, Math.min(...size) / 4)} smoothness={4} position={position} material={mat} />
  )
}

/** A cylindrical body — attenuator cans, IR filter cans, sample can bodies. */
export function CylBody({
  radius,
  length,
  finish,
  position = [0, 0, 0],
  radialSegments = 24,
  /** 'z' lies the cylinder on its side (default, cable-like); 'y' stands it up */
  axis = "z",
}: {
  radius: number
  length: number
  finish: FinishId
  position?: Vec3
  radialSegments?: number
  axis?: "y" | "z"
}) {
  const mat = useMemo(() => createFinishMaterial(finish), [finish])
  const rotation: Vec3 = axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0]
  return (
    <mesh material={mat} position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, length, radialSegments]} />
    </mesh>
  )
}

/** Fake through-holes: small dark recessed cylinders inset from the surface (CSG-free). */
export function MountingHoles({
  positions,
  radius = 1.1,
  depth = 1.4,
  axis = "y",
}: {
  positions: Vec3[]
  radius?: number
  depth?: number
  axis?: "x" | "y" | "z"
}) {
  const rot: Vec3 = axis === "y" ? [0, 0, 0] : axis === "x" ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]
  return (
    <>
      {positions.map((p, i) => (
        <mesh key={i} position={p} rotation={rot}>
          <cylinderGeometry args={[radius, radius, depth, 14]} />
          <meshStandardMaterial color="#050505" metalness={0} roughness={1} />
        </mesh>
      ))}
    </>
  )
}

/** Curled solder wire leads, e.g. on a thermometer sensor can. */
export function SolderWires({ origin = [0, 0, 0], count = 4 }: { origin?: Vec3; count?: number }) {
  const curves = useMemo(() => {
    const arr: THREE.TubeGeometry[] = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const start = new THREE.Vector3(origin[0], origin[1], origin[2])
      const points: THREE.Vector3[] = []
      for (let t = 0; t <= 8; t++) {
        const f = t / 8
        points.push(
          new THREE.Vector3(
            start.x + Math.cos(angle) * 2 * f + Math.sin(f * Math.PI * 3 + i) * 0.6,
            start.y - f * 6,
            start.z + Math.sin(angle) * 2 * f,
          ),
        )
      }
      const curve = new THREE.CatmullRomCurve3(points)
      arr.push(new THREE.TubeGeometry(curve, 20, 0.18, 6, false))
    }
    return arr
  }, [origin, count])

  return (
    <>
      {curves.map((geo, i) => (
        <mesh key={i} geometry={geo} material={COPPER_WIRE} />
      ))}
    </>
  )
}

/** A thin laser-etched color band around a cylindrical body, for value/model markings. */
export function EtchBand({ radius, position = [0, 0, 0], color = "#00D4FF" }: { radius: number; position?: Vec3; color?: string }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[radius + 0.05, radius + 0.05, 1.6, 24]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} metalness={0.2} roughness={0.4} />
    </mesh>
  )
}
