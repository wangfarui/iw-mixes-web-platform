import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/stock-tracker-tests')

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

const storage = await bundleModule('src/utils/stock-tracker/storage.ts', 'storage.mjs')
const indicators = await bundleModule('src/utils/stock-tracker/indicators.ts', 'indicators.mjs')

assert.deepEqual(storage.normalizeStockSymbolInput('000001').exchange, 'SZ')
assert.deepEqual(storage.normalizeStockSymbolInput('600519').exchange, 'SH')
assert.deepEqual(storage.normalizeStockSymbolInput('159516.SZ').exchange, 'SZ')
assert.equal(storage.formatDisplaySymbol(storage.normalizeStockSymbolInput('159516')), '159516.SZ')
assert.equal(storage.formatDisplaySymbol(storage.normalizeStockSymbolInput('hk700')), '00700.HK')
assert.equal(storage.formatDisplaySymbol(storage.normalizeStockSymbolInput('00700.HK')), '00700.HK')
assert.equal(storage.formatDisplaySymbol(storage.normalizeStockSymbolInput('AAPL')), 'AAPL.US')
assert.equal(storage.formatDisplaySymbol(storage.normalizeStockSymbolInput('NASDAQ:NVDA')), 'NVDA.US')
assert.equal(storage.formatDisplaySymbol(storage.normalizeStockSymbolInput('sh600519')), '600519.SH')
assert.equal(storage.formatDisplaySymbol(storage.normalizeStockSymbolInput('0.300750')), '300750.SZ')
assert.throws(() => storage.normalizeStockSymbolInput('830000'), /当前仅支持沪深A股股票和ETF、港股、美股代码/)

const added = storage.addWatchItem([], '000001', '平安银行')
assert.equal(added.length, 1)
assert.equal(added[0].name, '平安银行')

const deduped = storage.addWatchItem(added, '000001')
assert.equal(deduped.length, 1)

const state = storage.createDefaultStockTrackerState()
const exported = storage.buildStockTrackerExport(state)
const imported = storage.parseStockTrackerImport(exported)
assert.equal(imported.watchlist.length, state.watchlist.length)
assert.equal(imported.interval, 'intraday')
assert.equal(imported.refreshSeconds, 5)

const candles = [
  { time: 1, close: 10 },
  { time: 2, close: 12 },
  { time: 3, close: 14 },
  { time: 4, close: 16 }
]
const ma = indicators.calculateMovingAverage(candles, 3)
assert.deepEqual(ma, [
  { time: 3, value: 12 },
  { time: 4, value: 14 }
])

assert.equal(indicators.getQuoteTrendType(1.2), 'up')
assert.equal(indicators.getQuoteTrendType(-0.5), 'down')
assert.equal(indicators.formatCompactNumber(123456789), '1.23亿')
assert.equal(
  indicators.toChartTimestamp('2026-07-02 09:30') - indicators.toChartTimestamp('2026-07-02 01:30'),
  8 * 60 * 60
)
assert.equal(indicators.toChartTimestamp('2026-07-02'), Date.UTC(2026, 6, 2) / 1000)
assert.equal(indicators.toChartTimestamp('bad-time', 123), 123)
assert.deepEqual(indicators.getIntradayVisibleRange('2026-07-02 10:03'), {
  from: Date.UTC(2026, 6, 2, 9, 30) / 1000,
  to: Date.UTC(2026, 6, 2, 15, 0) / 1000
})
assert.deepEqual(indicators.getIntradayVisibleRange('2026-07-02 10:03', 'US'), {
  from: Date.UTC(2026, 6, 2, 9, 30) / 1000,
  to: Date.UTC(2026, 6, 2, 16, 0) / 1000
})
assert.equal(indicators.getIntradayVisibleRange('bad-time'), undefined)
const chartTime = indicators.toChartTimestamp('2026-07-02 10:21')
assert.equal(indicators.formatChartCrosshairTime(chartTime, 'intraday'), '10:21')
assert.equal(indicators.formatChartTickTime(chartTime, 'intraday'), '10:21')
assert.equal(indicators.formatChartCrosshairTime(chartTime, 'daily'), '2026-07-02')
assert.equal(indicators.formatChartTickTime(chartTime, 'daily'), '07-02')
assert.equal(indicators.formatChartCrosshairTime(chartTime, 'weekly'), '2026-W27')
assert.equal(indicators.formatChartTickTime(chartTime, 'weekly'), '26-W27')
assert.equal(indicators.formatChartCrosshairTime(chartTime, 'monthly'), '2026-07')
assert.equal(indicators.formatChartTickTime(chartTime, 'monthly'), '2026-07')

console.log('stock tracker tests passed')
