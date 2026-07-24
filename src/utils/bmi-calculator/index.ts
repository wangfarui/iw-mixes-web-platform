import type {
    BmiCalculationInput,
    BmiCalculationResult,
    BmiCategory
} from '@/types/bmi-calculator'

const roundTo = (value: number, precision: number): number => {
    const factor = 10 ** precision
    return Math.round((value + Number.EPSILON) * factor) / factor
}

const getCategory = (rawBmi: number): BmiCategory => {
    if (rawBmi < 18.5) {
        return {key: 'underweight', label: '体重过低', tone: 'info'}
    }

    if (rawBmi < 24) {
        return {key: 'normal', label: '正常体重范围', tone: 'success'}
    }
    if (rawBmi < 28) {
        return {key: 'overweight', label: '超重范围', tone: 'warning'}
    }
    return {key: 'obesity', label: '肥胖范围', tone: 'danger'}
}

export const calculateBmi = (input: BmiCalculationInput): BmiCalculationResult => {
    const {heightCm, weightKg} = input
    if (!Number.isFinite(heightCm) || heightCm <= 0) {
        throw new RangeError('请输入大于 0 的身高。')
    }
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
        throw new RangeError('请输入大于 0 的体重。')
    }

    const heightMeters = heightCm / 100
    const rawBmi = weightKg / (heightMeters ** 2)
    const warnings: string[] = []

    if (heightCm < 100 || heightCm > 250 || weightKg < 20 || weightKg > 500) {
        warnings.push('输入值处于常见成人范围之外，请确认单位和数据是否正确。')
    }

    return {
        heightCm,
        weightKg,
        bmi: roundTo(rawBmi, 1),
        rawBmi,
        category: getCategory(rawBmi),
        healthyWeightMinKg: 18.5 * (heightMeters ** 2),
        healthyWeightMaxExclusiveKg: 24 * (heightMeters ** 2),
        warnings
    }
}

export const formatReferenceWeightRange = (result: BmiCalculationResult): string => {
    const minimum = Math.ceil((result.healthyWeightMinKg - Number.EPSILON) * 10) / 10
    const maximum = Math.floor((result.healthyWeightMaxExclusiveKg - Number.EPSILON) * 10) / 10
    return `${minimum.toFixed(1)}–${maximum.toFixed(1)} kg`
}
