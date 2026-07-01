export interface GeneralResponse<T> {
    code: number
    message: string
    data: T
}

export interface GetExchangeRateDto {
    fromCurrency: string
    toCurrency: string
    queryDate?: string
    fromAmount?: number
}

export interface GetExchangeRateVo {
    fromCurrency: string
    toCurrency: string
    exchangeRate: number | string
    queryDate: string
    fromAmount: number | string
    toAmount: number | string
}
