<template>
  <div class="stock-tracker-page">
    <header class="stock-topbar">
      <div class="topbar-title">
        <h1>股票跟踪</h1>
        <el-tag type="success" effect="light">公开工具</el-tag>
        <el-tag type="warning" effect="light">多市场行情代理</el-tag>
        <span class="privacy-copy">自选股和设置仅保存在当前浏览器。</span>
      </div>
      <div class="topbar-actions">
        <ToolHomeButton />
        <el-button :loading="loading" :disabled="!selectedSymbol" @click="refreshCurrent">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button :disabled="!watchlist.length" @click="exportWatchlist">
          <el-icon><Download /></el-icon>
          导出自选
        </el-button>
        <el-button @click="triggerImport">
          <el-icon><Upload /></el-icon>
          导入自选
        </el-button>
        <input ref="importInputRef" class="hidden-file" type="file" accept="application/json,.json" @change="handleImport" />
        <el-button type="danger" plain @click="clearLocalState">
          <el-icon><Delete /></el-icon>
          清空本地
        </el-button>
      </div>
    </header>

    <main class="stock-workbench">
      <aside class="watch-panel">
        <section class="add-panel">
          <div class="section-head">
            <div>
              <h2>自选股</h2>
              <p>支持 159516.SZ、00700.HK、AAPL.US、NVDA。</p>
            </div>
            <el-tag effect="plain">{{ watchlist.length }}/20</el-tag>
          </div>
          <div class="add-row">
            <el-input
              v-model="symbolInput"
              clearable
              placeholder="输入股票/ETF代码"
              @keyup.enter="addSymbol"
            />
            <el-button type="primary" @click="addSymbol">
              <el-icon><Plus /></el-icon>
              添加
            </el-button>
          </div>
        </section>

        <section class="settings-panel">
          <div class="setting-line">
            <span>周期</span>
            <el-select v-model="activeInterval" size="small" @change="reloadCandles">
              <el-option
                v-for="item in intervalOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </div>
          <div class="setting-line">
            <span>自动刷新</span>
            <el-switch v-model="autoRefresh" />
          </div>
          <div class="setting-line">
            <span>间隔</span>
            <el-select v-model="refreshSeconds" size="small" :disabled="!autoRefresh">
              <el-option label="5秒" :value="5" />
              <el-option label="10秒" :value="10" />
              <el-option label="30秒" :value="30" />
              <el-option label="60秒" :value="60" />
              <el-option label="120秒" :value="120" />
              <el-option label="300秒" :value="300" />
            </el-select>
          </div>
        </section>

        <section class="watch-list" aria-label="自选股列表">
          <el-empty v-if="!watchlist.length" description="添加股票后会保存到本地浏览器" />
          <draggable
            v-else
            v-model="watchlist"
            item-key="symbol"
            tag="div"
            class="watch-sort-list"
            handle=".watch-drag-handle"
            ghost-class="watch-row-ghost"
            chosen-class="watch-row-chosen"
            drag-class="watch-row-drag"
            :animation="160"
            @end="handleWatchSortEnd"
          >
            <template #item="{ element: item }">
              <div :class="['watch-row', { active: item.symbol === selectedSymbol }]">
                <button
                  type="button"
                  class="watch-drag-handle"
                  :aria-label="`拖拽排序${item.symbol}`"
                  title="拖拽排序"
                >
                  <el-icon><Rank /></el-icon>
                </button>
                <button type="button" class="watch-main" @click="selectSymbol(item.symbol)">
                  <span class="watch-name">{{ quoteMap[item.symbol]?.name || item.name || item.symbol }}</span>
                  <span class="watch-symbol">{{ formatDisplaySymbol(item) }}</span>
                </button>
                <div class="watch-quote">
                  <strong :class="trendClass(quoteMap[item.symbol]?.changePercent)">
                    {{ formatPrice(quoteMap[item.symbol]?.price) }}
                  </strong>
                  <span :class="trendClass(quoteMap[item.symbol]?.changePercent)">
                    {{ formatPercent(quoteMap[item.symbol]?.changePercent) }}
                  </span>
                </div>
                <el-button text circle :aria-label="`删除${item.symbol}`" @click="removeSymbol(item.symbol)">
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
            </template>
          </draggable>
        </section>
      </aside>

      <section class="market-panel">
        <div class="market-head">
          <div>
            <h2>{{ currentQuote?.name || selectedSymbol || '选择股票' }}</h2>
            <p>
              {{ currentQuote ? `${currentQuote.symbol}.${currentQuote.exchange} / ${currentQuote.source}` : '添加或选择股票、ETF' }}
            </p>
          </div>
          <div class="market-state">
            <span>{{ lastRefreshText }}</span>
            <el-tag v-if="currentSeries" effect="plain">{{ currentSeries.intervalLabel }}</el-tag>
          </div>
        </div>

        <el-alert
          v-if="apiError"
          class="state-alert"
          type="error"
          :title="apiError"
          show-icon
          :closable="false"
        />

        <section class="quote-strip" aria-label="行情摘要">
          <article>
            <span>最新价</span>
            <strong :class="trendClass(currentQuote?.changePercent)">{{ formatPrice(currentQuote?.price) }}</strong>
          </article>
          <article>
            <span>涨跌额</span>
            <strong :class="trendClass(currentQuote?.changePercent)">{{ formatSigned(currentQuote?.change) }}</strong>
          </article>
          <article>
            <span>涨跌幅</span>
            <strong :class="trendClass(currentQuote?.changePercent)">{{ formatPercent(currentQuote?.changePercent) }}</strong>
          </article>
          <article>
            <span>今开</span>
            <strong>{{ formatPrice(currentQuote?.open) }}</strong>
          </article>
          <article>
            <span>最高</span>
            <strong>{{ formatPrice(currentQuote?.high) }}</strong>
          </article>
          <article>
            <span>最低</span>
            <strong>{{ formatPrice(currentQuote?.low) }}</strong>
          </article>
          <article>
            <span>成交量</span>
            <strong>{{ formatCompactNumber(currentQuote?.volume) }}</strong>
          </article>
          <article>
            <span>成交额</span>
            <strong>{{ formatCompactNumber(currentQuote?.amount) }}</strong>
          </article>
        </section>

        <section class="chart-panel">
          <div class="chart-toolbar">
            <el-radio-group v-model="activeInterval" @change="reloadCandles">
              <el-radio-button
                v-for="item in intervalOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.shortLabel }}
              </el-radio-button>
            </el-radio-group>
            <div class="chart-legend">
              <span><i class="ma ma5" />MA5</span>
              <span><i class="ma ma10" />MA10</span>
              <span><i class="ma ma20" />MA20</span>
            </div>
          </div>

          <div class="chart-box">
            <div ref="chartContainerRef" class="chart-container" />
            <div v-if="loading" class="chart-overlay">
              <el-icon class="is-loading"><Refresh /></el-icon>
              <span>正在加载行情</span>
            </div>
            <el-empty
              v-else-if="!currentSeries?.candles.length"
              class="chart-empty"
              description="暂无K线数据"
            />
          </div>
        </section>

        <section class="detail-panel">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="K线数据" name="candles">
              <el-table :data="recentCandles" border stripe empty-text="暂无K线数据">
                <el-table-column prop="tradeTime" label="时间" min-width="150" />
                <el-table-column label="开盘" width="100">
                  <template #default="{ row }">{{ formatPrice(row.open) }}</template>
                </el-table-column>
                <el-table-column label="收盘" width="100">
                  <template #default="{ row }">{{ formatPrice(row.close) }}</template>
                </el-table-column>
                <el-table-column label="最高" width="100">
                  <template #default="{ row }">{{ formatPrice(row.high) }}</template>
                </el-table-column>
                <el-table-column label="最低" width="100">
                  <template #default="{ row }">{{ formatPrice(row.low) }}</template>
                </el-table-column>
                <el-table-column label="涨跌幅" width="110">
                  <template #default="{ row }">
                    <span :class="trendClass(row.changePercent)">{{ formatPercent(row.changePercent) }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="成交量" min-width="120">
                  <template #default="{ row }">{{ formatCompactNumber(row.volume) }}</template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="数据说明" name="notes">
              <div class="note-list">
                <el-alert
                  v-for="warning in allWarnings"
                  :key="warning"
                  type="warning"
                  show-icon
                  :closable="false"
                  :title="warning"
                />
                <el-alert
                  type="info"
                  show-icon
                  :closable="false"
                  title="自选股、周期和自动刷新设置仅保存在当前浏览器 localStorage，服务端不保存这些偏好。"
                />
              </div>
            </el-tab-pane>
          </el-tabs>
        </section>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Close, Delete, Download, Plus, Rank, Refresh, Upload } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
  type UTCTimestamp
} from 'lightweight-charts'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import {
  queryStockBatchQuotes,
  queryStockCandles,
  queryStockQuote
} from '@/api/stockTracker'
import type {
  StockTrackerCandleSeriesVo,
  StockTrackerCandleVo,
  StockTrackerInterval,
  StockTrackerLocalState,
  StockTrackerQuoteVo
} from '@/types/stockTracker'
import {
  addWatchItem,
  buildStockTrackerExport,
  clearStockTrackerState,
  formatDisplaySymbol,
  loadStockTrackerState,
  parseStockTrackerImport,
  removeWatchItem,
  saveStockTrackerState,
  updateWatchItemName
} from '@/utils/stock-tracker/storage'
import {
  calculateMovingAverage,
  formatChartCrosshairTime,
  formatChartTickTime,
  formatCompactNumber,
  getIntradayVisibleRange,
  getQuoteTrendType,
  toChartTimestamp
} from '@/utils/stock-tracker/indicators'

