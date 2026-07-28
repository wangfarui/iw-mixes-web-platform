import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { webcrypto } from 'node:crypto'
import { build } from 'esbuild'

globalThis.crypto = webcrypto

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/remote-share-tests')

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

await build({
  entryPoints: [path.join(root, 'src/utils/remote-share/remoteShareProtocol.ts')],
  outfile: path.join(tempDir, 'protocol.mjs'),
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  logLevel: 'silent'
})

const protocol = await import(pathToFileURL(path.join(tempDir, 'protocol.mjs')).href)
const secret = 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY'

assert.equal(protocol.readSessionSecret('#s=' + secret), secret)
assert.equal(protocol.readSessionSecret('#s=too-short'), null)
assert.equal(protocol.shareLink('https://web.itwray.com', secret), `https://web.itwray.com/tools/remote-share#s=${secret}`)

const material = await protocol.deriveSessionMaterial(secret)
assert.match(material.roomId, /^[A-Za-z0-9_-]{43}$/)
assert.match(material.accessToken, /^[A-Za-z0-9_-]{43}$/)
assert.notEqual(material.roomId, material.accessToken)

const encrypted = await protocol.encryptText(material.contentKey, '同一 Wi-Fi 下也保持端到端加密')
assert.notEqual(encrypted, '同一 Wi-Fi 下也保持端到端加密')
assert.equal(await protocol.decryptText(material.contentKey, encrypted), '同一 Wi-Fi 下也保持端到端加密')
await assert.rejects(() => protocol.decryptText(material.contentKey, encrypted.slice(0, -2) + 'xx'))

console.log('remote share protocol tests passed')
