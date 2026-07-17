export type ImageProcessorMode = 'compress' | 'svg' | 'ascii' | 'idPhoto' | 'pixel'

export type ImageOutputFormat = 'image/jpeg' | 'image/png' | 'image/webp'

export type AsciiCharsetKey = 'standard' | 'dense' | 'blocks' | 'binary'

export type IdPhotoBackgroundKey = 'white' | 'blue' | 'red' | 'gray' | 'custom'

export type IdPhotoPresetKey = 'one-inch' | 'two-inch' | 'passport' | 'square' | 'custom'

export type ImageFitMode = 'contain' | 'cover'

export type ManualMaskMark = 0 | 1 | 2

export interface ImageProcessorSettings {
  mode: ImageProcessorMode
  compress: CompressionSettings
  svg: SvgConvertSettings
  ascii: AsciiSettings
  idPhoto: IdPhotoSettings
  pixel: PixelSettings
}

export interface SvgConvertSettings {
  width: number
  height: number
  keepAspectRatio: boolean
  format: ImageOutputFormat
  quality: number
  transparent: boolean
  backgroundColor: string
}

export interface CompressionSettings {
  maxWidth: number
  maxHeight: number
  quality: number
  format: ImageOutputFormat
  keepOriginalSize: boolean
}

export interface AsciiSettings {
  width: number
  charset: AsciiCharsetKey
  invert: boolean
  colored: boolean
  brightness: number
  contrast: number
  fontSize: number
  backgroundColor: string
  foregroundColor: string
}

export interface IdPhotoSettings {
  preset: IdPhotoPresetKey
  width: number
  height: number
  fitMode: ImageFitMode
  background: IdPhotoBackgroundKey
  customColor: string
  tolerance: number
  feather: number
  brushSize: number
  brushMode: 'background' | 'foreground'
}

export interface PixelSettings {
  blockSize: number
  paletteSize: number
  dither: boolean
  edgeBoost: boolean
  format: ImageOutputFormat
}

export interface ImageFileItem {
  id: string
  file: File
  name: string
  size: number
  type: string
  width: number
  height: number
  objectUrl: string
  lastModified: number
  status: 'ready' | 'error'
  message: string
}

export interface ImageProcessorResult {
  id: string
  sourceId: string
  sourceName: string
  mode: ImageProcessorMode
  outputName: string
  width: number
  height: number
  size: number
  mimeType: string
  blob: Blob
  blobUrl: string
  durationMs: number
  summary: string
  warnings: string[]
  compressionRatio?: number
  asciiText?: string
  asciiHtml?: string
}

export interface ImagePixelBuffer {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface AsciiBuildResult {
  text: string
  html: string
  columns: number
  rows: number
  warnings: string[]
}

export interface BackgroundReplaceResult {
  pixels: ImagePixelBuffer
  backgroundPixels: number
  forcedBackgroundPixels: number
  forcedForegroundPixels: number
  warnings: string[]
}

export interface PixelateResult {
  pixels: ImagePixelBuffer
  blockSize: number
  paletteSize: number
  warnings: string[]
}

export interface ImageWorkerRequestBase {
  id: number
  width: number
  height: number
  imageData: ImageData
}

export interface ImageAsciiWorkerRequest extends ImageWorkerRequestBase {
  mode: 'ascii'
  settings: AsciiSettings
}

export interface ImageIdPhotoWorkerRequest extends ImageWorkerRequestBase {
  mode: 'idPhoto'
  settings: IdPhotoSettings
  manualMask?: Uint8Array
}

export interface ImagePixelWorkerRequest extends ImageWorkerRequestBase {
  mode: 'pixel'
  settings: PixelSettings
}

export type ImageWorkerRequest =
  | ImageAsciiWorkerRequest
  | ImageIdPhotoWorkerRequest
  | ImagePixelWorkerRequest

export interface ImageWorkerPayload {
  width: number
  height: number
  imageData?: ImageData
  asciiText?: string
  asciiHtml?: string
  backgroundPixels?: number
  forcedBackgroundPixels?: number
  forcedForegroundPixels?: number
  warnings: string[]
  durationMs: number
}

export interface ImageWorkerSuccessResponse {
  id: number
  ok: true
  result: ImageWorkerPayload
}

export interface ImageWorkerErrorResponse {
  id: number
  ok: false
  error: string
}

export type ImageWorkerResponse = ImageWorkerSuccessResponse | ImageWorkerErrorResponse

export interface ImageExportPayload {
  content: string | Blob
  filename: string
  mimeType: string
}
