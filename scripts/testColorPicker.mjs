import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/color-picker-tests')

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
    target: 'es2020',
    logLevel: 'silent',
    alias: {
      '@': path.join(root, 'src')
    }
  })
  return import(pathToFileURL(outfile).href)
}

const color = await bundleModule('src/utils/color-picker/color.ts', 'color.mjs')
const exporters = await bundleModule('src/utils/color-picker/exporters.ts', 'exporters.mjs')

const blue = color.parseColorInput('#1677ff')
assert.equal(blue.sourceFormat, 'hex')
assert.deepEqual(blue.color, { r: 22, g: 119, b: 255, a: 1 })
assert.equal(color.rgbaToHex(blue.color), '#1677FF')
assert.equal(color.rgbaToHexAlpha(blue.color), '#1677FFFF')
assert.equal(color.formatRgb(blue.color), 'rgb(22, 119, 255)')
assert.equal(color.formatRgba(blue.color), 'rgba(22, 119, 255, 1)')

const shortAlpha = color.parseColorInput('#0f08')
assert.deepEqual(shortAlpha.color, { r: 0, g: 255, b: 0, a: 0.533 })
assert.equal(color.rgbaToHexAlpha(shortAlpha.color), '#00FF0088')

const rgba = color.parseColorInput('rgba(255, 128, 0, 0.5)')
assert.deepEqual(rgba.color, { r: 255, g: 128, b: 0, a: 0.5 })
assert.equal(color.rgbaToHex(rgba.color), '#FF8000')

const spaceRgb = color.parseColorInput('rgb(100% 50% 0% / 25%)')
assert.deepEqual(spaceRgb.color, { r: 255, g: 128, b: 0, a: 0.25 })

const hsl = color.parseColorInput('hsl(210, 100%, 54%)')
assert.equal(color.rgbaToHex(hsl.color), '#148AFF')
assert.match(color.formatHsl(hsl.color), /^hsl\(210, 100%, 53\.9%\)$/)

const hslRoundTrip = color.hslToRgba(color.rgbaToHsl({ r: 24, g: 120, b: 216, a: 0.7 }))
assert.deepEqual(hslRoundTrip, { r: 24, g: 120, b: 216, a: 0.7 })

assert.equal(color.formatHsv({ r: 255, g: 128, b: 0, a: 1 }), 'hsv(30, 100%, 100%)')
assert.equal(color.formatCmyk({ r: 255, g: 128, b: 0, a: 1 }), 'cmyk(0%, 49.8%, 100%, 0%)')

const contrast = color.getColorContrast({ r: 22, g: 119, b: 255, a: 1 })
assert.equal(contrast.recommendedTextColor, '#000000')
assert.ok(contrast.largeTextPassesAA)

const formats = color.buildColorFormats(blue.color)
assert.equal(formats.find((item) => item.key === 'hex')?.value, '#1677FF')
assert.equal(formats.find((item) => item.key === 'rgba')?.value, 'rgba(22, 119, 255, 1)')

const snippets = color.buildCssSnippets(blue.color, 'iw-color-primary')
assert.equal(snippets.find((item) => item.key === 'variable')?.value, '--iw-color-primary: #1677FF;')

assert.throws(() => color.parseColorInput('not-a-color'), /无法识别颜色值/)

const snapshot = {
  color: blue.color,
  formats,
  cssSnippets: snippets,
  contrast,
  pickedPixel: {
    x: 10,
    y: 20,
    width: 100,
    height: 80,
    color: blue.color
  },
  generatedAt: '2026-07-01T00:00:00.000Z'
}

const textExport = exporters.buildColorExport(snapshot, 'txt')
assert.equal(textExport.extension, 'txt')
assert.match(textExport.content, /x 10px \/ y 20px/)

const jsonExport = exporters.buildColorExport(snapshot, 'json')
assert.equal(JSON.parse(jsonExport.content).formats[0].value, '#1677FF')

console.log('color picker tests passed')
