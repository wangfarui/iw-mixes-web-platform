const ID_CARD_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const ID_CARD_CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

export const calculateLuhnCheckDigit = (numericText: string): string => {
    const digits = numericText.replace(/\D/g, '')

    if (!digits) {
        return '0'
    }

    let sum = 0
    let shouldDouble = true

    for (let index = digits.length - 1; index >= 0; index -= 1) {
        let digit = Number(digits[index])

        if (shouldDouble) {
            digit *= 2
            if (digit > 9) {
                digit -= 9
            }
        }

        sum += digit
        shouldDouble = !shouldDouble
    }

    return String((10 - (sum % 10)) % 10)
}

export const calculateMod11CheckDigit = (numericText: string): string => {
    const digits = numericText.replace(/\D/g, '')

    if (!digits) {
        return '0'
    }

    let sum = 0

    for (let index = 0; index < digits.length; index += 1) {
        sum += Number(digits[index]) * (index + 2)
    }

    const value = 11 - (sum % 11)

    if (value === 10) {
        return 'X'
    }

    if (value === 11) {
        return '0'
    }

    return String(value)
}

export const calculateIdCardCheckCode = (first17Digits: string): string => {
    if (!/^\d{17}$/.test(first17Digits)) {
        throw new Error('身份证前 17 位必须为数字')
    }

    const sum = ID_CARD_WEIGHTS.reduce((total, weight, index) => {
        return total + Number(first17Digits[index]) * weight
    }, 0)

    return ID_CARD_CHECK_CODES[sum % 11]
}

export const isValidIdCardChecksum = (idCardNumber: string): boolean => {
    if (!/^\d{17}[\dXx]$/.test(idCardNumber)) {
        return false
    }

    return calculateIdCardCheckCode(idCardNumber.slice(0, 17)) === idCardNumber.slice(17).toUpperCase()
}
