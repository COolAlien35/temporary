import { readFile, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import vm from "node:vm"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(scriptDir, "..")
const repoDir = path.resolve(frontendDir, "..")
const outputPath = path.join(repoDir, "content", "curriculum.json")
const require = createRequire(import.meta.url)
const ts = require("typescript")

async function loadTypeScriptModule(relativePath) {
  const source = await readFile(path.join(frontendDir, relativePath), "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: relativePath,
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, { exports: module.exports, module, require: () => { throw new Error("Unexpected runtime import") } })
  return module.exports
}

const [unitModule, questionModule, glossaryModule] = await Promise.all([
  loadTypeScriptModule("lib/curriculum/units.ts"),
  loadTypeScriptModule("lib/curriculum/questions.ts"),
  loadTypeScriptModule("lib/curriculum/glossary.ts"),
])

const placeholderUnitIds = new Set(["u4", "u5", "u6", "u7", "u8"])
const curriculum = {
  schema_version: 1,
  content_version: 1,
  units: unitModule.units.map((unit) => ({
    ...unit,
    is_placeholder: placeholderUnitIds.has(unit.id),
    review_status: "pending",
  })),
  questions_by_unit: questionModule.questionsByUnit,
  glossary: glossaryModule.glossary,
}
const serialized = `${JSON.stringify(curriculum, null, 2)}\n`

if (process.argv.includes("--check")) {
  let current
  try {
    current = await readFile(outputPath, "utf8")
  } catch {
    console.error(`Missing ${path.relative(repoDir, outputPath)}; run pnpm curriculum:export`)
    process.exitCode = 1
  }
  if (current !== undefined && current !== serialized) {
    console.error(`${path.relative(repoDir, outputPath)} is out of sync; run pnpm curriculum:export`)
    process.exitCode = 1
  }
} else {
  const { mkdir } = await import("node:fs/promises")
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, serialized)
  console.log(`Wrote ${path.relative(repoDir, outputPath)}`)
}
