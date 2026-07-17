import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/image-processor-tests')

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

const config = await bundleModule('src/utils/image-processor/config.ts', 'config.mjs')
const ascii = await bundleModule('src/utils/image-processor/ascii.ts', 'ascii.mjs')
const pixel = await bundleModule('src/utils/image-processor/pixel.ts', 'pixel.mjs')
const background = await bundleModule('src/utils/image-processor/background.ts', 'background.mjs')
const files = await bundleModule('src/utils/image-processor/files.ts', 'files.mjs')
const svg = await bundleModule('src/utils/image-processor/svg.ts', 'svg.mjs')

const defaults = config.createDefaultImageSettings()

const smallPixels = {
  width: 2,
  height: 1,
  data: new Uint8ClampedArray([
    0, 0, 0, 255,
    255, 255, 255, 255
  ])
}

const asciiResult = ascii.buildAsciiFromPixels(smallPixels, {
  ...defaults.ascii,
  width: 2,
  charset: 'standard'
})
assert.equal(asciiResult.rows, 2)
assert.equal(asciiResult.columns, 8)
assert.equal(asciiResult.text.split('\n').length, 2)
assert.equal(asciiResult.text[0], '@')
assert.equal(asciiResult.text.split('\n')[0][7], ' ')

const contained = files.calculateContainSize(4000, 2000, 1000, 1000, false)
assert.deepEqual(contained, {
  width: 1000,
  height: 500,
  scale: 0.25
})

const kept = files.calculateContainSize(4000, 2000, 1000, 1000, true)
assert.equal(kept.width, 4000)
assert.equal(kept.height, 2000)

assert.match(config.IMAGE_ACCEPT, /image\/svg\+xml/)
assert.equal(Math.round(svg.parseSvgLength('2.54cm')), 96)
assert.deepEqual(svg.resolveSvgDimensions(null, null, '0 0 640 360'), {
  width: 640,
  height: 360
})
assert.deepEqual(svg.resolveSvgDimensions('320', null, '0 0 640 360'), {
  width: 320,
  height: 180
})
assert.deepEqual(svg.resolveSvgDimensions(null, null, '0 0 0.4 0.4'), {
  width: 1,
  height: 1
})
assert.equal(svg.isSafeSvgReference('#local-gradient'), true)
assert.equal(svg.isSafeSvgReference('data:image/png;base64,AAAA'), true)
assert.equal(svg.isSafeSvgReference('https://example.com/tracker.png'), false)

const pixelSource = {
  width: 4,
  height: 4,
  data: new Uint8ClampedArray(4 * 4 * 4)
}
for (let index = 0; index < pixelSource.data.length; index += 4) {
  pixelSource.data[index] = 120
  pixelSource.data[index + 1] = 180
  pixelSource.data[index + 2] = 220
  pixelSource.data[index + 3] = 255
}
const pixelated = pixel.pixelatePixels(pixelSource, {
  ...defaults.pixel,
  blockSize: 2,
  paletteSize: 8,
  dither: false,
  edgeBoost: false
})
assert.equal(pixelated.pixels.width, 4)
assert.equal(pixelated.pixels.height, 4)
assert.equal(pixelated.pixels.data.length, pixelSource.data.length)
assert.equal(pixelated.blockSize, 2)

const idPixels = {
  width: 3,
  height: 3,
  data: new Uint8ClampedArray([
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255
  ])
}
const replaced = background.replaceBackgroundPixels(idPixels, {
  ...defaults.idPhoto,
  background: 'blue',
  tolerance: 12,
  feather: 0
})
assert.equal(replaced.backgroundPixels, 8)
assert.equal(replaced.pixels.data[0], 67)
assert.equal(replaced.pixels.data[1], 142)
assert.equal(replaced.pixels.data[2], 219)
const centerOffset = (1 * 3 + 1) * 4
assert.equal(replaced.pixels.data[centerOffset], 0)
assert.equal(replaced.pixels.data[centerOffset + 1], 0)
assert.equal(replaced.pixels.data[centerOffset + 2], 0)

assert.deepEqual(background.parseHexColor('#abc'), {
  red: 170,
  green: 187,
  blue: 204
})

console.log('image processor tests passed')
