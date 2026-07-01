import type {
    AcrosticSettings,
    AcrosticStyle,
    TextPlaygroundRecord
} from '@/types/textPlayground'
import {
    ACROSTIC_STYLE_OPTIONS,
    MAX_ACROSTIC_COUNT,
    MAX_ACROSTIC_HEADS
} from './config'
import {
    limitTextLength,
    makeTextId,
    normalizeText,
    pickOne,
    splitChars
} from './random'

const styleEndingMap: Record<AcrosticStyle, { short: string[]; long: string[] }> = {
    classical: {
        short: ['云开月明', '风过庭深', '春入山河', '星落长河', '花照归程', '清梦成诗'],
        long: ['云开万里春', '风过一庭香', '星垂千里阔', '花照满城光', '月明归路长', '清梦入诗行']
    },
    blessing: {
        short: ['好运常在', '喜乐成章', '心愿发光', '岁岁安康', '万事顺意', '福气满堂'],
        long: ['好运常相伴', '喜乐满心房', '心愿都发光', '岁岁皆安康', '万事皆顺意', '福气绕身旁']
    },
    rainbow: {
        short: ['可爱发光', '人间宝藏', '闪闪漂亮', '优秀登场', '天生主角', '值得偏爱'],
        long: ['可爱会发光', '人间小宝藏', '闪闪又漂亮', '优秀正登场', '天生是主角', '值得被偏爱']
    },
    dark: {
        short: ['清醒也忙', '努力不慌', '人间很长', '今天还行', '难得发光', '躺平有章'],
        long: ['清醒也很忙', '努力先不慌', '人间路还长', '今天也还行', '难得会发光', '躺平亦成章']
    },
    workday: {
        short: ['摸鱼有方', '工位发光', '咖啡续航', '下班在望', '会议不长', '键盘很忙'],
        long: ['摸鱼也有方', '工位会发光', '咖啡正续航', '下班已在望', '会议别太长', '键盘替我忙']
    }
}

const topicEndings = {
    short: ['成诗', '发光', '很忙', '有方', '正好', '满堂'],
    long: ['正好发光', '也能成章', '一路生香', '值得收藏', '落在心上', '自有回响']
}

const rhymeChars = ['光', '香', '长', '章', '方', '康', '忙', '望']

const getAcrosticStyleLabel = (style: AcrosticStyle): string => {
    return ACROSTIC_STYLE_OPTIONS.find((item) => item.value === style)?.label || style
}

const normalizeHeads = (heads: string): string[] => {
    return splitChars(heads.replace(/\s/g, '')).filter(Boolean).slice(0, MAX_ACROSTIC_HEADS)
}

const normalizeCount = (count: number): number => {
    return Math.min(MAX_ACROSTIC_COUNT, Math.max(1, Math.trunc(Number(count) || 1)))
}

const buildEnding = (
    settings: AcrosticSettings,
    variantIndex: number,
    lineIndex: number
): string => {
    const lengthKey = settings.lineLength === 5 ? 'short' : 'long'
    const topic = normalizeText(settings.topic)
    const topicChars = limitTextLength(topic, settings.lineLength === 5 ? 2 : 3)

    if (topicChars) {
        const targetRestLength = settings.lineLength - 1
        const tail = topicEndings[lengthKey][(variantIndex + lineIndex) % topicEndings[lengthKey].length]
        return `${topicChars}${tail}`.slice(0, targetRestLength)
    }

    const endings = styleEndingMap[settings.style][lengthKey]
    return endings[(variantIndex + lineIndex) % endings.length]
}

const applyRhyme = (line: string, lineLength: 5 | 7, variantIndex: number, lineIndex: number): string => {
    const chars = splitChars(line).slice(0, lineLength)
    const rhyme = rhymeChars[(variantIndex + lineIndex) % rhymeChars.length]

    if (chars.length >= lineLength) {
        chars[lineLength - 1] = rhyme
    }

    return chars.join('')
}

const buildLine = (
    head: string,
    settings: AcrosticSettings,
    variantIndex: number,
    lineIndex: number
): string => {
    const rest = buildEnding(settings, variantIndex, lineIndex)
    const rawLine = limitTextLength(`${head}${rest}`, settings.lineLength)

    return settings.rhyme
        ? applyRhyme(rawLine, settings.lineLength, variantIndex, lineIndex)
        : rawLine
}

export const generateAcrosticRecords = (settings: AcrosticSettings): TextPlaygroundRecord[] => {
    const heads = normalizeHeads(settings.heads)

    if (!heads.length) {
        return []
    }

    const count = normalizeCount(settings.count)
    const styleLabel = getAcrosticStyleLabel(settings.style)
    const createdAt = new Date().toISOString()

    return Array.from({length: count}, (_, variantIndex) => {
        const lines = heads.map((head, lineIndex) => buildLine(head, settings, variantIndex, lineIndex))
        const topic = normalizeText(settings.topic)
        const meta = [
            styleLabel,
            `${settings.lineLength} 字句`,
            settings.rhyme ? '尾字押韵' : '不强制押韵'
        ]

        if (topic) {
            meta.unshift(`主题：${topic}`)
        }

        return {
            id: makeTextId('acrostic', variantIndex + 1),
            index: variantIndex + 1,
            mode: 'acrostic',
            label: '藏头诗',
            title: `藏头诗 ${variantIndex + 1}`,
            content: lines.join('\n'),
            meta,
            createdAt
        }
    })
}

export const getAcrosticHeadPreview = (heads: string): string => {
    return normalizeHeads(heads).join('')
}

export const getRandomAcrosticExample = (): string => {
    return pickOne(['春风得意', '快乐生活', '好运常在', '今天下班', '人间值得'])
}
