import type {
  AsciiCharsetKey,
  CompressionSettings,
  IdPhotoBackgroundKey,
  IdPhotoPresetKey,
  ImageOutputFormat,
  ImageProcessorMode,
  ImageProcessorSettings
} from '@/types/imageProcessor'

export const IMAGE_PROCESSOR_LIMITS = {
  maxImageBytes: 24 * 1024 * 1024,
  maxBatchFiles: 20,
  autoMaxPixels: 2_500_000,
  workerMaxPixels: 5_000_000,
  workerMaxDimension: 1800,
  asciiMaxWidth: 180,
  previewMaxDimension: 1600
} as const

export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif'

export const IMAGE_FILE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])

export const MODE_LABELS: Record<ImageProcessorMode, string> = {
  compress: '图片压缩',
  ascii: '图片转 ASCII',
  idPhoto: '证件照换底色',
  pixel: '像素风生成'
}

export const FORMAT_LABELS: Record<ImageOutputFormat, string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP'
}

export const FORMAT_EXTENSIONS: Record<ImageOutputFormat, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
}

export const ASCII_CHARSETS: Record<AsciiCharsetKey, string> = {
  standard: '@%#*+=-:. ',
  dense: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
  blocks: '█▓▒░ ',
  binary: '10'
}

export const ASCII_CHARSET_LABELS: Record<AsciiCharsetKey, string> = {
  standard: '标准',
  dense: '高密度',
  blocks: '方块',
  binary: '二值'
}

export const ID_PHOTO_BACKGROUNDS: Record<IdPhotoBackgroundKey, { label: string; color: string }> = {
  white: {
    label: '白底',
    color: '#ffffff'
  },
  blue: {
    label: '蓝底',
    color: '#438edb'
  },
  red: {
    label: '红底',
    color: '#d8292f'
  },
  gray: {
    label: '灰底',
    color: '#d9dee8'
  },
  custom: {
    label: '自定义',
    color: '#438edb'
  }
}

export const ID_PHOTO_PRESETS: Record<IdPhotoPresetKey, { label: string; width: number; height: number }> = {
  'one-inch': {
    label: '一寸 295x413',
    width: 295,
    height: 413
  },
  'two-inch': {
    label: '二寸 413x579',
    width: 413,
    height: 579
  },
  passport: {
    label: '护照 390x567',
    width: 390,
    height: 567
  },
  square: {
    label: '方形 600x600',
    width: 600,
    height: 600
  },
  custom: {
    label: '自定义',
    width: 295,
    height: 413
  }
}

export const createDefaultCompressionSettings = (): CompressionSettings => ({
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.82,
  format: 'image/jpeg',
  keepOriginalSize: false
})

export const createDefaultImageSettings = (): ImageProcessorSettings => ({
  mode: 'compress',
  compress: createDefaultCompressionSettings(),
  ascii: {
    width: 96,
    charset: 'standard',
    invert: false,
    colored: false,
    brightness: 0,
    contrast: 0,
    fontSize: 8,
    backgroundColor: '#ffffff',
    foregroundColor: '#111827'
  },
  idPhoto: {
    preset: 'one-inch',
    width: ID_PHOTO_PRESETS['one-inch'].width,
    height: ID_PHOTO_PRESETS['one-inch'].height,
    fitMode: 'cover',
    background: 'blue',
    customColor: ID_PHOTO_BACKGROUNDS.blue.color,
    tolerance: 42,
    feather: 2,
    brushSize: 16,
    brushMode: 'background'
  },
  pixel: {
    blockSize: 10,
    paletteSize: 16,
    dither: true,
    edgeBoost: true,
    format: 'image/png'
  }
})

export const getIdPhotoBackgroundColor = (background: IdPhotoBackgroundKey, customColor: string) => {
  return background === 'custom' ? customColor : ID_PHOTO_BACKGROUNDS[background].color
}
