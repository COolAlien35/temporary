import { cpSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Use the same entry point as Docker. Next omits these assets from standalone output.
const port = Number(process.argv[2] ?? 3100)
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('Test server port must be an integer from 1024 to 65535')
}
const standalone = resolve('.next/standalone')
if (!existsSync(`${standalone}/server.js`)) {
  throw new Error('Run pnpm build before starting the production test server')
}
cpSync('.next/static', `${standalone}/.next/static`, { recursive: true })
if (existsSync('public')) cpSync('public', `${standalone}/public`, { recursive: true })
process.env.PORT = String(port)
process.env.HOSTNAME = '127.0.0.1'
await import(pathToFileURL(`${standalone}/server.js`).href)
