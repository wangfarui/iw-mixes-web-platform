export type BmiCategoryTone = 'info' | 'success' | 'warning' | 'danger'

export interface BmiCalculationInput {
    heightCm: number
    weightKg: number
}

export interface BmiCategory {
    key: 'underweight' | 'normal' | 'overweight' | 'obesity'
    label: string
    tone: BmiCategoryTone
}

export interface BmiCalculationResult {
    heightCm: number
    weightKg: number
    bmi: number
    rawBmi: number
    category: BmiCategory
    healthyWeightMinKg: number
    healthyWeightMaxExclusiveKg: number
    warnings: string[]
}
