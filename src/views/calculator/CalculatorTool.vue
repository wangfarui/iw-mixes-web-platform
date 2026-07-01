<template>
  <div class="calculator-page">
    <header class="calculator-topbar">
      <div class="topbar-title">
        <h1>全能计算器</h1>
        <el-tag type="success" effect="light">本地计算 / 不上传</el-tag>
        <span class="privacy-copy">汇率可实时查询，个税为当前内置规则估算。</span>
      </div>
      <div class="topbar-actions">
        <ToolHomeButton />
        <el-button :disabled="!currentSnapshot" @click="copyCurrentResult">
          <el-icon><CopyDocument /></el-icon>
          复制
        </el-button>
        <el-dropdown trigger="click" :disabled="!currentSnapshot" @command="handleExport">
          <el-button :disabled="!currentSnapshot">
            <el-icon><Download /></el-icon>
            导出
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="txt">TXT</el-dropdown-item>
              <el-dropdown-item command="csv">CSV</el-dropdown-item>
              <el-dropdown-item command="json">JSON</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button :disabled="!currentSnapshot" @click="handlePrint">
          <el-icon><Printer /></el-icon>
          打印
        </el-button>
        <el-button type="danger" plain @click="clearAll">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </header>

    <main class="calculator-workbench">
      <nav class="module-tabs" aria-label="计算模块">
        <el-radio-group v-model="activeModule">
          <el-radio-button
            v-for="item in moduleOptions"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </el-radio-button>
        </el-radio-group>
      </nav>

      <section v-if="activeModule === 'basic'" class="module-grid">
        <aside class="input-panel">
          <div class="section-head">
            <div>
              <h2>基础计算</h2>
              <p>支持括号、百分比、乘除、乘方。</p>
            </div>
            <el-button text @click="resetBasic">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </div>

          <el-form label-position="top">
            <el-form-item label="表达式">
              <el-input
                v-model="basicExpression"
                type="textarea"
                :rows="4"
                resize="none"
                input-style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;"
                @keydown.enter.exact.prevent="runBasic"
              />
            </el-form-item>
            <div class="calc-pad">
              <button
                v-for="item in calcPadItems"
                :key="item"
                type="button"
                @click="appendExpression(item)"
              >
                {{ item }}
              </button>
              <button type="button" @click="backspaceExpression">退格</button>
              <button type="button" @click="basicExpression = ''">清空</button>
            </div>
            <div class="form-actions">
              <el-button type="primary" @click="runBasic">
                <el-icon><Operation /></el-icon>
                计算
              </el-button>
            </div>
          </el-form>
        </aside>

        <section class="result-panel">
          <div class="result-header">
            <h2>结果</h2>
            <span v-if="basicResult">{{ basicResult.generatedAt }}</span>
          </div>
          <el-alert v-if="basicError" :title="basicError" type="error" show-icon :closable="false" />
          <el-empty v-else-if="!basicResult" description="输入表达式后计算" />
          <template v-else>
            <div class="big-result">{{ basicResult.displayValue }}</div>
            <div class="result-expression">{{ basicResult.expression }}</div>
            <el-divider />
            <div class="section-head compact">
              <div>
                <h3>当前会话记录</h3>
                <p>{{ basicHistory.length }} 条，不写入本地存储。</p>
              </div>
              <el-button text :disabled="!basicHistory.length" @click="basicHistory = []">清除记录</el-button>
            </div>
            <div class="history-list">
              <button
                v-for="item in basicHistory"
                :key="`${item.generatedAt}-${item.expression}`"
                type="button"
                @click="basicExpression = item.expression"
              >
                <span>{{ item.expression }}</span>
                <strong>{{ item.displayValue }}</strong>
              </button>
            </div>
          </template>
        </section>
      </section>

      <section v-if="activeModule === 'loan'" class="module-grid">
        <aside class="input-panel">
          <div class="section-head">
            <div>
              <h2>贷款计算</h2>
              <p>房贷、车贷月供和总成本。</p>
            </div>
            <el-button text @click="resetLoan">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </div>

          <el-form label-position="top" class="config-form">
            <div class="form-grid two">
              <el-form-item label="贷款类型">
                <el-select v-model="loanInput.kind">
                  <el-option label="房贷" value="mortgage" />
                  <el-option label="车贷" value="car" />
                </el-select>
              </el-form-item>
              <el-form-item label="还款方式">
                <el-select v-model="loanInput.method">
                  <el-option label="等额本息" value="equal-payment" />
                  <el-option label="等额本金" value="equal-principal" />
                </el-select>
              </el-form-item>
              <el-form-item :label="loanInput.kind === 'car' ? '车辆总价' : '房屋总价'">
                <el-input-number v-model="loanInput.totalPrice" :min="0" :step="10000" controls-position="right" />
              </el-form-item>
              <el-form-item label="首付金额">
                <el-input-number v-model="loanInput.downPayment" :min="0" :step="10000" controls-position="right" />
              </el-form-item>
              <el-form-item label="贷款金额">
                <el-input-number v-model="loanInput.principal" :min="0" :step="10000" controls-position="right" />
              </el-form-item>
              <el-form-item label="年利率（%）">
                <el-input-number v-model="loanInput.annualRate" :min="0" :step="0.05" :precision="3" controls-position="right" />
              </el-form-item>
              <el-form-item label="贷款期数（月）">
                <el-input-number v-model="loanInput.months" :min="1" :max="600" :step="12" controls-position="right" />
              </el-form-item>
              <el-form-item v-if="loanInput.kind === 'car'" label="手续费">
                <el-input-number v-model="loanInput.serviceFee" :min="0" :step="1000" controls-position="right" />
              </el-form-item>
            </div>
            <div class="form-actions split">
              <el-button @click="syncLoanPrincipal">按总价同步贷款额</el-button>
              <el-button type="primary" @click="runLoan">
                <el-icon><Operation /></el-icon>
                计算
              </el-button>
            </div>
          </el-form>
        </aside>

        <section class="result-panel">
          <div class="result-header">
            <h2>月供与明细</h2>
            <span v-if="loanResult">{{ loanResult.months }} 期</span>
          </div>
          <el-alert v-if="loanError" :title="loanError" type="error" show-icon :closable="false" />
          <el-empty v-else-if="!loanResult" description="填写贷款参数后计算" />
          <template v-else>
            <div class="kpi-grid four">
              <div class="kpi-item">
                <span>首月月供</span>
                <strong>{{ formatMoney(loanResult.firstPayment) }}</strong>
              </div>
              <div class="kpi-item">
                <span>平均月供</span>
                <strong>{{ formatMoney(loanResult.averagePayment) }}</strong>
              </div>
              <div class="kpi-item">
                <span>总利息</span>
                <strong>{{ formatMoney(loanResult.totalInterest) }}</strong>
              </div>
              <div class="kpi-item">
                <span>总成本</span>
                <strong>{{ formatMoney(loanResult.totalCost) }}</strong>
              </div>
            </div>
            <el-alert
              v-for="warning in loanResult.warnings"
              :key="warning"
              class="result-alert"
              :title="warning"
              type="warning"
              show-icon
              :closable="false"
            />
            <el-table :data="loanResult.schedule" height="420" size="small" class="schedule-table">
              <el-table-column prop="period" label="期数" width="72" />
              <el-table-column label="月供">
                <template #default="{ row }">{{ formatMoney(row.payment) }}</template>
              </el-table-column>
              <el-table-column label="本金">
                <template #default="{ row }">{{ formatMoney(row.principal) }}</template>
              </el-table-column>
              <el-table-column label="利息">
                <template #default="{ row }">{{ formatMoney(row.interest) }}</template>
              </el-table-column>
              <el-table-column label="剩余本金">
                <template #default="{ row }">{{ formatMoney(row.remainingPrincipal) }}</template>
              </el-table-column>
            </el-table>
          </template>
        </section>
      </section>

      <section v-if="activeModule === 'tax'" class="module-grid">
        <aside class="input-panel">
          <div class="section-head">
            <div>
              <h2>个税年终奖</h2>
              <p>{{ taxPolicyLabel }}</p>
            </div>
            <el-button text @click="resetTax">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </div>

          <el-form label-position="top" class="config-form">
            <div class="form-grid two">
              <el-form-item label="年终奖金额">
                <el-input-number v-model="taxInput.bonus" :min="0" :step="1000" controls-position="right" />
              </el-form-item>
              <el-form-item label="不含年终奖年度收入">
                <el-input-number v-model="taxInput.annualIncomeWithoutBonus" :min="0" :step="1000" controls-position="right" />
              </el-form-item>
              <el-form-item label="年度基本减除费用">
                <el-input-number v-model="taxInput.basicDeduction" :min="0" :step="1000" controls-position="right" />
              </el-form-item>
              <el-form-item label="专项扣除">
                <el-input-number v-model="taxInput.specialDeductions" :min="0" :step="1000" controls-position="right" />
              </el-form-item>
              <el-form-item label="专项附加扣除">
                <el-input-number v-model="taxInput.specialAdditionalDeductions" :min="0" :step="1000" controls-position="right" />
              </el-form-item>
              <el-form-item label="其他扣除">
                <el-input-number v-model="taxInput.otherDeductions" :min="0" :step="1000" controls-position="right" />
              </el-form-item>
            </div>
            <div class="form-actions">
              <el-button type="primary" @click="runTax">
                <el-icon><Operation /></el-icon>
                计算
              </el-button>
            </div>
          </el-form>
        </aside>

        <section class="result-panel">
          <div class="result-header">
            <h2>计税对比</h2>
            <span v-if="taxResult">有效期至 {{ taxResult.policyValidUntil }}</span>
          </div>
          <el-alert v-if="taxError" :title="taxError" type="error" show-icon :closable="false" />
          <el-empty v-else-if="!taxResult" description="填写收入和扣除后计算" />
          <template v-else>
            <div class="recommendation" :class="taxResult.recommendation">
              <span>推荐方式</span>
              <strong>{{ taxRecommendationLabel }}</strong>
              <em>差额 {{ formatMoney(Math.abs(taxResult.savingByStandalone)) }}</em>
            </div>
            <div class="kpi-grid three">
              <div class="kpi-item">
                <span>单独计税税额</span>
                <strong>{{ formatMoney(taxResult.bonusTaxStandalone.tax) }}</strong>
              </div>
              <div class="kpi-item">
                <span>并入后增量税额</span>
                <strong>{{ formatMoney(taxResult.mergedBonusIncrementalTax) }}</strong>
              </div>
              <div class="kpi-item">
                <span>并入后全年税额</span>
                <strong>{{ formatMoney(taxResult.mergedTotalTax) }}</strong>
              </div>
            </div>
            <el-table :data="taxCompareRows" size="small" class="compare-table">
              <el-table-column prop="name" label="项目" />
              <el-table-column prop="taxable" label="应纳税所得额" />
              <el-table-column prop="rate" label="税率" />
              <el-table-column prop="deduction" label="速算扣除数" />
              <el-table-column prop="tax" label="税额" />
            </el-table>
            <el-alert
              v-for="warning in taxResult.warnings"
              :key="warning"
              class="result-alert"
              :title="warning"
              type="warning"
              show-icon
              :closable="false"
            />
          </template>
        </section>
      </section>

      <section v-if="activeModule === 'unit'" class="module-grid">
        <aside class="input-panel">
          <div class="section-head">
            <div>
              <h2>单位换算</h2>
              <p>长度、重量、面积、体积、温度、数据容量。</p>
            </div>
            <el-button text @click="resetUnit">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </div>

          <el-form label-position="top" class="config-form">
            <el-form-item label="类别">
              <el-select v-model="unitInput.category">
                <el-option
                  v-for="item in UNIT_CATEGORIES"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <div class="form-grid two">
              <el-form-item label="数值">
                <el-input-number v-model="unitInput.amount" :step="1" controls-position="right" />
              </el-form-item>
              <el-form-item label="小数位">
                <el-input-number v-model="unitInput.precision" :min="0" :max="8" :step="1" controls-position="right" />
              </el-form-item>
              <el-form-item label="从">
                <el-select v-model="unitInput.fromUnit">
                  <el-option
                    v-for="item in unitOptions"
                    :key="item.value"
                    :label="`${item.label} (${item.symbol})`"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="到">
                <el-select v-model="unitInput.toUnit">
                  <el-option
                    v-for="item in unitOptions"
                    :key="item.value"
                    :label="`${item.label} (${item.symbol})`"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
            </div>
            <div class="form-actions">
              <el-button type="primary" @click="runUnit">
                <el-icon><Operation /></el-icon>
                换算
              </el-button>
            </div>
          </el-form>
        </aside>

        <section class="result-panel">
          <div class="result-header">
            <h2>换算结果</h2>
            <span v-if="unitResult">{{ unitResult.fromUnit.symbol }} -> {{ unitResult.toUnit.symbol }}</span>
          </div>
          <el-alert v-if="unitError" :title="unitError" type="error" show-icon :closable="false" />
          <el-empty v-else-if="!unitResult" description="选择单位后换算" />
          <template v-else>
            <div class="conversion-line">
              <span>{{ unitResult.amount }} {{ unitResult.fromUnit.symbol }}</span>
              <strong>{{ unitResult.convertedValue }} {{ unitResult.toUnit.symbol }}</strong>
            </div>
            <div class="formula-box">{{ unitResult.formula }}</div>
          </template>
        </section>
      </section>

      <section v-if="activeModule === 'currency'" class="module-grid">
        <aside class="input-panel">
          <div class="section-head">
            <div>
              <h2>汇率换算</h2>
              <p>实时查询 iw-external 汇率，手动模式可作为兜底。</p>
            </div>
            <el-button text @click="resetCurrency">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </div>

          <el-form label-position="top" class="config-form">
            <el-form-item label="模式">
              <el-radio-group v-model="currencyMode">
                <el-radio-button value="live">实时汇率</el-radio-button>
                <el-radio-button value="manual">手动汇率</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <div class="form-grid two">
              <el-form-item label="金额">
                <el-input-number v-model="currencyInput.amount" :min="0" :step="100" controls-position="right" />
              </el-form-item>
              <el-form-item label="小数位">
                <el-input-number v-model="currencyInput.precision" :min="0" :max="8" :step="1" controls-position="right" />
              </el-form-item>
              <div class="currency-pair-row">
                <el-form-item label="从">
                  <el-select v-model="currencyInput.fromCurrency" filterable allow-create default-first-option>
                    <el-option
                      v-for="item in currencyRates"
                      :key="item.code"
                      :label="`${item.label} (${item.code})`"
                      :value="item.code"
                    />
                  </el-select>
                </el-form-item>
                <el-tooltip content="交换币种" placement="top">
                  <el-button
                    class="currency-swap-button"
                    :disabled="currencyLoading"
                    aria-label="交换币种"
                    @click="swapCurrencies"
                  >
                    <el-icon><SwitchIcon /></el-icon>
                  </el-button>
                </el-tooltip>
                <el-form-item label="到">
                  <el-select v-model="currencyInput.toCurrency" filterable allow-create default-first-option>
                    <el-option
                      v-for="item in currencyRates"
                      :key="item.code"
                      :label="`${item.label} (${item.code})`"
                      :value="item.code"
                    />
                  </el-select>
                </el-form-item>
              </div>
              <el-form-item v-if="currencyMode === 'live'" label="查询日期">
                <el-date-picker
                  v-model="currencyInput.queryDate"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="默认今天"
                />
              </el-form-item>
            </div>
            <div v-if="currencyMode === 'manual'" class="rate-editor">
              <div class="mode-note">手动模式按“1 单位币种 = N 人民币”换算。</div>
              <div v-for="rate in manualCurrencyRates" :key="rate.code" class="rate-row">
                <span>{{ rate.code }}</span>
                <el-input-number v-model="rate.rateToCny" :min="0.000001" :step="0.01" :precision="6" controls-position="right" />
              </div>
            </div>
            <div class="form-actions">
              <el-button type="primary" :loading="currencyLoading" @click="runCurrency">
                <el-icon><Operation /></el-icon>
                {{ currencyMode === 'live' ? '查询汇率' : '换算' }}
              </el-button>
            </div>
          </el-form>
        </aside>

        <section class="result-panel">
          <div class="result-header">
            <h2>汇率结果</h2>
            <span v-if="currencyResult">
              {{ currencyResult.source === 'live' ? '实时' : '手动' }} · {{ currencyResult.queryDate }} ·
              1 {{ currencyResult.fromCurrency.code }} = {{ currencyResult.rate }} {{ currencyResult.toCurrency.code }}
            </span>
          </div>
          <el-alert v-if="currencyError" :title="currencyError" type="error" show-icon :closable="false" />
          <el-empty v-else-if="!currencyResult" description="查询实时汇率，或切换手动模式换算" />
          <template v-else>
            <div class="conversion-line">
              <span>{{ currencyResult.amount }} {{ currencyResult.fromCurrency.code }}</span>
              <strong>{{ currencyResult.convertedValue }} {{ currencyResult.toCurrency.code }}</strong>
            </div>
            <el-alert
              v-for="warning in currencyResult.warnings"
              :key="warning"
              class="result-alert"
              :title="warning"
              type="warning"
              show-icon
              :closable="false"
            />
          </template>
        </section>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowDown,
  CopyDocument,
  Delete,
  Download,
  Operation,
  Printer,
  RefreshRight,
  Switch as SwitchIcon
} from '@element-plus/icons-vue'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import type {
  BasicCalculationResult,
  CalculatorExportFormat,
  CalculatorModule,
  CalculatorSnapshot,
  CurrencyConversionResult,
  LoanResult,
  UnitConversionResult,
  YearEndBonusTaxResult
} from '@/types/calculator'
import {
  createDefaultLoanInput,
  createDefaultUnitInput,
  createDefaultYearEndBonusTaxInput,
  DEFAULT_CURRENCY_RATES,
  UNIT_CATEGORIES,
  YEAR_END_BONUS_POLICY_VALID_UNTIL
} from '@/utils/calculator/config'
import { calculateExpression } from '@/utils/calculator/basic'
import { calculateLoan } from '@/utils/calculator/loan'
import { calculateYearEndBonusTax } from '@/utils/calculator/tax'
import { convertUnit, getUnitsByCategory } from '@/utils/calculator/unit'
import {
  convertCurrency,
  mapExchangeRateVoToCurrencyResult
} from '@/utils/calculator/currency'
import {
  downloadCalculatorSnapshot,
  formatCalculatorSnapshot
} from '@/utils/calculator/exporters'
import { queryExchangeRate } from '@/api/exchangeRate'

