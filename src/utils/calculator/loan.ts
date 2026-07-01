import type {LoanInput, LoanResult, LoanScheduleRow} from '@/types/calculator'
import {Decimal, roundToNumber, toDecimal} from '@/utils/calculator/decimal'

const normalizeLoanInput = (input: LoanInput): LoanInput => {
    const totalPrice = Math.max(0, Number(input.totalPrice) || 0)
    const downPayment = Math.max(0, Number(input.downPayment) || 0)
    const principalByPrice = Math.max(0, totalPrice - downPayment)
    const principal = Math.max(0, Number(input.principal) || principalByPrice)

    return {
        ...input,
        totalPrice,
        downPayment,
        principal,
        annualRate: Math.max(0, Number(input.annualRate) || 0),
        months: Math.max(1, Math.trunc(Number(input.months) || 1)),
        serviceFee: Math.max(0, Number(input.serviceFee) || 0)
    }
}

const calculateEqualPaymentSchedule = (
    principal: Decimal,
    monthlyRate: Decimal,
    months: number
): LoanScheduleRow[] => {
    if (monthlyRate.isZero()) {
        const monthlyPrincipal = principal.dividedBy(months)
        let remaining = principal

        return Array.from({length: months}, (_, index) => {
            const paymentPrincipal = index === months - 1 ? remaining : monthlyPrincipal
            remaining = Decimal.max(0, remaining.minus(paymentPrincipal))

            return {
                period: index + 1,
                payment: roundToNumber(paymentPrincipal),
                principal: roundToNumber(paymentPrincipal),
                interest: 0,
                remainingPrincipal: roundToNumber(remaining)
            }
        })
    }

    const onePlusRatePow = monthlyRate.plus(1).pow(months)
    const monthlyPayment = principal
        .times(monthlyRate)
        .times(onePlusRatePow)
        .dividedBy(onePlusRatePow.minus(1))
    let remaining = principal

    return Array.from({length: months}, (_, index) => {
        const interest = remaining.times(monthlyRate)
        const paymentPrincipal = index === months - 1
            ? remaining
            : Decimal.min(remaining, monthlyPayment.minus(interest))
        const payment = paymentPrincipal.plus(interest)
        remaining = Decimal.max(0, remaining.minus(paymentPrincipal))

        return {
            period: index + 1,
            payment: roundToNumber(payment),
            principal: roundToNumber(paymentPrincipal),
            interest: roundToNumber(interest),
            remainingPrincipal: roundToNumber(remaining)
        }
    })
}

const calculateEqualPrincipalSchedule = (
    principal: Decimal,
    monthlyRate: Decimal,
    months: number
): LoanScheduleRow[] => {
    const monthlyPrincipal = principal.dividedBy(months)
    let remaining = principal

    return Array.from({length: months}, (_, index) => {
        const interest = remaining.times(monthlyRate)
        const paymentPrincipal = index === months - 1 ? remaining : monthlyPrincipal
        const payment = paymentPrincipal.plus(interest)
        remaining = Decimal.max(0, remaining.minus(paymentPrincipal))

        return {
            period: index + 1,
            payment: roundToNumber(payment),
            principal: roundToNumber(paymentPrincipal),
            interest: roundToNumber(interest),
            remainingPrincipal: roundToNumber(remaining)
        }
    })
}

export const calculateLoan = (rawInput: LoanInput): LoanResult => {
    const input = normalizeLoanInput(rawInput)
    const principal = toDecimal(input.principal)

    if (principal.lte(0)) {
        throw new Error('贷款金额必须大于 0')
    }

    const monthlyRate = toDecimal(input.annualRate).dividedBy(100).dividedBy(12)
    const schedule = input.method === 'equal-payment'
        ? calculateEqualPaymentSchedule(principal, monthlyRate, input.months)
        : calculateEqualPrincipalSchedule(principal, monthlyRate, input.months)
    const totalPrincipal = principal
    const totalInterest = schedule.reduce((sum, row) => sum.plus(row.interest), new Decimal(0))
    const totalPayment = totalPrincipal.plus(totalInterest)
    const totalCost = totalPayment.plus(input.serviceFee)
    const warnings: string[] = []

    if (input.annualRate === 0) {
        warnings.push('当前按 0 利率计算，仅展示本金分摊。')
    }

    if (input.kind === 'car' && input.serviceFee > 0) {
        warnings.push('车贷手续费已计入总成本，不参与月供利息计算。')
    }

    return {
        kind: input.kind,
        method: input.method,
        principal: roundToNumber(principal),
        annualRate: input.annualRate,
        monthlyRate: roundToNumber(monthlyRate.times(100), 6),
        months: input.months,
        firstPayment: schedule[0]?.payment || 0,
        averagePayment: roundToNumber(totalPayment.dividedBy(input.months)),
        lastPayment: schedule[schedule.length - 1]?.payment || 0,
        totalPrincipal: roundToNumber(totalPrincipal),
        totalInterest: roundToNumber(totalInterest),
        totalPayment: roundToNumber(totalPayment),
        totalCost: roundToNumber(totalCost),
        schedule,
        warnings
    }
}
