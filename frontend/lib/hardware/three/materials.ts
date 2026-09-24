// Shared PBR material factories for the Hardware Studio 3D models.
// 1 scene unit = 1 mm everywhere these are used.
import * as THREE from "three"

export type FinishId = "steel" | "gold-copper" | "black-anodized" | "blue-anodized" | "brass" | "ptfe" | "ceramic"

/** Returns a fresh MeshStandardMaterial/MeshPhysicalMaterial for the given finish. Call once per mesh (or memoize). */
export function createFinishMaterial(finish: FinishId): THREE.Material {
  switch (finish) {
    case "steel":
      return new THREE.MeshStandardMaterial({ color: "#c7ccd1", metalness: 0.9, roughness: 0.32, envMapIntensity: 1 })
    case "gold-copper":
      return new THREE.MeshStandardMaterial({ color: "#d9a24b", metalness: 0.95, roughness: 0.28, envMapIntensity: 1.1 })
    case "black-anodized":
      return new THREE.MeshStandardMaterial({ color: "#14161a", metalness: 0.6, roughness: 0.55, envMapIntensity: 0.8 })
    case "blue-anodized":
      return new THREE.MeshStandardMaterial({ color: "#1c3a5e", metalness: 0.7, roughness: 0.38, envMapIntensity: 1 })
    case "brass":
      return new THREE.MeshStandardMaterial({ color: "#c9a25a", metalness: 0.85, roughness: 0.35 })
    case "ptfe":
      return new THREE.MeshStandardMaterial({ color: "#f2efe9", metalness: 0, roughness: 0.7 })
    case "ceramic":
      return new THREE.MeshPhysicalMaterial({ color: "#e8e4da", metalness: 0.05, roughness: 0.25, clearcoat: 0.4, clearcoatRoughness: 0.3 })
    default:
      return new THREE.MeshStandardMaterial({ color: "#888888", metalness: 0.5, roughness: 0.5 })
  }
}

export const GOLD_PIN = new THREE.MeshStandardMaterial({ color: "#f4c142", metalness: 1, roughness: 0.2 })
export const COPPER_WIRE = new THREE.MeshStandardMaterial({ color: "#b06a3a", metalness: 0.8, roughness: 0.4 })
export const DARK_ABSORBER = new THREE.MeshStandardMaterial({ color: "#0a0a0a", metalness: 0, roughness: 0.95 })
export const KNURL_ACCENT = new THREE.MeshStandardMaterial({ color: "#9aa0a6", metalness: 0.9, roughness: 0.45 })
export const CHIP_SUBSTRATE = new THREE.MeshStandardMaterial({ color: "#2b2f38", metalness: 0.1, roughness: 0.6 })