const moduleOptions: Array<{value: CalculatorModule; label: string}> = [
  { value: 'basic', label: '基础' },
  { value: 'loan', label: '贷款' },
  { value: 'tax', label: '个税' },
  { value: 'unit', label: '单位' },
  { value: 'currency', label: '汇率' }
]

const calcPadItems = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '%', '+', '(', ')', '^']

const getTodayString = () => {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

const normalizeCurrencyCode = (value: string) => value.trim().toUpperCase()

const activeModule = ref<CalculatorModule>('basic')
const basicExpression = ref('12800 * 0.85 + 320')
const basicResult = ref<BasicCalculationResult | null>(null)
const basicError = ref('')
const basicHistory = ref<BasicCalculationResult[]>([])

const loanInput = reactive(createDefaultLoanInput())
const loanResult = ref<LoanResult | null>(null)
const loanError = ref('')

const taxInput = reactive(createDefaultYearEndBonusTaxInput())
const taxResult = ref<YearEndBonusTaxResult | null>(null)
const taxError = ref('')

const unitInput = reactive(createDefaultUnitInput())
const unitResult = ref<UnitConversionResult | null>(null)
const unitError = ref('')

const currencyInput = reactive({
  amount: 100,
  fromCurrency: 'USD',
  toCurrency: 'CNY',
  queryDate: getTodayString(),
  precision: 2
})
const currencyMode = ref<'live' | 'manual'>('live')
const currencyRates = ref(DEFAULT_CURRENCY_RATES.map((item) => ({ ...item })))
const currencyResult = ref<CurrencyConversionResult | null>(null)
const currencyError = ref('')
const currencyLoading = ref(false)

const moneyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const unitOptions = computed(() => getUnitsByCategory(unitInput.category))

const manualCurrencyRates = computed(() => {
  const codes = [
    normalizeCurrencyCode(currencyInput.fromCurrency),
    normalizeCurrencyCode(currencyInput.toCurrency)
  ].filter(Boolean)

  return codes.reduce<typeof currencyRates.value>((items, code) => {
    const rate = currencyRates.value.find((item) => item.code === code)

    if (rate && !items.some((item) => item.code === rate.code)) {
      items.push(rate)
    }

    return items
  }, [])
})

const taxPolicyLabel = computed(() => `年终奖单独计税政策有效期至 ${YEAR_END_BONUS_POLICY_VALID_UNTIL}`)

const taxRecommendationLabel = computed(() => {
  if (!taxResult.value) {
    return '-'
  }

  if (taxResult.value.recommendation === 'standalone') {
    return '年终奖单独计税'
  }

  if (taxResult.value.recommendation === 'merged') {
    return '并入综合所得'
  }

  return '两种方式持平'
})

const taxCompareRows = computed(() => {
  if (!taxResult.value) {
    return []
  }

  return [
    {
      name: '年终奖单独计税',
      taxable: formatMoney(taxResult.value.bonusTaxStandalone.taxableIncome),
      rate: `${(taxResult.value.bonusTaxStandalone.rate * 100).toFixed(0)}%`,
      deduction: formatMoney(taxResult.value.bonusTaxStandalone.quickDeduction),
      tax: formatMoney(taxResult.value.bonusTaxStandalone.tax)
    },
    {
      name: '不含年终奖年度税额',
      taxable: formatMoney(taxResult.value.baseAnnualTax.taxableIncome),
      rate: `${(taxResult.value.baseAnnualTax.rate * 100).toFixed(0)}%`,
      deduction: formatMoney(taxResult.value.baseAnnualTax.quickDeduction),
      tax: formatMoney(taxResult.value.baseAnnualTax.tax)
    },
    {
      name: '并入综合所得全年税额',
      taxable: formatMoney(taxResult.value.mergedAnnualTax.taxableIncome),
      rate: `${(taxResult.value.mergedAnnualTax.rate * 100).toFixed(0)}%`,
      deduction: formatMoney(taxResult.value.mergedAnnualTax.quickDeduction),
      tax: formatMoney(taxResult.value.mergedAnnualTax.tax)
    }
  ]
})

const createSnapshot = (snapshot: CalculatorSnapshot): CalculatorSnapshot => snapshot

const currentSnapshot = computed<CalculatorSnapshot | null>(() => {
  if (activeModule.value === 'basic' && basicResult.value) {
    return createSnapshot({
      module: 'basic',
      title: '基础计算',
      summary: {
        表达式: basicResult.value.expression,
        结果: basicResult.value.displayValue
      },
      details: basicResult.value,
      generatedAt: basicResult.value.generatedAt
    })
  }

  if (activeModule.value === 'loan' && loanResult.value) {
    return createSnapshot({
      module: 'loan',
      title: loanResult.value.kind === 'car' ? '车贷计算' : '房贷计算',
      summary: {
        贷款金额: formatMoney(loanResult.value.principal),
        年利率: `${loanResult.value.annualRate}%`,
        期数: loanResult.value.months,
        首月月供: formatMoney(loanResult.value.firstPayment),
        平均月供: formatMoney(loanResult.value.averagePayment),
        总利息: formatMoney(loanResult.value.totalInterest),
        总成本: formatMoney(loanResult.value.totalCost)
      },
      details: loanResult.value,
      generatedAt: new Date().toISOString()
    })
  }

  if (activeModule.value === 'tax' && taxResult.value) {
    return createSnapshot({
      module: 'tax',
      title: '个税年终奖计算',
      summary: {
        推荐方式: taxRecommendationLabel.value,
        单独计税税额: formatMoney(taxResult.value.bonusTaxStandalone.tax),
        并入后增量税额: formatMoney(taxResult.value.mergedBonusIncrementalTax),
        并入后全年税额: formatMoney(taxResult.value.mergedTotalTax)
      },
      details: taxResult.value,
      generatedAt: new Date().toISOString()
    })
  }

  if (activeModule.value === 'unit' && unitResult.value) {
    return createSnapshot({
      module: 'unit',
      title: '单位换算',
      summary: {
        原始值: `${unitResult.value.amount} ${unitResult.value.fromUnit.symbol}`,
        换算值: `${unitResult.value.convertedValue} ${unitResult.value.toUnit.symbol}`,
        公式: unitResult.value.formula
      },
      details: unitResult.value,
      generatedAt: new Date().toISOString()
    })
  }

  if (activeModule.value === 'currency' && currencyResult.value) {
    return createSnapshot({
      module: 'currency',
      title: '汇率换算',
      summary: {
        原始金额: `${currencyResult.value.amount} ${currencyResult.value.fromCurrency.code}`,
        换算金额: `${currencyResult.value.convertedValue} ${currencyResult.value.toCurrency.code}`,
        汇率: `1 ${currencyResult.value.fromCurrency.code} = ${currencyResult.value.rate} ${currencyResult.value.toCurrency.code}`,
        查询日期: currencyResult.value.queryDate,
        来源: currencyResult.value.source === 'live' ? '实时汇率' : '手动汇率'
      },
      details: currencyResult.value,
      generatedAt: currencyResult.value.generatedAt
    })
  }

  return null
})

watch(() => unitInput.category, () => {
  const options = unitOptions.value
  unitInput.fromUnit = options[0]?.value || ''
  unitInput.toUnit = options[1]?.value || options[0]?.value || ''
  unitResult.value = null
  unitError.value = ''
})

const formatMoney = (value: number): string => moneyFormatter.format(Number(value) || 0)

const appendExpression = (value: string) => {
  basicExpression.value = `${basicExpression.value}${value}`
}

const backspaceExpression = () => {
  basicExpression.value = basicExpression.value.slice(0, -1)
}

const runBasic = () => {
  try {
    basicResult.value = calculateExpression(basicExpression.value)
    basicHistory.value = [
      basicResult.value,
      ...basicHistory.value.filter((item) => item.expression !== basicResult.value?.expression)
    ].slice(0, 12)
    basicError.value = ''
  } catch (error: any) {
    basicError.value = error?.message || '计算失败'
  }
}

const syncLoanPrincipal = () => {
  loanInput.principal = Math.max(0, Number(loanInput.totalPrice || 0) - Number(loanInput.downPayment || 0))
}

const runLoan = () => {
  try {
    loanResult.value = calculateLoan(loanInput)
    loanError.value = ''
  } catch (error: any) {
    loanError.value = error?.message || '贷款计算失败'
  }
}

const runTax = () => {
  try {
    taxResult.value = calculateYearEndBonusTax(taxInput)
    taxError.value = ''
  } catch (error: any) {
    taxError.value = error?.message || '个税计算失败'
  }
}

const runUnit = () => {
  try {
    unitResult.value = convertUnit(unitInput)
    unitError.value = ''
  } catch (error: any) {
    unitError.value = error?.message || '单位换算失败'
  }
}

const ensureCurrencyRate = (code: string) => {
  const normalizedCode = normalizeCurrencyCode(code)
  let rate = currencyRates.value.find((item) => item.code === normalizedCode)

  if (!rate) {
    rate = {
      code: normalizedCode,
      label: normalizedCode,
      rateToCny: normalizedCode === 'CNY' ? 1 : 1
    }
    currencyRates.value.push(rate)
  }

  return rate
}

const swapCurrencies = () => {
  const fromCurrency = currencyInput.fromCurrency
  currencyInput.fromCurrency = currencyInput.toCurrency
  currencyInput.toCurrency = fromCurrency
  currencyResult.value = null
  currencyError.value = ''
}

const runCurrency = async () => {
  if (currencyLoading.value) {
    return
  }

  try {
    currencyLoading.value = true
    const fromCurrency = normalizeCurrencyCode(currencyInput.fromCurrency)
    const toCurrency = normalizeCurrencyCode(currencyInput.toCurrency)

    if (!fromCurrency || !toCurrency) {
      throw new Error('请输入完整币种')
    }

    currencyInput.fromCurrency = fromCurrency
    currencyInput.toCurrency = toCurrency
    ensureCurrencyRate(fromCurrency)
    ensureCurrencyRate(toCurrency)

    if (currencyMode.value === 'live') {
      const response = await queryExchangeRate({
        fromCurrency,
        toCurrency,
        fromAmount: currencyInput.amount,
        queryDate: currencyInput.queryDate || undefined
      })

      if (!response.data) {
        throw new Error('汇率接口未返回数据')
      }

      currencyResult.value = mapExchangeRateVoToCurrencyResult(
        response.data,
        currencyInput.precision,
        currencyRates.value
      )
    } else {
      currencyResult.value = convertCurrency({
        ...currencyInput,
        rates: currencyRates.value
      })
    }
    currencyError.value = ''
  } catch (error: any) {
    currencyError.value = typeof error === 'string' ? error : error?.message || '汇率换算失败'
  } finally {
    currencyLoading.value = false
  }
}

const resetBasic = () => {
  basicExpression.value = '12800 * 0.85 + 320'
  basicResult.value = null
  basicError.value = ''
}

const resetLoan = () => {
  Object.assign(loanInput, createDefaultLoanInput())
  loanResult.value = null
  loanError.value = ''
}

const resetTax = () => {
  Object.assign(taxInput, createDefaultYearEndBonusTaxInput())
  taxResult.value = null
  taxError.value = ''
}

const resetUnit = () => {
  Object.assign(unitInput, createDefaultUnitInput())
  unitResult.value = null
  unitError.value = ''
}

const resetCurrency = () => {
  Object.assign(currencyInput, {
    amount: 100,
    fromCurrency: 'USD',
    toCurrency: 'CNY',
    queryDate: getTodayString(),
    precision: 2
  })
  currencyMode.value = 'live'
  currencyRates.value = DEFAULT_CURRENCY_RATES.map((item) => ({ ...item }))
  currencyResult.value = null
  currencyError.value = ''
  currencyLoading.value = false
}

const clearAll = () => {
  resetBasic()
  resetLoan()
  resetTax()
  resetUnit()
  resetCurrency()
  basicHistory.value = []
  ElMessage.success('已清空当前输入和结果')
}

const writeClipboardText = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    const textarea = document.createElement('textarea')

    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()

    const copied = document.execCommand('copy')
    textarea.remove()

    if (!copied) {
      throw new Error('copy failed')
    }
  }
}