const SUCCESS_CODE = 200

const intervalOptions: Array<{ value: StockTrackerInterval; label: string; shortLabel: string; limit: number }> = [
  { value: 'intraday', label: '当日分时', shortLabel: '分时', limit: 240 },
  { value: 'daily', label: '日K', shortLabel: '日K', limit: 180 },
  { value: 'weekly', label: '周K', shortLabel: '周K', limit: 120 },
  { value: 'monthly', label: '月K', shortLabel: '月K', limit: 120 }
]

const initialState = loadStockTrackerState()

const watchlist = ref(initialState.watchlist)
const selectedSymbol = ref(initialState.selectedSymbol)
const activeInterval = ref<StockTrackerInterval>(initialState.interval)
const autoRefresh = ref(initialState.autoRefresh)
const refreshSeconds = ref(initialState.refreshSeconds)
const symbolInput = ref('')
const currentQuote = ref<StockTrackerQuoteVo>()
const currentSeries = ref<StockTrackerCandleSeriesVo>()
const quoteMap = ref<Record<string, StockTrackerQuoteVo>>({})
const loading = ref(false)
const apiError = ref('')
const activeTab = ref('candles')
const lastRefreshedAt = ref<string>()
const chartContainerRef = ref<HTMLDivElement>()
const importInputRef = ref<HTMLInputElement>()

