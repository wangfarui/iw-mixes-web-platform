import type {
    CurrencyConversionInput,
    CurrencyConversionResult,
    CurrencyRate
} from '@/types/calculator'
import type {GetExchangeRateVo} from '@/types/exchangeRate'
import {clampPrecision, roundToNumber, toDecimal} from '@/utils/calculator/decimal'

export const findCurrencyRate = (
    rates: CurrencyRate[],
    code: string
): CurrencyRate => {
    const rate = rates.find((item) => item.code === code)

    if (!rate) {
        throw new Error('币种汇率配置不存在')
    }

    if (!Number.isFinite(rate.rateToCny) || rate.rateToCny <= 0) {
        throw new Error(`${rate.code} 的汇率必须大于 0`)
    }

    return rate
}

export const findCurrencyLabel = (
    rates: CurrencyRate[],
    code: string
): string => rates.find((item) => item.code === code)?.label || code

const createCurrencyRate = (
    rates: CurrencyRate[],
    code: string,
    rateToCny = 1
): CurrencyRate => ({
    code,
    label: findCurrencyLabel(rates, code),
    rateToCny
})

export const convertCurrency = (input: CurrencyConversionInput): CurrencyConversionResult => {
    const precision = clampPrecision(input.precision)
    const fromCurrency = findCurrencyRate(input.rates, input.fromCurrency)
    const toCurrency = findCurrencyRate(input.rates, input.toCurrency)
    const amount = toDecimal(input.amount)
    const rate = toDecimal(fromCurrency.rateToCny).dividedBy(toCurrency.rateToCny)
    const converted = amount.times(rate)

    return {
        amount: roundToNumber(amount, precision),
        fromCurrency,
        toCurrency,
        convertedValue: roundToNumber(converted, precision),
        rate: roundToNumber(rate, 8),
        queryDate: new Date().toISOString().slice(0, 10),
        source: 'manual',
        generatedAt: new Date().toISOString(),
        warnings: [
            '当前使用手动汇率，不是实时行情。',
            '默认汇率仅用于演示，使用前请按实际业务口径修改。'
        ]
    }
}

export const mapExchangeRateVoToCurrencyResult = (
    vo: GetExchangeRateVo,
    precision: number,
    rates: CurrencyRate[]
): CurrencyConversionResult => {
    const displayPrecision = clampPrecision(precision)
    const exchangeRate = toDecimal(vo.exchangeRate)
    const toAmount = toDecimal(vo.toAmount)

    if (exchangeRate.lte(0)) {
        throw new Error('汇率必须大于 0')
    }

    return {
        amount: roundToNumber(vo.fromAmount, displayPrecision),
        fromCurrency: createCurrencyRate(rates, vo.fromCurrency, 1),
        toCurrency: createCurrencyRate(rates, vo.toCurrency, roundToNumber(exchangeRate, 8)),
        convertedValue: roundToNumber(toAmount, displayPrecision),
        rate: roundToNumber(exchangeRate, 8),
        queryDate: vo.queryDate,
        source: 'live',
        generatedAt: new Date().toISOString(),
        warnings: [
            '汇率结果仅供计算参考，最终金额以实际交易渠道为准。'
        ]
    }
}
