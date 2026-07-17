const SVG_DEFAULT_WIDTH = 300
const SVG_DEFAULT_HEIGHT = 150
const SAFE_DATA_IMAGE_PATTERN = /^data:image\/(?:png|jpeg|jpg|gif|webp);/i
const URL_PATTERN = /url\(\s*(['"]?)(.*?)\1\s*\)/gi
const UNSAFE_ELEMENTS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
  'animate',
  'animatemotion',
  'animatetransform',
  'set',
  'discard'
])

export interface SvgDimensions {
  width: number
  height: number
}

export interface SvgReadResult extends SvgDimensions {
  blob: Blob
  sanitized: boolean
}

export const isSvgImageFile = (file: { name: string; type: string }) => {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
}

export const parseSvgLength = (value: string | null) => {
  if (!value) {
    return null
  }

  const match = value.trim().match(/^([+]?(?:\d+\.?\d*|\.\d+))(px|in|cm|mm|q|pt|pc)?$/i)
  if (!match) {
    return null
  }

  const amount = Number(match[1])
  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }

  const unit = (match[2] || 'px').toLowerCase()
  const pixelsPerUnit: Record<string, number> = {
    px: 1,
    in: 96,
    cm: 96 / 2.54,
    mm: 96 / 25.4,
    q: 96 / 101.6,
    pt: 96 / 72,
    pc: 16
  }
  return amount * pixelsPerUnit[unit]
}

export const resolveSvgDimensions = (
  widthValue: string | null,
  heightValue: string | null,
  viewBoxValue: string | null
): SvgDimensions => {
  const toDimension = (value: number) => Math.max(1, Math.round(value))
  const width = parseSvgLength(widthValue)
  const height = parseSvgLength(heightValue)
  const viewBox = (viewBoxValue || '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  const viewBoxWidth = viewBox.length === 4 && Number.isFinite(viewBox[2]) && viewBox[2] > 0 ? viewBox[2] : null
  const viewBoxHeight = viewBox.length === 4 && Number.isFinite(viewBox[3]) && viewBox[3] > 0 ? viewBox[3] : null

  if (width && height) {
    return { width: toDimension(width), height: toDimension(height) }
  }
  if (width && viewBoxWidth && viewBoxHeight) {
    return { width: toDimension(width), height: toDimension(width * viewBoxHeight / viewBoxWidth) }
  }
  if (height && viewBoxWidth && viewBoxHeight) {
    return { width: toDimension(height * viewBoxWidth / viewBoxHeight), height: toDimension(height) }
  }
  if (viewBoxWidth && viewBoxHeight) {
    return { width: toDimension(viewBoxWidth), height: toDimension(viewBoxHeight) }
  }
  return {
    width: width ? toDimension(width) : SVG_DEFAULT_WIDTH,
    height: height ? toDimension(height) : SVG_DEFAULT_HEIGHT
  }
}

export const isSafeSvgReference = (value: string) => {
  const reference = value.trim()
  return !reference || reference.startsWith('#') || SAFE_DATA_IMAGE_PATTERN.test(reference)
}

const containsUnsafeCssReference = (css: string) => {
  if (/@import\b/i.test(css)) {
    return true
  }
  URL_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = URL_PATTERN.exec(css))) {
    if (!isSafeSvgReference(match[2])) {
      return true
    }
  }
  return false
}

export const sanitizeSvgText = (source: string): SvgReadResult => {
  const parser = new DOMParser()
  const document = parser.parseFromString(source, 'image/svg+xml')
  if (document.querySelector('parsererror')) {
    throw new Error('SVG 解析失败，请确认文件内容完整')
  }

  const root = document.documentElement
  if (root.localName.toLowerCase() !== 'svg') {
    throw new Error('文件内容不是有效的 SVG')
  }

  const dimensions = resolveSvgDimensions(
    root.getAttribute('width'),
    root.getAttribute('height'),
    root.getAttribute('viewBox')
  )
  let sanitized = false

  document.querySelectorAll('*').forEach((element) => {
    if (UNSAFE_ELEMENTS.has(element.localName.toLowerCase())) {
      element.remove()
      sanitized = true
    }
  })

  document.querySelectorAll('*').forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value
      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name)
        sanitized = true
      } else if ((name === 'href' || name === 'xlink:href' || name === 'src') && !isSafeSvgReference(value)) {
        element.removeAttribute(attribute.name)
        sanitized = true
      } else if (containsUnsafeCssReference(value)) {
        element.removeAttribute(attribute.name)
        sanitized = true
      }
    }
  })

  document.querySelectorAll('style').forEach((element) => {
    if (containsUnsafeCssReference(element.textContent || '')) {
      element.remove()
      sanitized = true
    }
  })

  if (!root.getAttribute('xmlns')) {
    root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }
  const serialized = new XMLSerializer().serializeToString(root)
  return {
    ...dimensions,
    blob: new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }),
    sanitized
  }
}

export const readSvgFile = async (file: File) => {
  return sanitizeSvgText(await file.text())
}