let chart: IChartApi | undefined
let candleSeries: ISeriesApi<'Candlestick'> | undefined
let volumeSeries: ISeriesApi<'Histogram'> | undefined
let ma5Series: ISeriesApi<'Line'> | undefined
let ma10Series: ISeriesApi<'Line'> | undefined
let ma20Series: ISeriesApi<'Line'> | undefined
let resizeObserver: ResizeObserver | undefined
let refreshTimer: number | undefined

const selectedIntervalOption = computed(() => intervalOptions.find((item) => item.value === activeInterval.value) || intervalOptions[0])

const recentCandles = computed(() => {
  return [...(currentSeries.value?.candles || [])].slice(-80).reverse()
})

const allWarnings = computed(() => {
  const warnings = [
    ...(currentQuote.value?.warnings || []),
    ...(currentSeries.value?.warnings || [])
  ]
  return Array.from(new Set(warnings))
})

const lastRefreshText = computed(() => {
  if (!lastRefreshedAt.value) {
    return '尚未刷新'
  }
  return `更新 ${formatDateTime(lastRefreshedAt.value)}`
})

const persistState = () => {
  const state: StockTrackerLocalState = {
    watchlist: watchlist.value,
    selectedSymbol: selectedSymbol.value,
    interval: activeInterval.value,
    autoRefresh: autoRefresh.value,
    refreshSeconds: refreshSeconds.value
  }
  saveStockTrackerState(state)
}

const addSymbol = async () => {
  try {
    const nextList = addWatchItem(watchlist.value, symbolInput.value)
    const nextSymbol = nextList[0]?.symbol
    watchlist.value = nextList
    symbolInput.value = ''
    selectedSymbol.value = nextSymbol
    persistState()
    await refreshCurrent()
    ElMessage.success('已保存到本地自选股')
  } catch (error: any) {
    ElMessage.warning(error?.message || '股票代码不正确')
  }
}

const removeSymbol = (symbol: string) => {
  watchlist.value = removeWatchItem(watchlist.value, symbol)
  if (selectedSymbol.value === symbol) {
    selectedSymbol.value = watchlist.value[0]?.symbol
    currentQuote.value = undefined
    currentSeries.value = undefined
    if (selectedSymbol.value) {
      refreshCurrent()
    } else {
      renderChart()
    }
  }
  persistState()
}

