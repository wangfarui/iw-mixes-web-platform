import assert from 'node:assert/strict'
import { File } from 'node:buffer'
import { webcrypto } from 'node:crypto'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true
})

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/encoding-converter-tests')

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

const bundleModule = async (entry, outfileName) => {
  const outfile = path.join(tempDir, outfileName)
  await build({
    entryPoints: [path.join(root, entry)],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    logLevel: 'silent',
    alias: {
      '@': path.join(root, 'src')
    }
  })
  return import(pathToFileURL(outfile).href)
}

const config = await bundleModule('src/utils/encodingConverter/config.ts', 'config.mjs')
const converters = await bundleModule('src/utils/encodingConverter/converters.ts', 'converters.mjs')
const detectors = await bundleModule('src/utils/encodingConverter/detectors.ts', 'detectors.mjs')
const exporters = await bundleModule('src/utils/encodingConverter/exporters.ts', 'exporters.mjs')
const files = await bundleModule('src/utils/encodingConverter/files.ts', 'files.mjs')

const defaults = config.createDefaultEncodingSettings()

const urlDecoded = await converters.convertEncodingText('%E4%B8%AD%E6%96%87%20A', {
  ...defaults,
  operation: 'url-decode'
})
assert.equal(urlDecoded.output, '中文 A')

const urlPlusDecoded = await converters.convertEncodingText('name=%E5%BC%A0+%E4%B8%89', {
  ...defaults,
  operation: 'url-decode',
  urlSpaceMode: 'plus'
})
assert.equal(urlPlusDecoded.output, 'name=张 三')

const urlLayers = await converters.convertEncodingText('%25E4%25B8%25AD%25E6%2596%2587', {
  ...defaults,
  operation: 'url-decode-layers',
  urlDecodeLayers: 3
})
assert.equal(urlLayers.output, '中文')

const base64 = await converters.convertEncodingText('中文', {
  ...defaults,
  category: 'base64',
  operation: 'base64-encode'
})
assert.equal(base64.output, '5Lit5paH')

const base64Decoded = await converters.convertEncodingText(base64.output, {
  ...defaults,
  category: 'base64',
  operation: 'base64-decode'
})
assert.equal(base64Decoded.output, '中文')

const base64Url = await converters.convertEncodingText('{"alg":"HS256"}', {
  ...defaults,
  category: 'base64',
  operation: 'base64url-encode'
})
assert.equal(base64Url.output, 'eyJhbGciOiJIUzI1NiJ9')

const unicodeEscaped = await converters.convertEncodingText('中A', {
  ...defaults,
  category: 'unicode',
  operation: 'unicode-escape'
})
assert.equal(unicodeEscaped.output, '\\u4e2d\\u0041')

const unicodeUnescaped = await converters.convertEncodingText('\\u4e2d\\u6587\\x21', {
  ...defaults,
  category: 'unicode',
  operation: 'unicode-unescape'
})
assert.equal(unicodeUnescaped.output, '中文!')

const jsonUnescaped = await converters.convertEncodingText('a\\n\\"b\\"', {
  ...defaults,
  category: 'unicode',
  operation: 'json-unescape'
})
assert.equal(jsonUnescaped.output, 'a\n"b"')

const htmlDecoded = await converters.convertEncodingText('&lt;span&gt;&#x4e2d;&amp;&#20013;&lt;/span&gt;', {
  ...defaults,
  category: 'html',
  operation: 'html-decode'
})
assert.equal(htmlDecoded.output, '<span>中&中</span>')

const hex = await converters.convertEncodingText('中', {
  ...defaults,
  category: 'bytes',
  operation: 'text-to-hex'
})
assert.equal(hex.output, 'e4 b8 ad')

const hexText = await converters.convertEncodingText('e4 b8 ad', {
  ...defaults,
  category: 'bytes',
  operation: 'hex-to-text'
})
assert.equal(hexText.output, '中')

const md5 = await converters.convertEncodingText('abc', {
  ...defaults,
  category: 'hash',
  operation: 'hash',
  hashAlgorithm: 'md5'
})
assert.equal(md5.output, '900150983cd24fb0d6963f7d28e17f72')

const sha256 = await converters.convertEncodingText('abc', {
  ...defaults,
  category: 'hash',
  operation: 'hash',
  hashAlgorithm: 'sha-256'
})
assert.equal(sha256.output, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')

const hints = detectors.detectEncodingHints('%25E4%25B8%25AD')
assert.ok(hints.some((hint) => hint.operation === 'url-decode-layers'))

const b64Hints = detectors.detectEncodingHints('5Lit5paH')
assert.ok(b64Hints.some((hint) => hint.operation === 'base64-decode'))

const exportPayload = exporters.buildEncodingExport(md5, 'json', 'abc')
assert.equal(exportPayload.extension, 'json')
assert.match(exportPayload.content, /900150983cd24fb0d6963f7d28e17f72/)

const textFile = new File(['%E4%B8%AD'], 'sample.txt', { type: 'text/plain' })
const fileResult = await files.readEncodingTextFile(textFile)
assert.equal(fileResult.text, '%E4%B8%AD')
assert.equal(fileResult.info.name, 'sample.txt')
await assert.rejects(
  () => files.readEncodingTextFile(new File(['nope'], 'image.png', { type: 'image/png' })),
  /仅支持常见文本/
)

console.log('encoding converter tests passed')
