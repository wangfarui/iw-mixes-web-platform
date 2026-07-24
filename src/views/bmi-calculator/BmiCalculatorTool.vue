<template>
  <div class="bmi-page">
    <header class="bmi-topbar">
      <div class="topbar-title">
        <h1>BMI 计算器</h1>
        <el-tag type="success" effect="light">本地计算 / 不上传</el-tag>
        <span class="privacy-copy">身高、体重和计算结果仅保留在当前页面，不保存历史。</span>
      </div>
      <div class="topbar-actions">
        <ToolHomeButton />
        <el-button :disabled="!result" @click="copyResult">
          <el-icon><CopyDocument /></el-icon>
          复制结果
        </el-button>
        <el-button type="danger" plain @click="clearAll">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </header>

    <main class="bmi-workbench">
      <el-alert
        class="applicability-alert"
        type="info"
        :closable="false"
        show-icon
        title="适用于 18 岁及以上普通成年人；不适用于未成年人、孕产妇、专业运动员等特殊人群。BMI 仅供健康筛查参考，不作为医疗诊断依据。"
      />

      <section class="bmi-grid">
        <aside class="input-panel">
          <div class="section-head">
            <div>
              <h2>输入数据</h2>
              <p>输入身高和体重后即时计算。</p>
            </div>
          </div>

          <el-form label-position="top" class="bmi-form">
            <el-form-item label="身高">
              <el-input-number
                v-model="height"
                :min="0"
                :max="300"
                :step="0.1"
                :precision="1"
                controls-position="right"
                placeholder="例如 170"
              />
              <span class="unit-suffix">cm</span>
            </el-form-item>
            <el-form-item label="体重">
              <el-input-number
                v-model="weight"
                :min="0"
                :max="600"
                :step="0.1"
                :precision="1"
                controls-position="right"
                placeholder="例如 65"
              />
              <span class="unit-suffix">kg</span>
            </el-form-item>
          </el-form>
        </aside>

        <section class="result-panel" aria-live="polite">
          <div class="result-header">
            <div>
              <h2>计算结果</h2>
              <p v-if="result">中国 BMI 指数标准（成人）</p>
              <p v-else>填写身高和体重后查看结果</p>
            </div>
            <el-tag v-if="result" :type="result.category.tone" effect="light">{{ result.category.label }}</el-tag>
          </div>

          <el-alert v-if="calculationError" :title="calculationError" type="error" show-icon :closable="false" />
          <el-empty v-else-if="!result" description="请输入身高和体重" />

          <template v-else>
            <div class="bmi-value-block">
              <span>BMI</span>
              <strong>{{ result.bmi.toFixed(1) }}</strong>
              <em>kg/m²</em>
            </div>

            <div class="bmi-scale" aria-label="BMI 分段刻度">
              <div class="scale-marker" :style="{ left: `${markerPercent}%` }">
                <span>当前</span>
              </div>
              <div class="scale-segments">
                <span class="underweight">偏低</span>
                <span class="normal">正常</span>
                <span class="overweight">超重</span>
                <span class="obesity">肥胖</span>
              </div>
              <div class="scale-thresholds">
                <span>18.5</span>
                <span>24</span>
                <span>28</span>
              </div>
            </div>

            <div class="result-kpis">
              <div class="kpi-item">
                <span>健康体重参考区间</span>
                <strong>{{ referenceWeightRange }}</strong>
                <small>按当前身高与中国成人标准计算</small>
              </div>
              <div class="kpi-item">
                <span>当前体重与参考区间</span>
                <strong>{{ weightDistance }}</strong>
                <small>{{ weightDistanceNote }}</small>
              </div>
            </div>

            <div class="formula-box">
              BMI = {{ result.weightKg.toFixed(1) }} kg ÷ ({{ (result.heightCm / 100).toFixed(2) }} m)²
            </div>

            <el-alert
              v-for="warning in result.warnings"
              :key="warning"
              class="result-warning"
              :title="warning"
              type="warning"
              show-icon
              :closable="false"
            />
          </template>
        </section>
      </section>

      <section class="reference-panel">
        <div class="section-head">
          <div>
            <h2>规则说明与适用边界</h2>
            <p>仅采用中国 BMI 指数标准（成人）。</p>
          </div>
        </div>
        <div class="reference-grid">
          <div>
            <h3>BMI 指数标准（成人）</h3>
            <p>BMI ＜18.5 为体重过低，18.5–＜24.0 为正常，24.0–＜28.0 为超重，≥28.0 为肥胖。</p>
          </div>
          <div>
            <h3>使用说明</h3>
            <p>BMI 不能直接反映体脂、肌肉量或脂肪分布；如存在疾病、体重快速变化或健康疑虑，请咨询专业人员。</p>
          </div>
        </div>
        <p class="source-links">
          参考：
          <a href="https://www.nhc.gov.cn/ewebeditor/uploadfile/2013/08/20130808135715967.pdf" target="_blank" rel="noreferrer">国家卫健委《成人体重判定》</a>
        </p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {CopyDocument, Delete} from '@element-plus/icons-vue'
