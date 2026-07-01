import type {
    CmykColor,
    ColorContrastResult,
    ColorFormatItem,
    CssSnippetItem,
    HslColor,
    HsvColor,
    ParsedColorInput,
    RgbaColor
} from '@/types/colorPicker'

const RGB_MAX = 255
const HUE_MAX = 360

const clamp = (value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value))
}

const round = (value: number, precision = 0) => {
    const factor = 10 ** precision
    return Math.round((value + Number.EPSILON) * factor) / factor
}

const normalizeHue = (value: number) => {
    return ((value % HUE_MAX) + HUE_MAX) % HUE_MAX
}

export const normalizeRgba = (color: RgbaColor): RgbaColor => ({
    r: Math.round(clamp(color.r, 0, RGB_MAX)),
    g: Math.round(clamp(color.g, 0, RGB_MAX)),
    b: Math.round(clamp(color.b, 0, RGB_MAX)),
    a: round(clamp(color.a, 0, 1), 3)
})

const toHexPair = (value: number) => {
    return Math.round(clamp(value, 0, RGB_MAX)).toString(16).padStart(2, '0').toUpperCase()
}

const parseAlpha = (value: string | undefined): number => {
    if (!value || value.trim() === '') {
        return 1
    }

    const text = value.trim()
    if (text.endsWith('%')) {
        const percent = Number.parseFloat(text)
        if (!Number.isFinite(percent)) {
            throw new Error('透明度不是有效数字')
        }
        return clamp(percent / 100, 0, 1)
    }

    const alpha = Number.parseFloat(text)
    if (!Number.isFinite(alpha)) {
        throw new Error('透明度不是有效数字')
    }
    return clamp(alpha, 0, 1)
}

const parseRgbChannel = (value: string): number => {
    const text = value.trim()
    if (text.endsWith('%')) {
        const percent = Number.parseFloat(text)
        if (!Number.isFinite(percent)) {
            throw new Error('RGB 通道不是有效数字')
        }
        return round((clamp(percent, 0, 100) * RGB_MAX) / 100)
    }

    const channel = Number.parseFloat(text)
    if (!Number.isFinite(channel)) {
        throw new Error('RGB 通道不是有效数字')
    }
    return Math.round(clamp(channel, 0, RGB_MAX))
}

const parsePercent = (value: string, label: string): number => {
    const text = value.trim()
    const number = Number.parseFloat(text)
    if (!Number.isFinite(number)) {
        throw new Error(`${label} 不是有效数字`)
    }
    return clamp(number, 0, 100)
}

