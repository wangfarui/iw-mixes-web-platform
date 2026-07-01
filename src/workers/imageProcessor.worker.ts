import type {
  ImagePixelBuffer,
  ImageWorkerRequest,
  ImageWorkerResponse
} from '@/types/imageProcessor'
import { buildAsciiFromPixels } from '@/utils/image-processor/ascii'
import { replaceBackgroundPixels } from '@/utils/image-processor/background'
import { pixelatePixels } from '@/utils/image-processor/pixel'

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<ImageWorkerRequest>) => void) | null
  postMessage: (message: ImageWorkerResponse, transfer?: Transferable[]) => void
}

const toPixelBuffer = (imageData: ImageData): ImagePixelBuffer => ({
  width: imageData.width,
  height: imageData.height,
  data: imageData.data
})

ctx.onmessage = (event: MessageEvent<ImageWorkerRequest>) => {
  const request = event.data
  const startedAt = performance.now()

  try {
    if (request.mode === 'ascii') {
      const ascii = buildAsciiFromPixels(toPixelBuffer(request.imageData), request.settings)
      const response: ImageWorkerResponse = {
        id: request.id,
        ok: true,
        result: {
          width: ascii.columns,
          height: ascii.rows,
          asciiText: ascii.text,
          asciiHtml: ascii.html,
          warnings: ascii.warnings,
          durationMs: Math.round(performance.now() - startedAt)
        }
      }
      ctx.postMessage(response)
      return
    }

    if (request.mode === 'idPhoto') {
      const replaced = replaceBackgroundPixels(toPixelBuffer(request.imageData), request.settings, request.manualMask)
      const output = new ImageData(replaced.pixels.data, replaced.pixels.width, replaced.pixels.height)
      const response: ImageWorkerResponse = {
        id: request.id,
        ok: true,
        result: {
          width: output.width,
          height: output.height,
          imageData: output,
          backgroundPixels: replaced.backgroundPixels,
          forcedBackgroundPixels: replaced.forcedBackgroundPixels,
          forcedForegroundPixels: replaced.forcedForegroundPixels,
          warnings: replaced.warnings,
          durationMs: Math.round(performance.now() - startedAt)
        }
      }
      ctx.postMessage(response, [output.data.buffer])
      return
    }

    const pixelated = pixelatePixels(toPixelBuffer(request.imageData), request.settings)
    const output = new ImageData(pixelated.pixels.data, pixelated.pixels.width, pixelated.pixels.height)
    const response: ImageWorkerResponse = {
      id: request.id,
      ok: true,
      result: {
        width: output.width,
        height: output.height,
        imageData: output,
        warnings: pixelated.warnings,
        durationMs: Math.round(performance.now() - startedAt)
      }
    }
    ctx.postMessage(response, [output.data.buffer])
  } catch (error: any) {
    const response: ImageWorkerResponse = {
      id: request.id,
      ok: false,
      error: error?.message || '图片处理失败'
    }
    ctx.postMessage(response)
  }
}
