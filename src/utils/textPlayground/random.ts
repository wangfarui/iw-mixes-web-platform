export const normalizeText = (value: string): string => value.trim().replace(/\s+/g, ' ')

export const splitChars = (value: string): string[] => Array.from(value)

export const makeTextId = (prefix: string, index: number): string => {
    return `${prefix}-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 8)}`
}

export const randomInt = (min: number, max: number): number => {
    const lower = Math.ceil(min)
    const upper = Math.floor(max)

    if (upper <= lower) {
        return lower
    }

    const range = upper - lower + 1
    const cryptoApi = globalThis.crypto

    if (cryptoApi?.getRandomValues) {
        const values = new Uint32Array(1)
        cryptoApi.getRandomValues(values)
        return lower + (values[0] % range)
    }

    return lower + Math.floor(Math.random() * range)
}

export const pickOne = <T>(items: T[]): T => {
    return items[randomInt(0, items.length - 1)]
}

export const shuffleItems = <T>(items: T[]): T[] => {
    const next = [...items]

    for (let index = next.length - 1; index > 0; index -= 1) {
        const swapIndex = randomInt(0, index)
        const current = next[index]
        next[index] = next[swapIndex]
        next[swapIndex] = current
    }

    return next
}

export const limitTextLength = (value: string, length: number): string => {
    return splitChars(value).slice(0, Math.max(0, length)).join('')
}
