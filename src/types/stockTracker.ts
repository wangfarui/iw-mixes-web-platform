export interface GeneralResponse<T> {
    code: number
    message: string
    data?: T
}

export type StockTrackerInterval = 'intraday' | 'daily' | 'weekly' | 'monthly'

export type StockTrackerExchange = 'SH' | 'SZ' | 'HK' | 'US'

export interface StockTrackerQuoteVo {
    market: string
    exchange: string
    secid: string
    symbol: string
    name: string
    currency: string
    price?: number
    change?: number
    changePercent?: number
    open?: number
    high?: number
    low?: number
    previousClose?: number
    volume?: number
    amount?: number
    asOf?: string
    source: string
    warnings: string[]
}

export interface StockTrackerCandleVo {
    time: number
    tradeTime: string
    open: number
    close: number
    high: number
    low: number
    volume?: number
    amount?: number
    amplitude?: number
    changePercent?: number
    change?: number
    turnoverRate?: number
}

export interface StockTrackerCandleSeriesVo {
    market: string
    exchange: string
    secid: string
    symbol: string
    name: string
    interval: StockTrackerInterval
    intervalLabel: string
    adjust: string
    source: string
    generatedAt: string
    candles: StockTrackerCandleVo[]
    hasMoreBefore?: boolean
    nextEndTime?: string
    oldestTime?: string
    newestTime?: string
    warnings: string[]
}

export interface StockTrackerWatchItem {
    symbol: string
    exchange: StockTrackerExchange
    name?: string
    addedAt: string
}

export interface StockTrackerLocalState {
    watchlist: StockTrackerWatchItem[]
    selectedSymbol?: string
    interval: StockTrackerInterval
    autoInterval: boolean
    autoRefresh: boolean
    refreshSeconds: number
}

export interface StockTrackerExportPayload {
    version: 1
    exportedAt: string
    state: StockTrackerLocalState
}

export interface MovingAveragePoint {
    time: number
    value: number
}