const copyCurrentResult = async () => {
  if (!currentSnapshot.value) {
    return
  }

  try {
    await writeClipboardText(formatCalculatorSnapshot(currentSnapshot.value, 'txt'))
    ElMessage.success('结果已复制')
  } catch {
    ElMessage.error('复制失败，请检查浏览器权限')
  }
}

const handleExport = (format: string | number | object) => {
  if (!currentSnapshot.value || typeof format !== 'string') {
    return
  }

  downloadCalculatorSnapshot(currentSnapshot.value, format as CalculatorExportFormat)
}

const handlePrint = () => {
  window.print()
}

runBasic()
runLoan()
runTax()
runUnit()
</script>

<style scoped>
.calculator-page {
  min-height: 100vh;
  color: #1f2937;
  background: #f5f7fa;
}

.calculator-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: min(1280px, calc(100% - 48px));
  margin: 0 auto;
  padding: 28px 0 18px;
  border-bottom: 1px solid #dfe5ee;
}

.topbar-title {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.topbar-title h1 {
  margin: 0;
  color: #111827;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: 0;
}

.privacy-copy {
  color: #5b6472;
  font-size: 14px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.calculator-workbench {
  width: min(1280px, calc(100% - 48px));
  margin: 0 auto;
  padding: 20px 0 36px;
}

.module-tabs {
  display: flex;
  padding-bottom: 16px;
  overflow-x: auto;
}

.module-grid {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.input-panel,
.result-panel {
  min-width: 0;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  box-shadow: 0 10px 24px rgba(31, 41, 55, 0.05);
}

.section-head,
.result-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.section-head.compact {
  margin-bottom: 10px;
}

.section-head h2,
.result-header h2,
.section-head h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  line-height: 1.3;
  letter-spacing: 0;
}

.section-head h3 {
  font-size: 15px;
}

.section-head p,
.result-header span {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
}

.config-form :deep(.el-input-number),
.config-form :deep(.el-select),
.config-form :deep(.el-date-editor) {
  width: 100%;
}

.form-grid {
  display: grid;
  gap: 12px;
}

.form-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.currency-pair-row {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 10px;
  align-items: end;
}

.currency-pair-row > .el-button {
  margin-bottom: 18px;
}

.currency-swap-button {
  width: 40px;
  padding: 8px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.form-actions.split {
  justify-content: space-between;
}

.calc-pad {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.calc-pad button {
  height: 38px;
  color: #1f2937;
  font: 600 14px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: #f8fafc;
  border: 1px solid #d8e0ea;
  border-radius: 6px;
  cursor: pointer;
}

.calc-pad button:hover,
.history-list button:hover {
  border-color: #409eff;
  background: #eef6ff;
}

.big-result {
  overflow-wrap: anywhere;
  color: #0f766e;
  font: 700 40px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.result-expression,
.formula-box {
  margin-top: 10px;
  padding: 10px 12px;
  color: #475467;
  font: 500 13px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: #f8fafc;
  border: 1px solid #e4e9f2;
  border-radius: 6px;
  overflow-wrap: anywhere;
}

.history-list {
  display: grid;
  gap: 8px;
  max-height: 240px;
  overflow: auto;
}

.history-list button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  text-align: left;
  background: #ffffff;
  border: 1px solid #e4e9f2;
  border-radius: 6px;
  cursor: pointer;
}

.history-list span,
.history-list strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-list strong {
  color: #0f766e;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.kpi-grid {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
}

.kpi-grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.kpi-grid.four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.kpi-item {
  min-width: 0;
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #e4e9f2;
  border-radius: 8px;
}

.kpi-item span {
  display: block;
  color: #667085;
  font-size: 13px;
}

.kpi-item strong {
  display: block;
  margin-top: 8px;
  color: #111827;
  font-size: 19px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.result-alert {
  margin: 10px 0;
}

.schedule-table,
.compare-table {
  margin-top: 12px;
}

.recommendation {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
  padding: 14px;
  background: #ecfdf3;
  border: 1px solid #b7e4c7;
  border-radius: 8px;
}

.recommendation.merged {
  background: #eef6ff;
  border-color: #b8d8ff;
}

.recommendation.same {
  background: #f8fafc;
  border-color: #e4e9f2;
}

.recommendation span,
.recommendation em {
  color: #667085;
  font-size: 13px;
  font-style: normal;
}

.recommendation strong {
  min-width: 0;
  color: #111827;
  font-size: 18px;
  overflow-wrap: anywhere;
}

.conversion-line {
  display: grid;
  gap: 12px;
  align-content: center;
  min-height: 180px;
  padding: 22px;
  background: #f8fafc;
  border: 1px solid #e4e9f2;
  border-radius: 8px;
}

.conversion-line span {
  color: #667085;
  font-size: 18px;
}

.conversion-line strong {
  color: #0f766e;
  font-size: 36px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.rate-editor {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.mode-note {
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.rate-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.rate-row span {
  color: #344054;
  font-weight: 700;
}

.rate-row :deep(.el-input-number) {
  width: 100%;
}

@media (max-width: 960px) {
  .calculator-topbar,
  .calculator-workbench {
    width: min(100% - 28px, 1280px);
  }

  .calculator-topbar {
    align-items: stretch;
    flex-direction: column;
  }

  .topbar-actions {
    justify-content: flex-start;
  }

  .module-grid {
    grid-template-columns: 1fr;
  }

  .kpi-grid.three,
  .kpi-grid.four,
  .form-grid.two {
    grid-template-columns: 1fr;
  }

  .currency-pair-row {
    grid-template-columns: 1fr;
  }

  .currency-pair-row > .el-button {
    width: 100%;
    margin-bottom: 0;
  }

  .conversion-line strong,
  .big-result {
    font-size: 30px;
  }
}

@media print {
  .calculator-page {
    background: #ffffff;
  }

  .topbar-actions,
  .module-tabs,
  .input-panel {
    display: none;
  }

  .calculator-topbar,
  .calculator-workbench {
    width: 100%;
    padding: 0;
    border: none;
  }

  .module-grid {
    display: block;
  }

  .result-panel {
    box-shadow: none;
  }
}
</style>
