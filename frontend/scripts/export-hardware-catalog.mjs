import { readFile, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import vm from "node:vm"

const ts = createRequire(import.meta.url)("typescript")
const source = await readFile(new URL("../lib/hardware/components.ts", import.meta.url), "utf8")
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const module = { exports: {} }
vm.runInNewContext(compiled, { module, exports: module.exports })
const catalog = Object.fromEntries(module.exports.COMPONENTS.map((component) => [component.id,
  Object.fromEntries(component.ports.map((port) => [port.id, { multiple: Boolean(port.allowMultipleConnections) }]))]))
const target = new URL("../../backend/app/modules/parties/hardware_catalog.json", import.meta.url)
const serialized = `${JSON.stringify(catalog, null, 2)}\n`
if (process.argv.includes("--check")) {
  if (await readFile(target, "utf8") !== serialized) throw new Error("Hardware catalog is out of sync; run pnpm hardware:export")
} else await writeFile(target, serialized)
