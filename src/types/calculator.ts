export type CalculatorModule = 'basic' | 'loan' | 'tax' | 'unit' | 'currency'

export type CalculatorExportFormat = 'txt' | 'csv' | 'json'

export type LoanKind = 'mortgage' | 'car'

export type LoanRepaymentMethod = 'equal-payment' | 'equal-principal'

export interface LoanInput {
    kind: LoanKind
    totalPrice: number
    downPayment: number
    principal: number
    annualRate: number
    months: number
    method: LoanRepaymentMethod
    serviceFee: number
}

export interface LoanScheduleRow {
    period: number
    payment: number
    principal: number
    interest: number
    remainingPrincipal: number
}

export interface LoanResult {
    kind: LoanKind
    method: LoanRepaymentMethod
    principal: number
    annualRate: number
    monthlyRate: number
    months: number
    firstPayment: number
    averagePayment: number
    lastPayment: number
    totalPrincipal: number
    totalInterest: number
    totalPayment: number
    totalCost: number
    schedule: LoanScheduleRow[]
    warnings: string[]
}

export interface TaxBracket {
    upper: number | null
    rate: number
    quickDeduction: number
}

export interface YearEndBonusTaxInput {
    bonus: number
    annualIncomeWithoutBonus: number
    basicDeduction: number
    specialDeductions: number
    specialAdditionalDeductions: number
    otherDeductions: number
    prepaidTaxWithoutBonus: number
}

export interface TaxComputationDetail {
    taxableIncome: number
    tax: number
    rate: number
    quickDeduction: number
}

export interface YearEndBonusTaxResult {
    bonusTaxStandalone: TaxComputationDetail
    baseAnnualTax: TaxComputationDetail
    mergedAnnualTax: TaxComputationDetail
    standaloneTotalTax: number
    mergedTotalTax: number
    mergedBonusIncrementalTax: number
    savingByStandalone: number
    recommendation: 'standalone' | 'merged' | 'same'
    policyVersion: string
    policyValidUntil: string
    warnings: string[]
}

export type UnitCategory = 'length' | 'weight' | 'area' | 'volume' | 'temperature' | 'data'

export interface UnitDefinition {
    category: UnitCategory
    value: string
    label: string
    symbol: string
    factorToBase?: number
}

export interface UnitConversionInput {
    category: UnitCategory
    amount: number
    fromUnit: string
    toUnit: string
    precision: number
}

export interface UnitConversionResult {
    category: UnitCategory
    amount: number
    fromUnit: UnitDefinition
    toUnit: UnitDefinition
    convertedValue: number
    formula: string
}

export interface CurrencyRate {
    code: string
    label: string
    rateToCny: number
}

export interface CurrencyConversionInput {
    amount: number
    fromCurrency: string
    toCurrency: string
    rates: CurrencyRate[]
    precision: number
}

export interface CurrencyConversionResult {
    amount: number
    fromCurrency: CurrencyRate
    toCurrency: CurrencyRate
    convertedValue: number
    rate: number
    queryDate: string
    source: 'live' | 'manual'
    generatedAt: string
    warnings: string[]
}

export interface BasicCalculationResult {
    expression: string
    value: number
    displayValue: string
    generatedAt: string
}

export interface CalculatorSnapshot {
    module: CalculatorModule
    title: string
    summary: Record<string, string | number>
    details?: unknown
    generatedAt: string
}
