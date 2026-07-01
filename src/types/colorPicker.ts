export type ColorExportFormat = 'txt' | 'json'

export interface RgbaColor {
    r: number
    g: number
    b: number
    a: number
}

export interface HslColor {
    h: number
    s: number
    l: number
    a: number
}

export interface HsvColor {
    h: number
    s: number
    v: number
    a: number
}

export interface CmykColor {
    c: number
    m: number
    y: number
    k: number
}

export interface ParsedColorInput {
    color: RgbaColor
    sourceFormat: 'hex' | 'rgb' | 'hsl' | 'keyword'
}

export interface ColorFormatItem {
    key: string
    label: string
    value: string
    description: string
}

export interface CssSnippetItem {
    key: string
    label: string
    value: string
}

export interface ColorContrastResult {
    contrastOnWhite: number
    contrastOnBlack: number
    recommendedTextColor: '#000000' | '#FFFFFF'
    normalTextPassesAA: boolean
    largeTextPassesAA: boolean
}

export interface PickedPixelInfo {
    x: number
    y: number
    width: number
    height: number
    color: RgbaColor
}

export interface ColorSnapshot {
    color: RgbaColor
    formats: ColorFormatItem[]
    cssSnippets: CssSnippetItem[]
    contrast: ColorContrastResult
    pickedPixel?: PickedPixelInfo
    generatedAt: string
}
