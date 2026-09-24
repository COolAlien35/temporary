"use client"

// 14 procedural 3D models, one per HardwareComponent `model.shape`.
// Every model is built purely from primitives (no external assets) and is sized
// directly from lib/hardware/components.ts `dimensionsMm`, so geometry always
// matches the data. Units are millimeters, origin at the model's bbox center.
import { useMemo, type ComponentType } from "react"
import * as THREE from "three"
import { getComponent } from "@/lib/hardware/components"
import { createFinishMaterial, DARK_ABSORBER, CHIP_SUBSTRATE, GOLD_PIN, KNURL_ACCENT } from "@/lib/hardware/three/materials"
import { BoxHousing, CylBody, SmaConnector, NanoD, MountingHoles, SolderWires, EtchBand, HexNut } from "./helpers"

export interface ModelProps {
  /** 0 = assembled, 1 = fully exploded (connectors/leads pulled outward) */
  explode?: number
}

function useDims(id: string) {
  return useMemo(() => getComponent(id)?.dimensionsMm ?? { x: 10, y: 10, z: 10 }, [id])
}

// ---------------------------------------------------------------------------
export function AttenuatorModel({ explode = 0 }: ModelProps) {
  const d = useDims("attenuator")
  const r = d.x / 2
  const pull = explode * 10
  return (
    <group>
      <CylBody radius={r} length={d.y} finish="gold-copper" position={[0, 0, 0]} axis="y" />
      <EtchBand radius={r} position={[0, d.y * 0.15, 0]} color="#00D4FF" />
      <HexNut position={[0, d.y / 2 - 1, 0]} radius={r * 0.9} thickness={2.2} finish="gold-copper" />
      <HexNut position={[0, -(d.y / 2 - 1), 0]} radius={r * 0.9} thickness={2.2} finish="gold-copper" />
      <SmaConnector position={[0, d.y / 2 + pull, 0]} rotation={[Math.PI / 2, 0, 0]} facing={1} />
      <SmaConnector position={[0, -(d.y / 2 + pull), 0]} rotation={[-Math.PI / 2, 0, 0]} facing={1} />
    </group>
  )
}

// ---------------------------------------------------------------------------
export function LowpassFilterModel({ explode = 0 }: ModelProps) {
  const d = useDims("lowpass-filter")
  const pull = explode * 10
  return (
    <group>
      <BoxHousing size={[d.x, d.y, d.z]} finish="blue-anodized" radius={1.6} />
      <MountingHoles axis="y" radius={1} depth={1.2} positions={[
        [-d.x / 2 + 3, d.y / 2 - 0.6, -d.z / 2 + 3],
        [d.x / 2 - 3, d.y / 2 - 0.6, -d.z / 2 + 3],
        [-d.x / 2 + 3, d.y / 2 - 0.6, d.z / 2 - 3],
        [d.x / 2 - 3, d.y / 2 - 0.6, d.z / 2 - 3],
      ]} />
      <SmaConnector position={[-(d.x / 2 + pull), 0, 0]} rotation={[0, -Math.PI / 2, 0]} facing={1} />
      <SmaConnector position={[d.x / 2 + pull, 0, 0]} rotation={[0, Math.PI / 2, 0]} facing={1} />
    </group>
  )
}

// ---------------------------------------------------------------------------
export function CirculatorModel({ explode = 0 }: ModelProps) {
  const d = useDims("circulator")
  const r = Math.min(d.x, d.z) * 0.42
  const pull = explode * 12
  const angles = [90, 210, 330].map((deg) => (deg * Math.PI) / 180)
  return (
    <group>
      <CylBody radius={r} length={d.y} finish="blue-anodized" position={[0, 0, 0]} radialSegments={48} axis="y" />
      <mesh position={[0, d.y / 2 + 0.2, 0]}>
        <ringGeometry args={[r * 0.15, r * 0.45, 32]} />
        <meshStandardMaterial color="#00D4FF" emissive="#00D4FF" emissiveIntensity={0.4} side={THREE.DoubleSide} />
      </mesh>
      {angles.map((a, i) => {
        const px = r * Math.cos(a)
        const pz = r * Math.sin(a)
        const rotY = -a + Math.PI / 2
        return <SmaConnector key={i} position={[px + Math.cos(a) * pull, 0, pz + Math.sin(a) * pull]} rotation={[0, rotY, 0]} facing={1} />
      })}
    </group>
  )
}

