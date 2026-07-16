import type {
    StockTrackerExportPayload,
    StockTrackerInterval,
    StockTrackerLocalState,
    StockTrackerWatchItem
} from '@/types/stockTracker'

export const STOCK_TRACKER_STORAGE_KEY = 'iw-tools-stock-tracker-state'

const DEFAULT_INTERVAL: StockTrackerInterval = 'intraday'

const DEFAULT_REFRESH_SECONDS = 5

const DEFAULT_WATCHLIST: StockTrackerWatchItem[] = [
    {
        symbol: '000001',
        exchange: 'SZ',
        name: '平安银行',
        addedAt: '2026-07-01T00:00:00.000Z'
    },
    {
        symbol: '600519',
        exchange: 'SH',
        name: '贵州茅台',
        addedAt: '2026-07-01T00:00:00.000Z'
    },
    {
        symbol: '159516',
        exchange: 'SZ',
        name: '半导体设备ETF',
        addedAt: '2026-07-01T00:00:00.000Z'
    },
    {
        symbol: '00700',
        exchange: 'HK',
        name: '腾讯控股',
        addedAt: '2026-07-01T00:00:00.000Z'
    },
    {
        symbol: 'AAPL',
        exchange: 'US',
        name: '苹果',
        addedAt: '2026-07-01T00:00:00.000Z'
    },
    {
        symbol: '300750',
        exchange: 'SZ',
        name: '宁德时代',
        addedAt: '2026-07-01T00:00:00.000Z'
    }
]

export const createDefaultStockTrackerState = (): StockTrackerLocalState => ({
    watchlist: DEFAULT_WATCHLIST.map((item) => ({ ...item })),
    selectedSymbol: DEFAULT_WATCHLIST[0]?.symbol,
    interval: DEFAULT_INTERVAL,
    autoInterval: true,
    autoRefresh: false,
    refreshSeconds: DEFAULT_REFRESH_SECONDS
})

export const normalizeStockSymbolInput = (input: string): StockTrackerWatchItem => {
    let value = input.trim().toUpperCase().replace(/\s+/g, '').replace(/_/g, '.')
    if (/^[01]\.\d{6}$/.test(value)) {
        const [market, symbol] = value.split('.')
        return createAStockWatchItem(symbol, market === '1' ? 'SH' : 'SZ')
    }
    if (/^116\.\d{1,5}$/.test(value)) {
        return createHongKongWatchItem(value.slice(4))
    }
    if (/^(105|106|107)\.[A-Z][A-Z0-9.-]{0,14}$/.test(value)) {
        return createUsWatchItem(value.slice(value.indexOf('.') + 1))
    }

    if (/^SH\d{6}$/.test(value)) {
        value = `${value.slice(2)}.SH`
    }
    if (/^SZ\d{6}$/.test(value)) {
        value = `${value.slice(2)}.SZ`
    }
    if (/^HK\d{1,5}$/.test(value)) {
        value = `${value.slice(2)}.HK`
    }
    if (/^(US|NASDAQ|NYSE|AMEX)[:.][A-Z][A-Z0-9.-]{0,14}$/.test(value)) {
        value = `${value.slice(value.search(/[:.]/) + 1)}.US`
    }

    if (/^\d{6}\.(SH|SZ)$/.test(value)) {
        return createAStockWatchItem(value.slice(0, 6), value.endsWith('.SH') ? 'SH' : 'SZ')
    }
    if (/^\d{1,5}\.HK$/.test(value)) {
        return createHongKongWatchItem(value.slice(0, -3))
    }
    if (/^[A-Z][A-Z0-9.-]{0,14}\.(US|NASDAQ|NYSE|AMEX)$/.test(value)) {
        return createUsWatchItem(value.slice(0, value.lastIndexOf('.')))
    }

    if (/^\d{6}$/.test(value)) {
        return createAStockWatchItem(value, inferStockExchange(value))
    }
    if (/^\d{1,5}$/.test(value)) {
        return createHongKongWatchItem(value)
    }
    if (/^[A-Z][A-Z0-9.-]{0,14}$/.test(value)) {
        return createUsWatchItem(value)
    }
    throw new Error('请输入股票或ETF代码，例如 159516.SZ、00700.HK、AAPL.US')
}

const createAStockWatchItem = (symbol: string, exchange: 'SH' | 'SZ'): StockTrackerWatchItem => {
    if (exchange === 'SH' && !isShanghaiSymbol(symbol)) {
        throw new Error('请输入有效的沪市股票或ETF代码')
    }
    if (exchange === 'SZ' && !isShenzhenSymbol(symbol)) {
        throw new Error('请输入有效的深市股票或ETF代码')
    }
    return {
        symbol,
        exchange,
        addedAt: new Date().toISOString()
    }
}

const createHongKongWatchItem = (symbol: string): StockTrackerWatchItem => {
    if (!/^\d{1,5}$/.test(symbol)) {
        throw new Error('请输入有效的港股代码，例如 00700.HK')
    }
    return {
        symbol: symbol.padStart(5, '0'),
        exchange: 'HK',
        addedAt: new Date().toISOString()
    }
}

const createUsWatchItem = (symbol: string): StockTrackerWatchItem => {
    if (!/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol)) {
        throw new Error('请输入有效的美股代码，例如 AAPL.US')
    }
    return {
        symbol,
        exchange: 'US',
        addedAt: new Date().toISOString()
    }
}

