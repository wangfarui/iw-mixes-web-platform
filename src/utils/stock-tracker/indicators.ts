import type { MovingAveragePoint, StockTrackerCandleVo, StockTrackerInterval } from '@/types/stockTracker'

interface ChartTimeParts {
    year: number
    month: number
    day: number
    hour: number
    minute: number
}

export const calculateMovingAverage = (candles: StockTrackerCandleVo[], period: number): MovingAveragePoint[] => {
    if (!Number.isInteger(period) || period <= 1) {
        return []
    }

    const result: MovingAveragePoint[] = []
    let sum = 0

    candles.forEach((candle, index) => {
        sum += candle.close
        if (index >= period) {
            sum -= candles[index - period].close
        }
        if (index >= period - 1) {
            result.push({
                time: candle.time,
                value: Number((sum / period).toFixed(4))
            })
        }
    })

    return result
}

export const getQuoteTrendType = (changePercent?: number): 'up' | 'down' | 'flat' => {
    if (changePercent == null || changePercent === 0) {
        return 'flat'
    }
    return changePercent > 0 ? 'up' : 'down'
}

export const formatCompactNumber = (value?: number): string => {
    if (value == null || Number.isNaN(value)) {
        return '-'
    }
    const abs = Math.abs(value)
    if (abs >= 100000000) {
        return `${(value / 100000000).toFixed(2)}亿`
    }
    if (abs >= 10000) {
        return `${(value / 10000).toFixed(2)}万`
    }
    return value.toLocaleString('zh-CN')
}

export const toChartTimestamp = (tradeTime: string, fallbackTime?: number): number => {
    const match = tradeTime.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/)
    if (!match) {
        return fallbackTime || 0
    }

    const [, year, month, day, hour = '0', minute = '0', second = '0'] = match
    return Math.floor(Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
    ) / 1000)
}

export const getIntradayVisibleRange = (tradeTime: string, market = 'A'): { from: number; to: number } | undefined => {
    const match = tradeTime.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!match) {
        return undefined
    }

    const [, year, month, day] = match
    const chartDateArgs = [Number(year), Number(month) - 1, Number(day)] as const
    const closeHour = market === 'A' ? 15 : 16
    return {
        from: Math.floor(Date.UTC(...chartDateArgs, 9, 30, 0) / 1000),
        to: Math.floor(Date.UTC(...chartDateArgs, closeHour, 0, 0) / 1000)
    }
}

export const formatChartCrosshairTime = (time: unknown, interval: StockTrackerInterval): string => {
    const parts = readChartTimeParts(time)
    if (!parts) {
        return ''
    }
    if (interval === 'intraday') {
        return `${pad2(parts.hour)}:${pad2(parts.minute)}`
    }
    if (interval === 'weekly') {
        const week = getIsoWeek(parts.year, parts.month, parts.day)
        return `${week.year}-W${pad2(week.week)}`
    }
    if (interval === 'monthly') {
        return `${parts.year}-${pad2(parts.month)}`
    }
    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`
}

export const formatChartTickTime = (time: unknown, interval: StockTrackerInterval): string => {
    const parts = readChartTimeParts(time)
    if (!parts) {
        return ''
    }
    if (interval === 'intraday') {
        return `${pad2(parts.hour)}:${pad2(parts.minute)}`
    }
    if (interval === 'weekly') {
        const week = getIsoWeek(parts.year, parts.month, parts.day)
        return `${String(week.year).slice(2)}-W${pad2(week.week)}`
    }
    if (interval === 'monthly') {
        return `${parts.year}-${pad2(parts.month)}`
    }
    return `${pad2(parts.month)}-${pad2(parts.day)}`
}

const readChartTimeParts = (time: unknown): ChartTimeParts | undefined => {
    if (typeof time === 'number') {
        const date = new Date(time * 1000)
        return {
            year: date.getUTCFullYear(),
            month: date.getUTCMonth() + 1,
            day: date.getUTCDate(),
            hour: date.getUTCHours(),
            minute: date.getUTCMinutes()
        }
    }
    if (typeof time === 'string') {
        const timestamp = toChartTimestamp(time)
        return timestamp ? readChartTimeParts(timestamp) : undefined
    }
    if (time && typeof time === 'object' && 'year' in time && 'month' in time && 'day' in time) {
        const businessDay = time as { year: number; month: number; day: number }
        return {
            year: businessDay.year,
            month: businessDay.month,
            day: businessDay.day,
            hour: 0,
            minute: 0
        }
    }
    return undefined
}

const getIsoWeek = (year: number, month: number, day: number) => {
    const date = new Date(Date.UTC(year, month - 1, day))
    const weekday = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - weekday)
    const weekYear = date.getUTCFullYear()
    const yearStart = new Date(Date.UTC(weekYear, 0, 1))
    const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return { year: weekYear, week }
}

const pad2 = (value: number): string => String(value).padStart(2, '0')