const handleWatchSortEnd = () => {
  persistState()
}

const selectSymbol = async (symbol: string) => {
  if (selectedSymbol.value === symbol) {
    return
  }
  selectedSymbol.value = symbol
  persistState()
  await refreshCurrent()
}

const refreshCurrent = async () => {
  if (!selectedSymbol.value) {
    apiError.value = '请先添加或选择一只股票或ETF'
    return
  }

  loading.value = true
  apiError.value = ''
  try {
    const [quoteResponse, candlesResponse] = await Promise.all([
      queryStockQuote(selectedSymbol.value),
      queryStockCandles(selectedSymbol.value, activeInterval.value, selectedIntervalOption.value.limit)
    ])

    if (quoteResponse.code === SUCCESS_CODE && quoteResponse.data) {
      currentQuote.value = quoteResponse.data
      quoteMap.value = {
        ...quoteMap.value,
        [quoteResponse.data.symbol]: quoteResponse.data
      }
      watchlist.value = updateWatchItemName(watchlist.value, quoteResponse.data.symbol, quoteResponse.data.name)
    } else {
      apiError.value = quoteResponse.message || '行情快照加载失败'
    }

    if (candlesResponse.code === SUCCESS_CODE && candlesResponse.data) {
      currentSeries.value = candlesResponse.data
    } else {
      apiError.value = candlesResponse.message || apiError.value || 'K线加载失败'
      currentSeries.value = undefined
    }

    lastRefreshedAt.value = new Date().toISOString()
    persistState()
    await refreshWatchQuotes()
    await nextTick()
    renderChart()
  } catch (error: any) {
    apiError.value = error?.message || '行情服务请求失败'
    renderChart()
  } finally {
    loading.value = false
  }
}

const reloadCandles = async () => {
  persistState()
  await refreshCurrent()
}

const refreshWatchQuotes = async () => {
  if (!watchlist.value.length) {
    quoteMap.value = {}
    return
  }
  const response = await queryStockBatchQuotes(watchlist.value.map((item) => item.symbol))
  if (response.code !== SUCCESS_CODE || !response.data) {
    return
  }
  const nextMap = { ...quoteMap.value }
  response.data.forEach((quote) => {
    nextMap[quote.symbol] = quote
    watchlist.value = updateWatchItemName(watchlist.value, quote.symbol, quote.name)
  })
  quoteMap.value = nextMap
}

const triggerImport = () => {
  importInputRef.value?.click()
}

const handleImport = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }
  try {
    const imported = parseStockTrackerImport(await file.text())
    watchlist.value = imported.watchlist
    selectedSymbol.value = imported.selectedSymbol
    activeInterval.value = imported.interval
    autoRefresh.value = imported.autoRefresh
    refreshSeconds.value = imported.refreshSeconds
    persistState()
    await refreshCurrent()
    ElMessage.success('已导入自选股')
  } catch {
    ElMessage.error('自选股文件格式不正确')
  }
}

