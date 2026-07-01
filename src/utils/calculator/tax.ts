import type {
    TaxBracket,
    TaxComputationDetail,
    YearEndBonusTaxInput,
    YearEndBonusTaxResult
} from '@/types/calculator'
import {
    ANNUAL_TAX_BRACKETS,
    CALCULATOR_POLICY_VERSION,
    MONTHLY_TAX_BRACKETS,
    YEAR_END_BONUS_POLICY_VALID_UNTIL
} from '@/utils/calculator/config'
import {Decimal, roundToNumber, toDecimal} from '@/utils/calculator/decimal'

const findBracket = (taxableIncome: Decimal, brackets: TaxBracket[]): TaxBracket => {
    const matched = brackets.find((bracket) => bracket.upper === null || taxableIncome.lte(bracket.upper))
    return matched || brackets[brackets.length - 1]
}

export const calculateTaxByBrackets = (
    taxableIncome: number | Decimal,
    brackets: TaxBracket[]
): TaxComputationDetail => {
    const taxable = Decimal.max(0, toDecimal(taxableIncome))
    const bracket = findBracket(taxable, brackets)
    const tax = Decimal.max(0, taxable.times(bracket.rate).minus(bracket.quickDeduction))

    return {
        taxableIncome: roundToNumber(taxable),
        tax: roundToNumber(tax),
        rate: bracket.rate,
        quickDeduction: bracket.quickDeduction
    }
}

export const calculateYearEndBonusTax = (input: YearEndBonusTaxInput): YearEndBonusTaxResult => {
    const bonus = Decimal.max(0, toDecimal(input.bonus))
    const annualIncomeWithoutBonus = Decimal.max(0, toDecimal(input.annualIncomeWithoutBonus))
    const deductions = Decimal.max(0, toDecimal(input.basicDeduction))
        .plus(Decimal.max(0, toDecimal(input.specialDeductions)))
        .plus(Decimal.max(0, toDecimal(input.specialAdditionalDeductions)))
        .plus(Decimal.max(0, toDecimal(input.otherDeductions)))
    const baseTaxableIncome = Decimal.max(0, annualIncomeWithoutBonus.minus(deductions))
    const mergedTaxableIncome = Decimal.max(0, annualIncomeWithoutBonus.plus(bonus).minus(deductions))
    const monthlyBonus = bonus.dividedBy(12)
    const bonusBracket = findBracket(monthlyBonus, MONTHLY_TAX_BRACKETS)
    const bonusTax = Decimal.max(0, bonus.times(bonusBracket.rate).minus(bonusBracket.quickDeduction))
    const baseAnnualTax = calculateTaxByBrackets(baseTaxableIncome, ANNUAL_TAX_BRACKETS)
    const mergedAnnualTax = calculateTaxByBrackets(mergedTaxableIncome, ANNUAL_TAX_BRACKETS)
    const standaloneTotalTax = toDecimal(baseAnnualTax.tax).plus(bonusTax)
    const mergedBonusIncrementalTax = Decimal.max(0, toDecimal(mergedAnnualTax.tax).minus(baseAnnualTax.tax))
    const savingByStandalone = mergedBonusIncrementalTax.minus(bonusTax)
    const warnings: string[] = [
        '结果为本地估算，不作为纳税申报依据。',
        `全年一次性奖金单独计税政策当前配置有效期至 ${YEAR_END_BONUS_POLICY_VALID_UNTIL}。`
    ]

    if (bonus.isZero()) {
        warnings.push('年终奖金额为 0，单独计税和并入计税无差异。')
    }

    let recommendation: YearEndBonusTaxResult['recommendation'] = 'same'
    if (savingByStandalone.gt(0.01)) {
        recommendation = 'standalone'
    } else if (savingByStandalone.lt(-0.01)) {
        recommendation = 'merged'
    }

    return {
        bonusTaxStandalone: {
            taxableIncome: roundToNumber(monthlyBonus),
            tax: roundToNumber(bonusTax),
            rate: bonusBracket.rate,
            quickDeduction: bonusBracket.quickDeduction
        },
        baseAnnualTax,
        mergedAnnualTax,
        standaloneTotalTax: roundToNumber(standaloneTotalTax),
        mergedTotalTax: mergedAnnualTax.tax,
        mergedBonusIncrementalTax: roundToNumber(mergedBonusIncrementalTax),
        savingByStandalone: roundToNumber(savingByStandalone),
        recommendation,
        policyVersion: CALCULATOR_POLICY_VERSION,
        policyValidUntil: YEAR_END_BONUS_POLICY_VALID_UNTIL,
        warnings
    }
}