// ---------------------------------------------------------------------------
export function HemtModel({ explode = 0 }: ModelProps) {
  const d = useDims("hemt")
  const pull = explode * 10
  const chip = useMemo(() => CHIP_SUBSTRATE, [])
  return (
    <group>
      <BoxHousing size={[d.x, d.y, d.z]} finish="gold-copper" radius={1} />
      <mesh material={chip} position={[0, d.y / 2 + 0.3, 0]}>
        <boxGeometry args={[d.x * 0.5, 0.4, d.z * 0.6]} />
      </mesh>
      <MountingHoles axis="y" radius={1} depth={1} positions={[
        [-d.x / 2 + 3, d.y / 2 - 0.5, 0],
        [d.x / 2 - 3, d.y / 2 - 0.5, 0],
      ]} />
      <SmaConnector position={[-(d.x / 2 + pull), 0, 0]} rotation={[0, -Math.PI / 2, 0]} facing={1} />
      <SmaConnector position={[d.x / 2 + pull, 0, 0]} rotation={[0, Math.PI / 2, 0]} facing={1} />
      <NanoD position={[0, d.y / 2 + pull, 0]} rotation={[Math.PI / 2, 0, 0]} pins={9} />
    </group>
  )
}

// ---------------------------------------------------------------------------
export function ThermometerModel({ explode = 0 }: ModelProps) {
  const d = useDims("thermometer")
  return (
    <group>
      <BoxHousing size={[d.x, d.y, d.z]} finish="ceramic" radius={0.8} />
      <SolderWires origin={[-d.x / 4, -d.y / 2, 0]} count={2} />
      <group position={[0, -d.y / 2 - explode * 8, 0]} />
    </group>
  )
}

// ---------------------------------------------------------------------------
export function ConnectorModel({ explode = 0 }: ModelProps) {
  const d = useDims("connector")
  const pull = explode * 8
  const panelMat = useMemo(() => createFinishMaterial("steel"), [])
  return (
    <group>
      <mesh material={panelMat} position={[0, -d.y / 2 + 1.5, 0]}>
        <cylinderGeometry args={[d.x / 2, d.x / 2, 3, 6]} />
      </mesh>
      <SmaConnector position={[0, pull, 0]} rotation={[Math.PI / 2, 0, 0]} facing={1} scale={1.25} />
    </group>
  )
}

// ---------------------------------------------------------------------------
export function BiasTeeModel({ explode = 0 }: ModelProps) {
  const d = useDims("bias-tee")
  const pull = explode * 10
  return (
    <group>
      <BoxHousing size={[d.x, d.y, d.z]} finish="gold-copper" radius={1.4} />
      <BoxHousing size={[d.z * 0.9, d.y * 0.8, d.z * 0.9]} finish="gold-copper" radius={1} position={[0, d.y / 2, 0]} />
      <SmaConnector position={[-(d.x / 2 + pull), 0, 0]} rotation={[0, -Math.PI / 2, 0]} facing={1} />
      <SmaConnector position={[d.x / 2 + pull, 0, 0]} rotation={[0, Math.PI / 2, 0]} facing={1} />
      <NanoD position={[0, d.y + pull, 0]} rotation={[Math.PI / 2, 0, 0]} pins={5} />
    </group>
  )
}

