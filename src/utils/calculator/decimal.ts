import Decimal from 'decimal.js'

Decimal.set({
    precision: 28,
    rounding: Decimal.ROUND_HALF_UP
})

export const toDecimal = (value: number | string | Decimal): Decimal => {
    if (value instanceof Decimal) {
        return value
    }

    if (value === '' || Number.isNaN(Number(value))) {
        return new Decimal(0)
    }

    return new Decimal(value)
}

export const roundToNumber = (
    value: number | string | Decimal,
    precision = 2
): number => toDecimal(value).toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toNumber()

export const clampPrecision = (precision: number): number => {
    if (!Number.isFinite(precision)) {
        return 2
    }

    return Math.min(8, Math.max(0, Math.trunc(precision)))
}

export const formatNumber = (
    value: number | string | Decimal,
    precision = 2,
    trimZeros = false
): string => {
    const fixed = toDecimal(value).toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toFixed(precision)

    if (!trimZeros) {
        return fixed
    }

    return fixed.replace(/\.?0+$/, '')
}

export {Decimal}
