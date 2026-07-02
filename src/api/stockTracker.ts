import axios from 'axios'
import type {
    GeneralResponse,
    StockTrackerCandleSeriesVo,
    StockTrackerInterval,
    StockTrackerQuoteVo
} from '@/types/stockTracker'

const VITE_BUILD_ENV = import.meta.env.VITE_BUILD_ENV

const stockTrackerRequest = axios.create({
    timeout: 15000,
    baseURL: VITE_BUILD_ENV === 'prod' ? '//api.itwray.com' : '',
    headers: {
        'Content-Type': 'application/json;charset=utf-8'
    }
})

export const queryStockQuote = async (symbol: string): Promise<GeneralResponse<StockTrackerQuoteVo>> => {
    const response = await stockTrackerRequest.get<GeneralResponse<StockTrackerQuoteVo>>(
        '/external-service/api/stock-tracker/quote',
        {
            params: {
                symbol
            }
        }
    )
    return response.data
}

export const queryStockBatchQuotes = async (symbols: string[]): Promise<GeneralResponse<StockTrackerQuoteVo[]>> => {
    const response = await stockTrackerRequest.get<GeneralResponse<StockTrackerQuoteVo[]>>(
        '/external-service/api/stock-tracker/batch-quotes',
        {
            params: {
                symbols: symbols.join(',')
            }
        }
    )
    return response.data
}

export const queryStockCandles = async (
    symbol: string,
    interval: StockTrackerInterval,
    limit?: number
): Promise<GeneralResponse<StockTrackerCandleSeriesVo>> => {
    const response = await stockTrackerRequest.get<GeneralResponse<StockTrackerCandleSeriesVo>>(
        '/external-service/api/stock-tracker/candles',
        {
            params: {
                symbol,
                interval,
                limit
            }
        }
    )
    return response.data
}
