import type {
  ImagePixelBuffer,
  PixelSettings,
  PixelateResult
} from '@/types/imageProcessor'

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
] as const

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

export const normalizeBlockSize = (blockSize: number) => {
  if (!Number.isFinite(blockSize)) {
    return 10
  }
  return Math.max(2, Math.min(64, Math.round(blockSize)))
}

export const normalizePaletteSize = (paletteSize: number) => {
  if (!Number.isFinite(paletteSize)) {
    return 16
  }
  return Math.max(2, Math.min(64, Math.round(paletteSize)))
}

export const quantizeColor = (
  red: number,
  green: number,
  blue: number,
  paletteSize: number,
  ditherOffset = 0
) => {
  const levels = Math.max(2, Math.round(Math.cbrt(normalizePaletteSize(paletteSize))))
  const step = 255 / (levels - 1)
  return {
    red: clampByte(Math.round((red + ditherOffset) / step) * step),
    green: clampByte(Math.round((green + ditherOffset) / step) * step),
    blue: clampByte(Math.round((blue + ditherOffset) / step) * step)
  }
}

const averageBlock = (
  pixels: ImagePixelBuffer,
  startX: number,
  startY: number,
  endX: number,
  endY: number
) => {
  let red = 0
  let green = 0
  let blue = 0
  let alpha = 0
  let count = 0

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const offset = (y * pixels.width + x) * 4
      red += pixels.data[offset]
      green += pixels.data[offset + 1]
      blue += pixels.data[offset + 2]
      alpha += pixels.data[offset + 3]
      count += 1
    }
  }

  if (!count) {
    return {
      red: 0,
      green: 0,
      blue: 0,
      alpha: 255
    }
  }

  return {
    red: red / count,
    green: green / count,
    blue: blue / count,
    alpha: alpha / count
  }
}

const boostChannel = (value: number) => {
  return clampByte((value - 128) * 1.16 + 128)
}

export const pixelatePixels = (
  pixels: ImagePixelBuffer,
  settings: PixelSettings
): PixelateResult => {
  const blockSize = normalizeBlockSize(settings.blockSize)
  const paletteSize = normalizePaletteSize(settings.paletteSize)
  const output = new Uint8ClampedArray(pixels.data.length)
  const warnings: string[] = []

  if (blockSize < settings.blockSize) {
    warnings.push('像素块大小已限制在 64 以内，避免结果过粗。')
  }

  for (let startY = 0; startY < pixels.height; startY += blockSize) {
    const endY = Math.min(pixels.height, startY + blockSize)
    for (let startX = 0; startX < pixels.width; startX += blockSize) {
      const endX = Math.min(pixels.width, startX + blockSize)
      const average = averageBlock(pixels, startX, startY, endX, endY)

      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          const offset = (y * pixels.width + x) * 4
          const ditherOffset = settings.dither ? (BAYER_4[y % 4][x % 4] - 7.5) * 3 : 0
          const sourceRed = settings.edgeBoost ? boostChannel(average.red) : average.red
          const sourceGreen = settings.edgeBoost ? boostChannel(average.green) : average.green
          const sourceBlue = settings.edgeBoost ? boostChannel(average.blue) : average.blue
          const color = quantizeColor(sourceRed, sourceGreen, sourceBlue, paletteSize, ditherOffset)

          output[offset] = color.red
          output[offset + 1] = color.green
          output[offset + 2] = color.blue
          output[offset + 3] = clampByte(average.alpha)
        }
      }
    }
  }

  return {
    pixels: {
      width: pixels.width,
      height: pixels.height,
      data: output
    },
    blockSize,
    paletteSize,
    warnings
  }
}
