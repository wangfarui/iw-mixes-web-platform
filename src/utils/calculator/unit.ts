import type {
    UnitCategory,
    UnitConversionInput,
    UnitConversionResult,
    UnitDefinition
} from '@/types/calculator'
import {UNIT_DEFINITIONS} from '@/utils/calculator/config'
import {clampPrecision, Decimal, roundToNumber, toDecimal} from '@/utils/calculator/decimal'

export const getUnitsByCategory = (category: UnitCategory): UnitDefinition[] => (
    UNIT_DEFINITIONS.filter((unit) => unit.category === category)
)

const findUnit = (category: UnitCategory, value: string): UnitDefinition => {
    const unit = UNIT_DEFINITIONS.find((item) => item.category === category && item.value === value)

    if (!unit) {
        throw new Error('单位配置不存在')
    }

    return unit
}

const temperatureToCelsius = (amount: Decimal, unit: string): Decimal => {
    if (unit === 'c') {
        return amount
    }

    if (unit === 'f') {
        return amount.minus(32).times(5).dividedBy(9)
    }

    if (unit === 'k') {
        return amount.minus(273.15)
    }

    throw new Error('温度单位配置不存在')
}

const celsiusToTemperature = (amount: Decimal, unit: string): Decimal => {
    if (unit === 'c') {
        return amount
    }

    if (unit === 'f') {
        return amount.times(9).dividedBy(5).plus(32)
    }

    if (unit === 'k') {
        return amount.plus(273.15)
    }

    throw new Error('温度单位配置不存在')
}

export const convertUnit = (input: UnitConversionInput): UnitConversionResult => {
    const precision = clampPrecision(input.precision)
    const fromUnit = findUnit(input.category, input.fromUnit)
    const toUnit = findUnit(input.category, input.toUnit)
    const amount = toDecimal(input.amount)
    let converted: Decimal
    let formula: string

    if (input.category === 'temperature') {
        const celsius = temperatureToCelsius(amount, fromUnit.value)
        converted = celsiusToTemperature(celsius, toUnit.value)
        formula = `${amount.toString()} ${fromUnit.symbol} -> ${toUnit.symbol}`
    } else {
        const fromFactor = toDecimal(fromUnit.factorToBase || 1)
        const toFactor = toDecimal(toUnit.factorToBase || 1)
        converted = amount.times(fromFactor).dividedBy(toFactor)
        formula = `${amount.toString()} x ${fromFactor.toString()} / ${toFactor.toString()}`
    }

    return {
        category: input.category,
        amount: roundToNumber(amount, precision),
        fromUnit,
        toUnit,
        convertedValue: roundToNumber(converted, precision),
        formula
    }
}
