import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/calculator-tests')

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

const bundleModule = async (entry, outfileName) => {
  const outfile = path.join(tempDir, outfileName)
  await build({
    entryPoints: [path.join(root, entry)],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2020',
    logLevel: 'silent',
    alias: {
      '@': path.join(root, 'src')
    }
  })
  return import(pathToFileURL(outfile).href)
}

const basic = await bundleModule('src/utils/calculator/basic.ts', 'basic.mjs')
const loan = await bundleModule('src/utils/calculator/loan.ts', 'loan.mjs')
const tax = await bundleModule('src/utils/calculator/tax.ts', 'tax.mjs')
const unit = await bundleModule('src/utils/calculator/unit.ts', 'unit.mjs')
const currency = await bundleModule('src/utils/calculator/currency.ts', 'currency.mjs')
const config = await bundleModule('src/utils/calculator/config.ts', 'config.mjs')
const exporters = await bundleModule('src/utils/calculator/exporters.ts', 'exporters.mjs')

const currencyCodes = config.DEFAULT_CURRENCY_RATES.map((item) => item.code)
assert.deepEqual(currencyCodes.slice(0, 8), ['CNY', 'USD', 'JPY', 'KRW', 'EUR', 'HKD', 'AUD', 'GBP'])
assert.ok(currencyCodes.length >= 150)
assert.equal(new Set(currencyCodes).size, currencyCodes.length)
assert.ok(currencyCodes.includes('SGD'))
assert.ok(currencyCodes.includes('ZAR'))

assert.equal(basic.calculateExpression('1 + 2 * 3').displayValue, '7')
assert.equal(basic.calculateExpression('(1 + 2) * 3').displayValue, '9')
assert.equal(basic.calculateExpression('50% + 1').displayValue, '1.5')
assert.equal(basic.calculateExpression('100 / (2 + 3)').displayValue, '20')
assert.throws(() => basic.calculateExpression('1 / 0'), /除数不能为 0/)

const equalPayment = loan.calculateLoan({
  kind: 'mortgage',
  totalPrice: 2000000,
  downPayment: 600000,
  principal: 1400000,
  annualRate: 3.45,
  months: 360,
  method: 'equal-payment',
  serviceFee: 0
})
assert.equal(equalPayment.schedule.length, 360)
assert.equal(equalPayment.totalPrincipal, 1400000)
assert.ok(equalPayment.totalInterest > 0)
assert.equal(equalPayment.firstPayment, equalPayment.lastPayment)

const zeroRate = loan.calculateLoan({
  kind: 'car',
  totalPrice: 200000,
  downPayment: 60000,
  principal: 140000,
  annualRate: 0,
  months: 24,
  method: 'equal-principal',
  serviceFee: 3000
})
assert.equal(zeroRate.totalInterest, 0)
assert.equal(zeroRate.totalCost, 143000)
assert.ok(zeroRate.warnings.some((warning) => warning.includes('0 利率')))

const bonusTax = tax.calculateYearEndBonusTax(config.createDefaultYearEndBonusTaxInput())
assert.equal(bonusTax.bonusTaxStandalone.tax, 5790)
assert.equal(bonusTax.baseAnnualTax.tax, 3480)
assert.equal(bonusTax.mergedAnnualTax.tax, 9480)
assert.equal(bonusTax.mergedBonusIncrementalTax, 6000)
assert.equal(bonusTax.recommendation, 'standalone')
assert.equal(bonusTax.policyValidUntil, '2027-12-31')

const meters = unit.convertUnit({
  category: 'length',
  amount: 1,
  fromUnit: 'm',
  toUnit: 'cm',
  precision: 2
})
assert.equal(meters.convertedValue, 100)

const fahrenheit = unit.convertUnit({
  category: 'temperature',
  amount: 100,
  fromUnit: 'c',
  toUnit: 'f',
  precision: 2
})
assert.equal(fahrenheit.convertedValue, 212)

const usdToCny = currency.convertCurrency({
  amount: 100,
  fromCurrency: 'USD',
  toCurrency: 'CNY',
  rates: config.DEFAULT_CURRENCY_RATES,
  precision: 2
})
assert.equal(usdToCny.convertedValue, 720)
assert.ok(usdToCny.warnings.some((warning) => warning.includes('手动汇率')))
assert.equal(usdToCny.source, 'manual')

const liveCurrency = currency.mapExchangeRateVoToCurrencyResult({
  fromCurrency: 'USD',
  toCurrency: 'CNY',
  exchangeRate: '7.123456',
  queryDate: '2026-07-01',
  fromAmount: '100',
  toAmount: '712.3456'
}, 2, config.DEFAULT_CURRENCY_RATES)
assert.equal(liveCurrency.source, 'live')
assert.equal(liveCurrency.queryDate, '2026-07-01')
assert.equal(liveCurrency.rate, 7.123456)
assert.equal(liveCurrency.convertedValue, 712.35)
assert.equal(liveCurrency.warnings.length, 1)
assert.ok(liveCurrency.warnings.some((warning) => warning.includes('实际交易渠道')))

const snapshot = {
  module: 'basic',
  title: '基础计算',
  summary: {
    expression: '1+1',
    result: '2'
  },
  generatedAt: '2026-06-30T00:00:00.000Z'
}
assert.match(exporters.formatCalculatorSnapshot(snapshot, 'txt'), /基础计算/)
assert.deepEqual(JSON.parse(exporters.formatCalculatorSnapshot(snapshot, 'json')).summary.result, '2')
assert.match(exporters.formatCalculatorSnapshot(snapshot, 'csv'), /^key,value\n/)

console.log('calculator tests passed')