const exportWatchlist = () => {
  const content = buildStockTrackerExport({
    watchlist: watchlist.value,
    selectedSymbol: selectedSymbol.value,
    interval: activeInterval.value,
    autoRefresh: autoRefresh.value,
    refreshSeconds: refreshSeconds.value
  })
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `stock-tracker-watchlist-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const clearLocalState = async () => {
  try {
    await ElMessageBox.confirm('将清空本地保存的自选股和设置，当前行情也会被清除。', '清空本地数据', {
      type: 'warning',
      confirmButtonText: '清空',
      cancelButtonText: '取消'
    })
    clearStockTrackerState()
    watchlist.value = []
    selectedSymbol.value = undefined
    currentQuote.value = undefined
    currentSeries.value = undefined
    quoteMap.value = {}
    apiError.value = ''
    lastRefreshedAt.value = undefined
    renderChart()
    ElMessage.success('已清空本地数据')
  } catch {
    // user canceled
  }
}

const initChart = () => {
  if (!chartContainerRef.value || chart) {
    return
  }
  chart = createChart(chartContainerRef.value, {
    height: 430,
    layout: {
      background: {
        type: ColorType.Solid,
        color: '#ffffff'
      },
      textColor: '#263238'
    },
    grid: {
      vertLines: { color: '#eef2f6' },
      horzLines: { color: '#eef2f6' }
    },
    rightPriceScale: {
      borderVisible: false
    },
    localization: {
      locale: 'zh-CN',
      timeFormatter: (time: Time) => formatChartCrosshairTime(time, activeInterval.value)
    },
    timeScale: {
      borderVisible: false,
      timeVisible: activeInterval.value === 'intraday',
      tickMarkFormatter: (time: Time) => formatChartTickTime(time, activeInterval.value)
    },
    crosshair: {
      mode: 1
    }
  })

  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#d93026',
    borderUpColor: '#d93026',
    wickUpColor: '#d93026',
    downColor: '#16835f',
    borderDownColor: '#16835f',
    wickDownColor: '#16835f'
  })
  volumeSeries = chart.addSeries(HistogramSeries, {
    priceFormat: {
      type: 'volume'
    },
    priceScaleId: 'volume',
    lastValueVisible: false,
    priceLineVisible: false
  })
  chart.priceScale('volume').applyOptions({
    scaleMargins: {
      top: 0.78,
      bottom: 0
    }
  })
  ma5Series = chart.addSeries(LineSeries, { color: '#f5a623', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
  ma10Series = chart.addSeries(LineSeries, { color: '#1f78d1', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
  ma20Series = chart.addSeries(LineSeries, { color: '#7b61ff', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })

  resizeObserver = new ResizeObserver(() => {
    if (chart && chartContainerRef.value) {
      chart.applyOptions({ width: chartContainerRef.value.clientWidth })
    }
  })
  resizeObserver.observe(chartContainerRef.value)
}

const renderChart = () => {
  if (!chart) {
    return
  }
  const candles = currentSeries.value?.candles || []
  if (!candles.length) {
    candleSeries?.setData([])
    volumeSeries?.setData([])
    ma5Series?.setData([])
    ma10Series?.setData([])
    ma20Series?.setData([])
    return
  }

  const candlestickData: CandlestickData[] = candles.map((item) => ({
    time: getChartTime(item),
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close
  }))
  const volumeData: HistogramData[] = candles.map((item) => ({
    time: getChartTime(item),
    value: item.volume || 0,
    color: item.close >= item.open ? 'rgba(217, 48, 38, 0.35)' : 'rgba(22, 131, 95, 0.35)'
  }))

  candleSeries?.setData(candlestickData)
  volumeSeries?.setData(volumeData)
  ma5Series?.setData(toLineData(candles, 5))
  ma10Series?.setData(toLineData(candles, 10))
  ma20Series?.setData(toLineData(candles, 20))
  chart.applyOptions({
    localization: {
      locale: 'zh-CN',
      timeFormatter: (time: Time) => formatChartCrosshairTime(time, activeInterval.value)
    },
    timeScale: {
      timeVisible: activeInterval.value === 'intraday',
      tickMarkFormatter: (time: Time) => formatChartTickTime(time, activeInterval.value)
    }
  })
  if (activeInterval.value === 'intraday') {
    const visibleRange = getIntradayVisibleRange(candles[0].tradeTime, currentSeries.value?.market)
    if (visibleRange) {
      chart.timeScale().setVisibleRange({
        from: visibleRange.from as UTCTimestamp,
        to: visibleRange.to as UTCTimestamp
      })
      return
    }
  }
  chart.timeScale().fitContent()
}

const toLineData = (candles: StockTrackerCandleVo[], period: number): LineData[] => {
  const chartTimeMap = new Map(candles.map((item) => [item.time, getChartTime(item)]))
  return calculateMovingAverage(candles, period).map((item) => ({
    time: chartTimeMap.get(item.time) || (item.time as UTCTimestamp),
    value: item.value
  }))
}

const getChartTime = (candle: StockTrackerCandleVo): UTCTimestamp => {
  return toChartTimestamp(candle.tradeTime, candle.time) as UTCTimestamp
}

const setupAutoRefresh = () => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
    refreshTimer = undefined
  }
  if (!autoRefresh.value || !selectedSymbol.value) {
    return
  }
  refreshTimer = window.setInterval(() => {
    refreshCurrent()
  }, refreshSeconds.value * 1000)
}

const trendClass = (changePercent?: number) => {
  return `trend-${getQuoteTrendType(changePercent)}`
}

const formatPrice = (value?: number) => {
  return value == null ? '-' : value.toFixed(2)
}

const formatSigned = (value?: number) => {
  if (value == null) {
    return '-'
  }
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`
}

