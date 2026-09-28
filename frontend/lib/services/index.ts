import { demoPlatform } from "./demo-platform"
import type { PlatformServices } from "./contracts"

/** Current browser-facing service. Swap this binding when a supported API is deployed. */
export const platformServices: PlatformServices = demoPlatform