export const inferStockExchange = (symbol: string): 'SH' | 'SZ' => {
    if (isShanghaiSymbol(symbol)) {
        return 'SH'
    }
    if (isShenzhenSymbol(symbol)) {
        return 'SZ'
    }
    throw new Error('当前仅支持沪深A股股票和ETF、港股、美股代码')
}

const isShanghaiSymbol = (symbol: string): boolean => {
    return /^(600|601|603|605|688|689|501|502|510|511|512|513|515|516|517|518|520|588|589)/.test(symbol)
}

const isShenzhenSymbol = (symbol: string): boolean => {
    return /^(000|001|002|003|300|301|159|160|161|162|163|164|165|166|167|168|169)/.test(symbol)
}

export const formatDisplaySymbol = (item: Pick<StockTrackerWatchItem, 'symbol' | 'exchange'>): string => {
    return `${item.symbol}.${item.exchange}`
}

export const addWatchItem = (
    watchlist: StockTrackerWatchItem[],
    input: string,
    name?: string
): StockTrackerWatchItem[] => {
    const nextItem = normalizeStockSymbolInput(input)
    nextItem.name = name || nextItem.name
    const rest = watchlist.filter((item) => item.symbol !== nextItem.symbol)
    return [nextItem, ...rest].slice(0, 20)
}

export const updateWatchItemName = (
    watchlist: StockTrackerWatchItem[],
    symbol: string,
    name?: string
): StockTrackerWatchItem[] => {
    if (!name) {
        return watchlist
    }
    return watchlist.map((item) => item.symbol === symbol ? { ...item, name } : item)
}

export const removeWatchItem = (watchlist: StockTrackerWatchItem[], symbol: string): StockTrackerWatchItem[] => {
    return watchlist.filter((item) => item.symbol !== symbol)
}

export const loadStockTrackerState = (storage: Storage | undefined = getBrowserStorage()): StockTrackerLocalState => {
    if (!storage) {
        return createDefaultStockTrackerState()
    }
    const raw = storage.getItem(STOCK_TRACKER_STORAGE_KEY)
    if (!raw) {
        return createDefaultStockTrackerState()
    }
    try {
        return normalizeStoredState(JSON.parse(raw))
    } catch {
        return createDefaultStockTrackerState()
    }
}

export const saveStockTrackerState = (
    state: StockTrackerLocalState,
    storage: Storage | undefined = getBrowserStorage()
) => {
    if (!storage) {
        return
    }
    storage.setItem(STOCK_TRACKER_STORAGE_KEY, JSON.stringify(normalizeStoredState(state)))
}

export const clearStockTrackerState = (storage: Storage | undefined = getBrowserStorage()) => {
    storage?.removeItem(STOCK_TRACKER_STORAGE_KEY)
}

export const buildStockTrackerExport = (state: StockTrackerLocalState): string => {
    const payload: StockTrackerExportPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        state: normalizeStoredState(state)
    }
    return JSON.stringify(payload, null, 2)
}

export const parseStockTrackerImport = (content: string): StockTrackerLocalState => {
    const payload = JSON.parse(content)
    return normalizeStoredState(payload?.state || payload)
}

const normalizeStoredState = (value: Partial<StockTrackerLocalState>): StockTrackerLocalState => {
    const fallback = createDefaultStockTrackerState()
    const watchlist = Array.isArray(value.watchlist)
        ? normalizeStoredWatchlist(value.watchlist).slice(0, 20)
        : fallback.watchlist

    const selectedSymbol = typeof value.selectedSymbol === 'string'
        && watchlist.some((item) => item.symbol === value.selectedSymbol)
        ? value.selectedSymbol
        : watchlist[0]?.symbol

    return {
        watchlist,
        selectedSymbol,
        interval: normalizeInterval(value.interval),
        autoInterval: value.autoInterval !== false,
        autoRefresh: value.autoRefresh === true,
        refreshSeconds: normalizeRefreshSeconds(value.refreshSeconds)
    }
}

const normalizeStoredWatchlist = (items: StockTrackerWatchItem[]): StockTrackerWatchItem[] => {
    const result: StockTrackerWatchItem[] = []
    items.forEach((item) => {
        try {
            const normalized = normalizeStockSymbolInput(item.symbol || '')
            const watchItem: StockTrackerWatchItem = {
                symbol: normalized.symbol,
                exchange: normalized.exchange,
                addedAt: typeof item.addedAt === 'string' ? item.addedAt : normalized.addedAt
            }
            if (typeof item.name === 'string' && item.name) {
                watchItem.name = item.name
            }
            result.push(watchItem)
        } catch {
            // Ignore invalid imported or stale local records.
        }
    })
    return result
}

const normalizeInterval = (interval?: string): StockTrackerInterval => {
    if (interval === '1m') {
        return 'intraday'
    }
    const supported: StockTrackerInterval[] = ['intraday', 'daily', 'weekly', 'monthly']
    return supported.includes(interval as StockTrackerInterval) ? interval as StockTrackerInterval : DEFAULT_INTERVAL
}

const normalizeRefreshSeconds = (value?: number): number => {
    if (!Number.isFinite(value)) {
        return DEFAULT_REFRESH_SECONDS
    }
    return Math.min(300, Math.max(5, Math.round(Number(value))))
}

const getBrowserStorage = (): Storage | undefined => {
    if (typeof window === 'undefined') {
        return undefined
    }
    return window.localStorage
}