const formatPercent = (value?: number) => {
  if (value == null) {
    return '-'
  }
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

watch([watchlist, selectedSymbol, activeInterval, autoRefresh, refreshSeconds], () => {
  persistState()
}, { deep: true })

watch([autoRefresh, refreshSeconds, selectedSymbol], setupAutoRefresh)

onMounted(async () => {
  await nextTick()
  initChart()
  if (selectedSymbol.value) {
    await refreshCurrent()
  } else {
    renderChart()
  }
  setupAutoRefresh()
})

onUnmounted(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
  }
  resizeObserver?.disconnect()
  chart?.remove()
})
</script>

<style scoped>
.stock-tracker-page {
  min-height: 100vh;
  background: #f5f7fb;
  color: #1f2937;
  padding: 20px;
}

.stock-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.topbar-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.topbar-title h1 {
  margin: 0 8px 0 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
}

.privacy-copy {
  color: #64748b;
  font-size: 13px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.hidden-file {
  display: none;
}

.stock-workbench {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 16px;
}

.watch-panel,
.market-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.watch-panel {
  align-self: start;
  overflow: hidden;
}

.add-panel,
.settings-panel,
.watch-list {
  padding: 16px;
}

.add-panel,
.settings-panel {
  border-bottom: 1px solid #edf1f7;
}

.section-head,
.market-head,
.chart-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-head h2,
.market-head h2 {
  margin: 0;
  font-size: 18px;
  line-height: 24px;
}

.section-head p,
.market-head p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 18px;
}

.add-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 14px;
}

.setting-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 36px;
  color: #475569;
  font-size: 14px;
}

.setting-line + .setting-line {
  margin-top: 8px;
}

.watch-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 310px);
  min-height: 320px;
  overflow: auto;
}

.watch-sort-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.watch-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto 32px;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.watch-row.active {
  border-color: #409eff;
  background: #f0f7ff;
}

.watch-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  cursor: grab;
}

.watch-drag-handle:active {
  cursor: grabbing;
}

.watch-drag-handle:hover,
.watch-row.active .watch-drag-handle {
  background: #eaf4ff;
  color: #409eff;
}

.watch-row-ghost {
  opacity: 0.45;
}

.watch-row-chosen {
  border-color: #409eff;
}

.watch-row-drag {
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
}

.watch-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.watch-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #111827;
  font-weight: 600;
}

.watch-symbol {
  color: #64748b;
  font-size: 12px;
  margin-top: 2px;
}

.watch-quote {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 70px;
  font-size: 12px;
}

.market-panel {
  min-width: 0;
  padding: 18px;
}

.market-head {
  align-items: center;
  margin-bottom: 14px;
}

.market-state {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
}

.state-alert {
  margin-bottom: 14px;
}

.quote-strip {
  display: grid;
  grid-template-columns: repeat(8, minmax(90px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.quote-strip article {
  min-width: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  background: #fbfdff;
}

.quote-strip span {
  display: block;
  color: #64748b;
  font-size: 12px;
  line-height: 16px;
}

.quote-strip strong {
  display: block;
  margin-top: 6px;
  font-size: 18px;
  line-height: 24px;
  overflow-wrap: anywhere;
}

.chart-panel,
.detail-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.chart-panel {
  margin-bottom: 16px;
}

.chart-toolbar {
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #edf1f7;
}

.chart-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  color: #64748b;
  font-size: 12px;
}

.chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ma {
  width: 18px;
  height: 2px;
  border-radius: 999px;
  display: inline-block;
}

.ma5 {
  background: #f5a623;
}

.ma10 {
  background: #1f78d1;
}

.ma20 {
  background: #7b61ff;
}

.chart-box {
  position: relative;
  min-height: 430px;
}

.chart-container {
  width: 100%;
  height: 430px;
}

.chart-overlay,
.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.74);
  color: #475569;
}

.detail-panel {
  padding: 0 12px 12px;
}

.note-list {
  display: grid;
  gap: 10px;
  padding-top: 8px;
}

.trend-up {
  color: #d93026;
}

.trend-down {
  color: #16835f;
}

.trend-flat {
  color: #475569;
}

@media (max-width: 1180px) {
  .quote-strip {
    grid-template-columns: repeat(4, minmax(100px, 1fr));
  }
}

@media (max-width: 860px) {
  .stock-tracker-page {
    padding: 12px;
  }

  .stock-topbar,
  .stock-workbench {
    display: flex;
    flex-direction: column;
  }

  .topbar-actions {
    justify-content: flex-start;
  }

  .watch-list {
    max-height: none;
  }

  .quote-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
