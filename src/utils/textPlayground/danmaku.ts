import type {
    DanmakuColorMode,
    DanmakuLine,
    DanmakuSettings,
    DanmakuSpeed
} from '@/types/textPlayground'
import {MAX_DANMAKU_LINES} from './config'
import {
    makeTextId,
    normalizeText,
    shuffleItems
} from './random'

const colorMap: Record<DanmakuColorMode, string[]> = {
    classic: ['#ffffff'],
    rainbow: ['#fef08a', '#bfdbfe', '#fecdd3', '#bbf7d0', '#ddd6fe', '#fed7aa'],
    contrast: ['#ffffff', '#22d3ee', '#facc15', '#fb7185']
}

const durationMap: Record<DanmakuSpeed, number> = {
    slow: 18,
    normal: 12,
    fast: 8
}

const delayStepMap: Record<DanmakuSpeed, number> = {
    slow: 1.2,
    normal: 0.8,
    fast: 0.45
}

export const normalizeDanmakuSource = (sourceText: string): string[] => {
    return sourceText
        .split(/\r\n|\r|\n/)
        .map(normalizeText)
        .filter(Boolean)
        .slice(0, MAX_DANMAKU_LINES)
}

export const buildDanmakuLines = (settings: DanmakuSettings): DanmakuLine[] => {
    const rawLines = normalizeDanmakuSource(settings.sourceText)
    const lines = settings.shuffle ? shuffleItems(rawLines) : rawLines
    const density = Math.max(1, Math.min(12, Math.trunc(settings.density || 1)))
    const colors = colorMap[settings.colorMode]
    const duration = durationMap[settings.speed]
    const delayStep = delayStepMap[settings.speed]

    return lines.map((text, index) => ({
        id: makeTextId('danmaku', index + 1),
        index: index + 1,
        text,
        lane: index % density,
        color: colors[index % colors.length],
        durationSeconds: duration + (index % 4),
        delaySeconds: settings.loop ? (index % Math.max(1, density * 2)) * delayStep : index * delayStep
    }))
}

export const getDanmakuTrackTop = (line: DanmakuLine, density: number): string => {
    const safeDensity = Math.max(1, density)
    const step = 80 / safeDensity

    return `${10 + line.lane * step}%`
}
