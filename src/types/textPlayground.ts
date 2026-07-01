export type TextPlaygroundMode =
    | 'quote'
    | 'acrostic'
    | 'transform'
    | 'danmaku'

export type AcrosticStyle =
    | 'classical'
    | 'blessing'
    | 'rainbow'
    | 'dark'
    | 'workday'

export type QuoteKind =
    | 'rainbow'
    | 'dark'
    | 'nonsense'
    | 'workday'
    | 'social'
    | 'awkward'

export type QuoteTone =
    | 'soft'
    | 'normal'
    | 'strong'

export type TransformOperation =
    | 'mars'
    | 'anti-dog'
    | 'reverse-chars'
    | 'reverse-lines'
    | 'reverse-words'
    | 'spaced'

export type DanmakuSpeed =
    | 'slow'
    | 'normal'
    | 'fast'

export type DanmakuColorMode =
    | 'classic'
    | 'rainbow'
    | 'contrast'

export type TextPlaygroundExportFormat =
    | 'txt'
    | 'markdown'
    | 'json'

export type ToolAiBusinessType =
    | 'TEXT_GAME_ACROSTIC'
    | 'TEXT_GAME_QUOTE'
    | 'TEXT_GAME_DANMAKU'

export type ToolAiLimitCode =
    | 42901
    | 42902
    | 42903

export interface GeneralResponse<T> {
    code: number
    message: string
    data: T
}

export interface TextOption<T extends string | number> {
    label: string
    value: T
    description?: string
}

export interface AcrosticSettings {
    heads: string
    topic: string
    style: AcrosticStyle
    lineLength: 5 | 7
    count: number
    rhyme: boolean
}

export interface QuoteSettings {
    kind: QuoteKind
    tone: QuoteTone
    count: number
    emoji: boolean
    rhyme: boolean
}

export interface TransformSettings {
    operation: TransformOperation
    symbolLevel: number
    keepLineBreaks: boolean
}

export interface DanmakuSettings {
    sourceText: string
    speed: DanmakuSpeed
    fontSize: number
    density: number
    colorMode: DanmakuColorMode
    shuffle: boolean
    loop: boolean
}

export interface TextMetrics {
    characters: number
    nonSpaceCharacters: number
    lines: number
}

export interface TextPlaygroundRecord {
    id: string
    index: number
    mode: Exclude<TextPlaygroundMode, 'transform' | 'danmaku'>
    label: string
    title: string
    content: string
    meta: string[]
    createdAt: string
}

export interface TextTransformResult {
    operation: TransformOperation
    operationLabel: string
    input: string
    output: string
    inputMetrics: TextMetrics
    outputMetrics: TextMetrics
    warnings: string[]
    convertedAt: string
}

export interface DanmakuLine {
    id: string
    index: number
    text: string
    lane: number
    color: string
    durationSeconds: number
    delaySeconds: number
}

export interface ToolAiGenerateDto {
    businessType: ToolAiBusinessType
    message: Record<string, unknown>
}

export interface ToolAiGenerateVo {
    requestId: string
    businessType: ToolAiBusinessType
    content: string
    items: string[]
    model?: string
    totalTokens?: number
}