import {ElMessage} from 'element-plus'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import type {BmiCalculationResult} from '@/types/bmi-calculator'
import {calculateBmi, formatReferenceWeightRange} from '@/utils/bmi-calculator'

const height = ref<number | undefined>()
const weight = ref<number | undefined>()

const normalizedInput = computed(() => {
  if (height.value === undefined || weight.value === undefined) {
    return null
  }
  return {heightCm: height.value, weightKg: weight.value}
})

const calculationState = computed<{result: BmiCalculationResult | null; error: string}>(() => {
  if (!normalizedInput.value) {
    return {result: null, error: ''}
  }
  try {
    return {result: calculateBmi(normalizedInput.value), error: ''}
  } catch (error) {
    return {result: null, error: error instanceof Error ? error.message : '无法计算 BMI，请检查输入。'}
  }
})

const result = computed(() => calculationState.value.result)
const calculationError = computed(() => calculationState.value.error)
const referenceWeightRange = computed(() => result.value ? formatReferenceWeightRange(result.value) : '')

const markerPercent = computed(() => {
  if (!result.value) {
    return 0
  }
  return Math.max(2, Math.min(98, ((result.value.rawBmi - 15) / 20) * 100))
})

const weightDistance = computed(() => {
  if (!result.value) {
    return ''
  }
  if (result.value.weightKg < result.value.healthyWeightMinKg) {
    return `约差 ${(result.value.healthyWeightMinKg - result.value.weightKg).toFixed(1)} kg`
  }
  if (result.value.weightKg >= result.value.healthyWeightMaxExclusiveKg) {
    return `约超 ${(result.value.weightKg - result.value.healthyWeightMaxExclusiveKg).toFixed(1)} kg`
  }
  return '位于参考区间内'
})

const weightDistanceNote = computed(() => {
  if (!result.value) {
    return ''
  }
  if (result.value.weightKg < result.value.healthyWeightMinKg) {
    return '相对正常参考下限'
  }
  if (result.value.weightKg >= result.value.healthyWeightMaxExclusiveKg) {
    return '相对正常参考上限'
  }
  return '仅作体重参考'
})

const copyResult = async () => {
  if (!result.value) {
    return
  }
  const text = [
    'BMI 计算结果',
    `身高：${result.value.heightCm.toFixed(1)} cm`,
    `体重：${result.value.weightKg.toFixed(1)} kg`,
    `BMI：${result.value.bmi.toFixed(1)} kg/m²`,
    `分类：${result.value.category.label}（中国 BMI 指数标准（成人））`,
    `健康体重参考区间：${referenceWeightRange.value}`
  ].join('\n')

  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('计算结果已复制')
  } catch {
    ElMessage.error('复制失败，请检查浏览器剪贴板权限。')
  }
}

const clearAll = () => {
  height.value = undefined
  weight.value = undefined
  ElMessage.success('已清空当前输入和结果')
}
</script>

<style scoped>
.bmi-page {
  min-height: 100vh;
  color: #1f2937;
  background: #f5f7fa;
}

.bmi-topbar,
.bmi-workbench {
  width: min(1120px, calc(100% - 48px));
  margin: 0 auto;
}

.bmi-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 0 18px;
  border-bottom: 1px solid #dfe5ee;
}

.topbar-title,
.topbar-actions,
.section-head,
.result-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topbar-title {
  min-width: 0;
  flex-wrap: wrap;
}