const splitFunctionArgs = (value: string): string[] => {
    return value
        .trim()
        .replace(/\s*\/\s*/g, ' ')
        .replace(/,/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
}

const parseHexColor = (value: string): ParsedColorInput | null => {
    const match = value.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
    if (!match) {
        return null
    }

    const hex = match[1]
    const expanded = hex.length <= 4
        ? hex.split('').map((char) => `${char}${char}`).join('')
        : hex

    const r = Number.parseInt(expanded.slice(0, 2), 16)
    const g = Number.parseInt(expanded.slice(2, 4), 16)
    const b = Number.parseInt(expanded.slice(4, 6), 16)
    const alphaHex = expanded.slice(6, 8)
    const a = alphaHex ? round(Number.parseInt(alphaHex, 16) / RGB_MAX, 3) : 1

    return {
        color: normalizeRgba({ r, g, b, a }),
        sourceFormat: 'hex'
    }
}

const parseRgbColor = (value: string): ParsedColorInput | null => {
    const match = value.trim().match(/^rgba?\((.*)\)$/i)
    if (!match) {
        return null
    }

    const args = splitFunctionArgs(match[1])
    if (args.length < 3 || args.length > 4) {
        throw new Error('RGB 颜色需要 3 个通道和可选透明度')
    }

    return {
        color: normalizeRgba({
            r: parseRgbChannel(args[0]),
            g: parseRgbChannel(args[1]),
            b: parseRgbChannel(args[2]),
            a: parseAlpha(args[3])
        }),
        sourceFormat: 'rgb'
    }
}

const parseHslColor = (value: string): ParsedColorInput | null => {
    const match = value.trim().match(/^hsla?\((.*)\)$/i)
    if (!match) {
        return null
    }

    const args = splitFunctionArgs(match[1])
    if (args.length < 3 || args.length > 4) {
        throw new Error('HSL 颜色需要色相、饱和度、亮度和可选透明度')
    }

    return {
        color: hslToRgba({
            h: normalizeHue(Number.parseFloat(args[0])),
            s: parsePercent(args[1], '饱和度'),
            l: parsePercent(args[2], '亮度'),
            a: parseAlpha(args[3])
        }),
        sourceFormat: 'hsl'
    }
}

export const parseColorInput = (input: string): ParsedColorInput => {
    const value = input.trim()
    if (!value) {
        throw new Error('请输入颜色值')
    }

    if (value.toLowerCase() === 'transparent') {
        return {
            color: { r: 0, g: 0, b: 0, a: 0 },
            sourceFormat: 'keyword'
        }
    }

    const parsed = parseHexColor(value) || parseRgbColor(value) || parseHslColor(value)
    if (parsed) {
        return parsed
    }

    throw new Error('无法识别颜色值，请输入 HEX、RGB/RGBA 或 HSL/HSLA')
}

export const rgbaToHex = (color: RgbaColor): string => {
    const normalized = normalizeRgba(color)
    return `#${toHexPair(normalized.r)}${toHexPair(normalized.g)}${toHexPair(normalized.b)}`
}

export const rgbaToHexAlpha = (color: RgbaColor): string => {
    const normalized = normalizeRgba(color)
    return `${rgbaToHex(normalized)}${toHexPair(normalized.a * RGB_MAX)}`
}

export const formatRgb = (color: RgbaColor): string => {
    const normalized = normalizeRgba(color)
    return `rgb(${normalized.r}, ${normalized.g}, ${normalized.b})`
}

export const formatRgba = (color: RgbaColor): string => {
    const normalized = normalizeRgba(color)
    return `rgba(${normalized.r}, ${normalized.g}, ${normalized.b}, ${normalized.a})`
}

export const rgbaToHsl = (color: RgbaColor): HslColor => {
    const normalized = normalizeRgba(color)
    const r = normalized.r / RGB_MAX
    const g = normalized.g / RGB_MAX
    const b = normalized.b / RGB_MAX
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    const l = (max + min) / 2
    let h = 0
    let s = 0

    if (delta !== 0) {
        s = delta / (1 - Math.abs(2 * l - 1))

        if (max === r) {
            h = 60 * (((g - b) / delta) % 6)
        } else if (max === g) {
            h = 60 * ((b - r) / delta + 2)
        } else {
            h = 60 * ((r - g) / delta + 4)
        }
    }

    return {
        h: round(normalizeHue(h)),
        s: round(s * 100, 1),
        l: round(l * 100, 1),
        a: normalized.a
    }
}

export const hslToRgba = (color: HslColor): RgbaColor => {
    const h = normalizeHue(color.h)
    const s = clamp(color.s, 0, 100) / 100
    const l = clamp(color.l, 0, 100) / 100
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2
    let r = 0
    let g = 0
    let b = 0

    if (h < 60) {
        r = c
        g = x
    } else if (h < 120) {
        r = x
        g = c
    } else if (h < 180) {
        g = c
        b = x
    } else if (h < 240) {
        g = x
        b = c
    } else if (h < 300) {
        r = x
        b = c
    } else {
        r = c
        b = x
    }

    return normalizeRgba({
        r: (r + m) * RGB_MAX,
        g: (g + m) * RGB_MAX,
        b: (b + m) * RGB_MAX,
        a: color.a
    })
}

export const rgbaToHsv = (color: RgbaColor): HsvColor => {
    const normalized = normalizeRgba(color)
    const r = normalized.r / RGB_MAX
    const g = normalized.g / RGB_MAX
    const b = normalized.b / RGB_MAX
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    let h = 0

    if (delta !== 0) {
        if (max === r) {
            h = 60 * (((g - b) / delta) % 6)
        } else if (max === g) {
            h = 60 * ((b - r) / delta + 2)
        } else {
            h = 60 * ((r - g) / delta + 4)
        }
    }

    return {
        h: round(normalizeHue(h)),
        s: max === 0 ? 0 : round((delta / max) * 100, 1),
        v: round(max * 100, 1),
        a: normalized.a
    }
}

export const rgbaToCmyk = (color: RgbaColor): CmykColor => {
    const normalized = normalizeRgba(color)
    const r = normalized.r / RGB_MAX
    const g = normalized.g / RGB_MAX
    const b = normalized.b / RGB_MAX
    const k = 1 - Math.max(r, g, b)

    if (k === 1) {
        return { c: 0, m: 0, y: 0, k: 100 }
    }

    return {
        c: round(((1 - r - k) / (1 - k)) * 100, 1),
        m: round(((1 - g - k) / (1 - k)) * 100, 1),
        y: round(((1 - b - k) / (1 - k)) * 100, 1),
        k: round(k * 100, 1)
    }
}

export const formatHsl = (color: RgbaColor): string => {
    const hsl = rgbaToHsl(color)
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
}

export const formatHsla = (color: RgbaColor): string => {
    const hsl = rgbaToHsl(color)
    return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${hsl.a})`
}

export const formatHsv = (color: RgbaColor): string => {
    const hsv = rgbaToHsv(color)
    return `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`
}

export const formatCmyk = (color: RgbaColor): string => {
    const cmyk = rgbaToCmyk(color)
    return `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`
}

const linearizeChannel = (value: number): number => {
    const channel = value / RGB_MAX
    return channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
}

const relativeLuminance = (color: RgbaColor): number => {
    const normalized = normalizeRgba(color)
    return 0.2126 * linearizeChannel(normalized.r)
        + 0.7152 * linearizeChannel(normalized.g)
        + 0.0722 * linearizeChannel(normalized.b)
}

const contrastRatio = (colorA: RgbaColor, colorB: RgbaColor): number => {
    const luminanceA = relativeLuminance(colorA)
    const luminanceB = relativeLuminance(colorB)
    const lighter = Math.max(luminanceA, luminanceB)
    const darker = Math.min(luminanceA, luminanceB)
    return round((lighter + 0.05) / (darker + 0.05), 2)
}

const compositeOverWhite = (color: RgbaColor): RgbaColor => {
    const normalized = normalizeRgba(color)
    return normalizeRgba({
        r: normalized.r * normalized.a + RGB_MAX * (1 - normalized.a),
        g: normalized.g * normalized.a + RGB_MAX * (1 - normalized.a),
        b: normalized.b * normalized.a + RGB_MAX * (1 - normalized.a),
        a: 1
    })
}

export const getColorContrast = (color: RgbaColor): ColorContrastResult => {
    const opaqueColor = compositeOverWhite(color)
    const contrastOnWhite = contrastRatio(opaqueColor, { r: 255, g: 255, b: 255, a: 1 })
    const contrastOnBlack = contrastRatio(opaqueColor, { r: 0, g: 0, b: 0, a: 1 })
    const bestContrast = Math.max(contrastOnWhite, contrastOnBlack)

    return {
        contrastOnWhite,
        contrastOnBlack,
        recommendedTextColor: contrastOnBlack >= contrastOnWhite ? '#000000' : '#FFFFFF',
        normalTextPassesAA: bestContrast >= 4.5,
        largeTextPassesAA: bestContrast >= 3
    }
}

export const getReadableTextColor = (color: RgbaColor) => {
    return getColorContrast(color).recommendedTextColor
}

export const buildColorFormats = (color: RgbaColor): ColorFormatItem[] => {
    const normalized = normalizeRgba(color)
    const hsl = rgbaToHsl(normalized)
    const hsv = rgbaToHsv(normalized)
    const cmyk = rgbaToCmyk(normalized)

    return [
        {
            key: 'hex',
            label: 'HEX',
            value: rgbaToHex(normalized),
            description: '网页和设计工具常用十六进制色值'
        },
        {
            key: 'hex-alpha',
            label: 'HEX Alpha',
            value: rgbaToHexAlpha(normalized),
            description: '包含透明度的 8 位十六进制色值'
        },
        {
            key: 'rgb',
            label: 'RGB',
            value: formatRgb(normalized),
            description: 'CSS RGB 色值'
        },
        {
            key: 'rgba',
            label: 'RGBA',
            value: formatRgba(normalized),
            description: '包含透明度的 CSS RGB 色值'
        },
        {
            key: 'hsl',
            label: 'HSL',
            value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
            description: '按色相、饱和度和亮度描述颜色'
        },
        {
            key: 'hsla',
            label: 'HSLA',
            value: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${hsl.a})`,
            description: '包含透明度的 HSL 色值'
        },
        {
            key: 'hsv',
            label: 'HSV',
            value: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`,
            description: '按色相、饱和度和明度描述颜色'
        },
        {
            key: 'cmyk',
            label: 'CMYK',
            value: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
            description: '印刷场景参考值'
        }
    ]
}

export const buildCssSnippets = (color: RgbaColor, variableName: string): CssSnippetItem[] => {
    const normalized = normalizeRgba(color)
    const colorValue = normalized.a < 1 ? formatRgba(normalized) : rgbaToHex(normalized)
    const safeVariableName = variableName.trim().startsWith('--')
        ? variableName.trim()
        : `--${variableName.trim() || 'iw-color-custom'}`

    return [
        {
            key: 'color',
            label: '文本颜色',
            value: `color: ${colorValue};`
        },
        {
            key: 'background',
            label: '背景颜色',
            value: `background-color: ${colorValue};`
        },
        {
            key: 'border',
            label: '边框颜色',
            value: `border: 1px solid ${colorValue};`
        },
        {
            key: 'variable',
            label: 'CSS 变量',
            value: `${safeVariableName}: ${colorValue};`
        }
    ]
}

export const formatColorSummary = (color: RgbaColor): string => {
    const normalized = normalizeRgba(color)
    return `${rgbaToHex(normalized)} / ${formatRgba(normalized)}`
}
