import type {
    TextMetrics,
    TextTransformResult,
    TransformOperation,
    TransformSettings
} from '@/types/textPlayground'
import {TRANSFORM_OPERATION_OPTIONS} from './config'
import {splitChars} from './random'

const variantMap: Record<string, string> = {
    '的': '啲',
    '了': '嘞',
    '是': '系',
    '我': '偶',
    '你': '泥',
    '他': '祂',
    '她': '祂',
    '们': '們',
    '这': '這',
    '那': '吶',
    '在': '茬',
    '有': '冇',
    '没': '沒',
    '么': '麽',
    '吗': '嗎',
    '吧': '叭',
    '好': '吼',
    '爱': '愛',
    '说': '說',
    '看': 'kan',
    '很': '狠',
    '不': '卜',
    '会': '會',
    '想': '想',
    '人': '亻',
    '心': '忄',
    '火': '灬',
    '文': '攵',
    '工': 'エ',
    '具': '貝',
    '生': '甡',
    '活': '氵舌'
}

const latinMap: Record<string, string> = {
    a: 'α',
    b: 'Ь',
    c: '¢',
    d: 'ԁ',
    e: 'е',
    f: 'ғ',
    g: 'ɡ',
    h: 'н',
    i: 'ι',
    j: 'ʝ',
    k: 'κ',
    l: 'ℓ',
    m: 'м',
    n: 'η',
    o: 'σ',
    p: 'ρ',
    q: 'զ',
    r: 'я',
    s: 'ѕ',
    t: 'т',
    u: 'υ',
    v: 'ν',
    w: 'ω',
    x: 'χ',
    y: 'у',
    z: 'ʐ'
}

const symbolGroups = [
    ['·', '。', ' '],
    ['★', '☆', '✦', '·'],
    ['｡', '･', 'ﾟ', '✧', '♡']
]

export const measureText = (text: string): TextMetrics => {
    return {
        characters: splitChars(text).length,
        nonSpaceCharacters: splitChars(text.replace(/\s/g, '')).length,
        lines: text ? text.split(/\r\n|\r|\n/).length : 0
    }
}

export const getTransformOperationLabel = (operation: TransformOperation): string => {
    return TRANSFORM_OPERATION_OPTIONS.find((item) => item.value === operation)?.label || operation
}

const transformChar = (char: string, aggressive: boolean): string => {
    if (variantMap[char]) {
        return variantMap[char]
    }

    const lower = char.toLowerCase()
    if (latinMap[lower]) {
        const transformed = latinMap[lower]
        return char === lower ? transformed : transformed.toUpperCase()
    }

    if (aggressive && /\d/.test(char)) {
        return ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'][Number(char)] || char
    }

    return char
}

const decorateText = (text: string, level: number, keepLineBreaks: boolean): string => {
    if (level <= 0) {
        return text
    }

    const symbols = symbolGroups[Math.min(symbolGroups.length - 1, Math.max(0, Math.trunc(level) - 1))]
    const chars = splitChars(text)
    const decorated = chars.map((char, index) => {
        if (/\s/.test(char)) {
            return keepLineBreaks && /\n|\r/.test(char) ? char : ' '
        }

        if ((index + 1) % (level >= 3 ? 2 : 4) === 0) {
            return `${char}${symbols[index % symbols.length]}`
        }

        return char
    }).join('')

    return decorated.replace(/[ \t]{2,}/g, ' ').trim()
}

const toMarsText = (input: string, settings: TransformSettings): string => {
    const transformed = splitChars(input)
        .map((char) => transformChar(char, settings.symbolLevel >= 3))
        .join('')

    return decorateText(transformed, settings.symbolLevel, settings.keepLineBreaks)
}

const reverseChars = (input: string, keepLineBreaks: boolean): string => {
    if (keepLineBreaks) {
        return input
            .split(/\r\n|\r|\n/)
            .map((line) => splitChars(line).reverse().join(''))
            .join('\n')
    }

    return splitChars(input).reverse().join('')
}

const reverseWords = (input: string): string => {
    const words = input.match(/\S+/g) || []

    return words.reverse().join(' ')
}

const toAntiDogText = (input: string, settings: TransformSettings): string => {
    const reversed = reverseChars(input, settings.keepLineBreaks)
    const abstracted = splitChars(reversed)
        .map((char) => transformChar(char, true))
        .join('')

    return decorateText(abstracted, Math.max(1, settings.symbolLevel), settings.keepLineBreaks)
}

const toSpacedText = (input: string): string => {
    return input
        .split(/\r\n|\r|\n/)
        .map((line) => splitChars(line).join(' '))
        .join('\n')
}

export const transformText = (
    input: string,
    settings: TransformSettings
): TextTransformResult => {
    const startedAt = Date.now()
    let output = ''

    if (settings.operation === 'mars') {
        output = toMarsText(input, settings)
    } else if (settings.operation === 'anti-dog') {
        output = toAntiDogText(input, settings)
    } else if (settings.operation === 'reverse-chars') {
        output = reverseChars(input, settings.keepLineBreaks)
    } else if (settings.operation === 'reverse-lines') {
        output = input.split(/\r\n|\r|\n/).reverse().join('\n')
    } else if (settings.operation === 'reverse-words') {
        output = reverseWords(input)
    } else {
        output = toSpacedText(input)
    }

    const warnings = []

    if (!input.trim()) {
        warnings.push('输入为空，暂无可转换内容。')
    }

    if (settings.operation === 'reverse-words' && !/\s/.test(input.trim())) {
        warnings.push('当前文本没有明显空白分词，词序倒置效果可能不明显。')
    }

    return {
        operation: settings.operation,
        operationLabel: getTransformOperationLabel(settings.operation),
        input,
        output,
        inputMetrics: measureText(input),
        outputMetrics: measureText(output),
        warnings,
        convertedAt: new Date(startedAt).toISOString()
    }
}