// ---------------------------------------------------------------------------
export function IsolatorModel({ explode = 0 }: ModelProps) {
  const d = useDims("isolator")
  const pull = explode * 10
  return (
    <group>
      <BoxHousing size={[d.x, d.y, d.z]} finish="blue-anodized" radius={2} />
      <mesh position={[0, d.y / 2 + 0.15, 0]}>
        <coneGeometry args={[2.2, 6, 3]} />
        <meshStandardMaterial color="#00D4FF" emissive="#00D4FF" emissiveIntensity={0.5} />
      </mesh>
      <SmaConnector position={[-(d.x / 2 + pull), 0, 0]} rotation={[0, -Math.PI / 2, 0]} facing={1} />
      <SmaConnector position={[d.x / 2 + pull, 0, 0]} rotation={[0, Math.PI / 2, 0]} facing={1} />
    </group>
  )
}

// ---------------------------------------------------------------------------
export function DirectionalCouplerModel({ explode = 0 }: ModelProps) {
  const d = useDims("directional-coupler")
  const pull = explode * 10
  return (
    <group>
      <BoxHousing size={[d.x, d.y, d.z]} finish="blue-anodized" radius={1.6} />
      <SmaConnector position={[-(d.x / 2 + pull), 0, 0]} rotation={[0, -Math.PI / 2, 0]} facing={1} />
      <SmaConnector position={[d.x / 2 + pull, 0, 0]} rotation={[0, Math.PI / 2, 0]} facing={1} />
      <SmaConnector position={[0, 0, d.z / 2 + pull]} rotation={[0, 0, 0]} facing={1} scale={0.85} />
    </group>
  )
}

// ---------------------------------------------------------------------------
export function IrFilterModel({ explode = 0 }: ModelProps) {
  const d = useDims("ir-filter")
  const pull = explode * 10
  const absorber = useMemo(() => DARK_ABSORBER, [])
  return (
    <group>
      <BoxHousing size={[d.x, d.y, d.z]} finish="gold-copper" radius={1.4} />
      <mesh material={absorber} position={[0, 0, 0]}>
        <boxGeometry args={[d.x * 0.6, d.y * 0.6, d.z * 0.5]} />
      </mesh>
      <SmaConnector position={[0, 0, -(d.z / 2 + pull)]} rotation={[0, Math.PI, 0]} facing={1} />
      <SmaConnector position={[0, 0, d.z / 2 + pull]} rotation={[0, 0, 0]} facing={1} />
    </group>
  )
}

// ---------------------------------------------------------------------------
export function ParametricAmpModel({ explode = 0 }: ModelProps) {
  const d = useDims("parametric-amp")
  const pull = explode * 8
  const chip = useMemo(() => CHIP_SUBSTRATE, [])
  return (
    <group>
      <BoxHousing size={[d.x, d.y, d.z]} finish="black-anodized" radius={0.8} />
      <mesh material={chip} position={[0, d.y / 2 + 0.2, 0]}>
        <boxGeometry args={[d.x * 0.7, 0.3, d.z * 0.7]} />
      </mesh>
      {[-1, 0, 1].map((i) => (
        <mesh key={i} material={GOLD_PIN} position={[i * d.x * 0.18, d.y / 2 + 0.45, 0]}>
          <boxGeometry args={[1.2, 0.2, d.z * 0.5]} />
        </mesh>
      ))}
      <SmaConnector position={[-(d.x / 2 + pull), 0, 0]} rotation={[0, -Math.PI / 2, 0]} facing={1} scale={0.8} />
      <SmaConnector position={[d.x / 2 + pull, 0, 0]} rotation={[0, Math.PI / 2, 0]} facing={1} scale={0.8} />
      <SmaConnector position={[0, 0, d.z / 2 + pull]} rotation={[0, 0, 0]} facing={1} scale={0.8} />
    </group>
  )
}