.topbar-title h1,
.section-head h2,
.result-header h2,
.reference-panel h3 {
  margin: 0;
  color: #111827;
  letter-spacing: 0;
}

.topbar-title h1 {
  font-size: 28px;
  line-height: 1.2;
}

.privacy-copy,
.section-head p,
.result-header p,
.kpi-item small,
.reference-grid p,
.source-links {
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.topbar-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.bmi-workbench {
  padding: 20px 0 36px;
}

.applicability-alert {
  margin-bottom: 18px;
}

.bmi-grid {
  display: grid;
  grid-template-columns: minmax(310px, 370px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.input-panel,
.result-panel,
.reference-panel {
  min-width: 0;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  box-shadow: 0 10px 24px rgba(31, 41, 55, 0.05);
}

.section-head,
.result-header {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-head h2,
.result-header h2 {
  font-size: 18px;
  line-height: 1.35;
}

.section-head p,
.result-header p {
  margin: 5px 0 0;
}

.bmi-form :deep(.el-input-number) {
  width: 100%;
}

.bmi-form :deep(.el-form-item__content) {
  position: relative;
}

.unit-suffix {
  position: absolute;
  right: 36px;
  color: #667085;
  font-size: 13px;
  pointer-events: none;
}


.bmi-value-block {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 0 20px;
}

.bmi-value-block span,
.bmi-value-block em {
  color: #667085;
  font-size: 14px;
  font-style: normal;
}

.bmi-value-block strong {
  color: #0f766e;
  font-size: clamp(46px, 8vw, 72px);
  line-height: 1;
  letter-spacing: -2px;
}

.bmi-scale {
  position: relative;
  padding: 25px 0 22px;
}

.scale-segments {
  display: grid;
  grid-template-columns: 18% 30% 24% 28%;
  height: 16px;
  overflow: hidden;
  border-radius: 999px;
}

.scale-segments span {
  color: transparent;
}

.underweight { background: #b8d8ff; }
.normal { background: #8cd6a8; }
.overweight { background: #f6c76d; }
.obesity { background: #f59b98; }

.scale-marker {
  position: absolute;
  top: 4px;
  display: grid;
  justify-items: center;
  transform: translateX(-50%);
  color: #344054;
  font-size: 12px;
  font-weight: 700;
}

.scale-marker::after {
  width: 2px;
  height: 28px;
  margin-top: 3px;
  content: '';
  background: #344054;
}

.scale-thresholds {
  display: flex;
  justify-content: space-between;
  padding: 6px 18% 0;
  color: #667085;
  font-size: 12px;
}

.result-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.kpi-item {
  min-width: 0;
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #e4e9f2;
  border-radius: 8px;
}

.kpi-item span,
.kpi-item strong,
.kpi-item small {
  display: block;
}

.kpi-item span {
  color: #667085;
  font-size: 13px;
}

.kpi-item strong {
  margin: 8px 0 4px;
  color: #111827;
  font-size: 18px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.formula-box {
  margin-top: 14px;
  padding: 10px 12px;
  color: #475467;
  font: 500 13px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: #f8fafc;
  border: 1px solid #e4e9f2;
  border-radius: 6px;
}

.result-warning {
  margin-top: 12px;
}

.reference-panel {
  margin-top: 18px;
}

.reference-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.reference-grid > div {
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #e4e9f2;
  border-radius: 8px;
}

.reference-panel h3 {
  font-size: 15px;
}

.reference-grid p {
  margin: 8px 0 0;
}

.source-links {
  margin: 16px 0 0;
}

.source-links a {
  color: #1769aa;
}

.source-links span {
  margin: 0 6px;
}

@media (max-width: 860px) {
  .bmi-topbar,
  .bmi-workbench {
    width: min(100% - 28px, 1120px);
  }

  .bmi-topbar {
    align-items: stretch;
    flex-direction: column;
  }

  .topbar-actions {
    justify-content: flex-start;
  }

  .bmi-grid,
  .reference-grid,
  .result-kpis {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .bmi-topbar {
    padding-top: 20px;
  }

  .topbar-actions > :deep(.el-button) {
    flex: 1 1 auto;
  }
}
</style>
