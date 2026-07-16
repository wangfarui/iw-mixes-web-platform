import type { StockTrackerCandleVo, StockTrackerInterval } from '@/types/stockTracker'

const DAY_SECONDS = 24 * 60 * 60

export interface AutoIntervalContext {
    interval: StockTrackerInterval
    visibleFrom: number
    visibleTo: number
    visibleLogicalBars: number
    loadedBars: number
    nearLatest: boolean
}

export const resolveAutoInterval = (context: AutoIntervalContext): StockTrackerInterval => {
    const visibleDays = Math.max(0, (context.visibleTo - context.visibleFrom) / DAY_SECONDS)
    if (context.interval === 'intraday') {
        return context.visibleLogicalBars > context.loadedBars * 1.15 ? 'daily' : 'intraday'
    }
    if (context.interval === 'daily') {
        if (context.nearLatest && visibleDays <= 3) {
            return 'intraday'
        }
        return visibleDays > 183 ? 'weekly' : 'daily'
    }
    if (context.interval === 'weekly') {
        if (visibleDays < 122) {
            return 'daily'
        }
        return visibleDays > 1095 ? 'monthly' : 'weekly'
    }
    return visibleDays < 730 ? 'weekly' : 'monthly'
}

export const mergeStockCandles = (
    current: StockTrackerCandleVo[],
    incoming: StockTrackerCandleVo[]
): StockTrackerCandleVo[] => {
    const candlesByTime = new Map<number, StockTrackerCandleVo>()
    current.forEach((candle) => candlesByTime.set(candle.time, candle))
    incoming.forEach((candle) => candlesByTime.set(candle.time, candle))
    return Array.from(candlesByTime.values()).sort((left, right) => left.time - right.time)
}

export const toChartDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toISOString().slice(0, 10)
}