// ---------------------------------------------------------------------------
export function FeedthroughPanelModel({ explode = 0 }: ModelProps) {
  const d = useDims("feedthrough-panel")
  const pull = explode * 20
  const holes = useMemo(() => {
    const arr: [number, number, number][] = []
    const cols = 5
    const rows = 5
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -d.x / 2 + ((c + 1) * d.x) / (cols + 1)
        const z = -d.z / 2 + ((r + 1) * d.z) / (rows + 1)
        arr.push([x, d.y / 2, z])
      }
    }
    return arr
  }, [d])
  return (
    <group>
      <BoxHousing size={[d.x, d.y, d.z]} finish="steel" radius={1.2} />
      <MountingHoles
        axis="y"
        radius={2.4}
        depth={1.5}
        positions={[
          [-d.x / 2 + 8, d.y / 2 - 0.7, -d.z / 2 + 8],
          [d.x / 2 - 8, d.y / 2 - 0.7, -d.z / 2 + 8],
          [-d.x / 2 + 8, d.y / 2 - 0.7, d.z / 2 - 8],
          [d.x / 2 - 8, d.y / 2 - 0.7, d.z / 2 - 8],
        ]}
      />
      {holes.map((p, i) => (
        <SmaConnector key={i} position={[p[0], p[1] + pull * 0.3, p[2]]} rotation={[Math.PI / 2, 0, 0]} facing={1} scale={0.55} />
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
export function DcFilterModel({ explode = 0 }: ModelProps) {
  const d = useDims("dc-filter")
  const pull = explode * 8
  return (
    <group>
      <BoxHousing size={[d.x, d.y, d.z]} finish="black-anodized" radius={1} />
      <NanoD position={[-(d.x / 2 + pull), 0, 0]} rotation={[0, Math.PI / 2, 0]} pins={5} />
      <NanoD position={[d.x / 2 + pull, 0, 0]} rotation={[0, Math.PI / 2, 0]} pins={5} />
    </group>
  )
}

// ---------------------------------------------------------------------------
export function SampleHolderModel({ explode = 0 }: ModelProps) {
  const d = useDims("sample-holder")
  const pull = explode * 10
  return (
    <group>
      <BoxHousing size={[d.x, d.y, d.z]} finish="gold-copper" radius={1.8} />
      <mesh position={[0, d.y / 2 + 0.05, 0]}>
        <boxGeometry args={[d.x * 0.98, 0.1, d.z * 0.98]} />
        <meshStandardMaterial color="#f4c142" metalness={0.9} roughness={0.15} />
      </mesh>
      <MountingHoles axis="y" radius={1.3} depth={1.6} positions={[
        [-d.x / 2 + 4, d.y / 2 - 0.6, -d.z / 2 + 4],
        [d.x / 2 - 4, d.y / 2 - 0.6, -d.z / 2 + 4],
        [-d.x / 2 + 4, d.y / 2 - 0.6, d.z / 2 - 4],
        [d.x / 2 - 4, d.y / 2 - 0.6, d.z / 2 - 4],
      ]} />
      <SmaConnector position={[-(d.x / 2 + pull), 0, 0]} rotation={[0, -Math.PI / 2, 0]} facing={1} scale={0.85} />
      <SmaConnector position={[d.x / 2 + pull, 0, 0]} rotation={[0, Math.PI / 2, 0]} facing={1} scale={0.85} />
      <SmaConnector position={[0, 0, d.z / 2 + pull]} rotation={[0, 0, 0]} facing={1} scale={0.85} />
      <SmaConnector position={[0, 0, -(d.z / 2 + pull)]} rotation={[0, Math.PI, 0]} facing={1} scale={0.85} />
    </group>
  )
}

export const SHAPE_MODELS: Record<string, ComponentType<ModelProps>> = {
  attenuator: AttenuatorModel,
  "lowpass-filter": LowpassFilterModel,
  circulator: CirculatorModel,
  hemt: HemtModel,
  thermometer: ThermometerModel,
  connector: ConnectorModel,
  "bias-tee": BiasTeeModel,
  isolator: IsolatorModel,
  "directional-coupler": DirectionalCouplerModel,
  "ir-filter": IrFilterModel,
  "parametric-amp": ParametricAmpModel,
  "feedthrough-panel": FeedthroughPanelModel,
  "dc-filter": DcFilterModel,
  "sample-holder": SampleHolderModel,
}

export function getShapeModel(shape: string): ComponentType<ModelProps> | undefined {
  return SHAPE_MODELS[shape]
}
