import type {BasicCalculationResult} from '@/types/calculator'
import {Decimal, formatNumber} from '@/utils/calculator/decimal'

type OperatorValue = '+' | '-' | '*' | '/' | '^' | '%'

type Token =
    | {type: 'number'; value: Decimal}
    | {type: 'operator'; value: OperatorValue}
    | {type: 'paren'; value: '(' | ')'}

class ExpressionParser {
    private index = 0

    constructor(private readonly tokens: Token[]) {}

    parse(): Decimal {
        const value = this.parseExpression()

        if (this.index < this.tokens.length) {
            throw new Error('表达式存在无法解析的内容')
        }

        return value
    }

    private peek(): Token | undefined {
        return this.tokens[this.index]
    }

    private consume(): Token {
        const token = this.tokens[this.index]

        if (!token) {
            throw new Error('表达式不完整')
        }

        this.index += 1
        return token
    }

    private parseExpression(): Decimal {
        let value = this.parseTerm()

        while (true) {
            const token = this.peek()

            if (token?.type !== 'operator' || (token.value !== '+' && token.value !== '-')) {
                break
            }

            const operator = this.consume().value
            const right = this.parseTerm()
            value = operator === '+'
                ? value.plus(right)
                : value.minus(right)
        }

        return value
    }

    private parseTerm(): Decimal {
        let value = this.parsePower()

        while (true) {
            const token = this.peek()

            if (token?.type !== 'operator' || (token.value !== '*' && token.value !== '/')) {
                break
            }

            const operator = this.consume().value
            const right = this.parsePower()

            if (operator === '/' && right.isZero()) {
                throw new Error('除数不能为 0')
            }

            value = operator === '*'
                ? value.times(right)
                : value.dividedBy(right)
        }

        return value
    }

    private parsePower(): Decimal {
        const left = this.parseUnary()

        if (this.peek()?.type === 'operator' && this.peek()?.value === '^') {
            this.consume()
            const right = this.parsePower()
            return left.pow(right)
        }

        return left
    }

    private parseUnary(): Decimal {
        const token = this.peek()

        if (token?.type === 'operator' && token.value === '+') {
            this.consume()
            return this.parseUnary()
        }

        if (token?.type === 'operator' && token.value === '-') {
            this.consume()
            return this.parseUnary().negated()
        }

        return this.parsePostfix()
    }

    private parsePostfix(): Decimal {
        let value = this.parsePrimary()

        while (this.peek()?.type === 'operator' && this.peek()?.value === '%') {
            this.consume()
            value = value.dividedBy(100)
        }

        return value
    }

    private parsePrimary(): Decimal {
        const token = this.consume()

        if (token.type === 'number') {
            return token.value
        }

        if (token.type === 'paren' && token.value === '(') {
            const value = this.parseExpression()
            const close = this.consume()

            if (close.type !== 'paren' || close.value !== ')') {
                throw new Error('括号未闭合')
            }

            return value
        }

        throw new Error('表达式格式错误')
    }
}

const normalizeExpression = (expression: string): string => expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/，/g, ',')

const tokenize = (expression: string): Token[] => {
    const normalized = normalizeExpression(expression)
    const tokens: Token[] = []
    let index = 0

    while (index < normalized.length) {
        const char = normalized[index]

        if (/\s/.test(char)) {
            index += 1
            continue
        }

        if (/\d|\./.test(char)) {
            let end = index + 1

            while (end < normalized.length && /[\d.]/.test(normalized[end])) {
                end += 1
            }

            const raw = normalized.slice(index, end)

            if (!/^(?:\d+\.?\d*|\.\d+)$/.test(raw)) {
                throw new Error(`数字格式错误：${raw}`)
            }

            tokens.push({type: 'number', value: new Decimal(raw)})
            index = end
            continue
        }

        if ('+-*/^%'.includes(char)) {
            tokens.push({type: 'operator', value: char as OperatorValue})
            index += 1
            continue
        }

        if (char === '(' || char === ')') {
            tokens.push({type: 'paren', value: char})
            index += 1
            continue
        }

        throw new Error(`不支持的字符：${char}`)
    }

    return tokens
}

export const calculateExpression = (
    expression: string,
    precision = 8
): BasicCalculationResult => {
    const trimmed = expression.trim()

    if (!trimmed) {
        throw new Error('请输入计算表达式')
    }

    const parser = new ExpressionParser(tokenize(trimmed))
    const value = parser.parse()

    return {
        expression: trimmed,
        value: value.toNumber(),
        displayValue: formatNumber(value, precision, true),
        generatedAt: new Date().toISOString()
    }
}
