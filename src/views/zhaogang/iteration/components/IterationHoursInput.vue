<template>
  <el-form-item :label="label" :error="error" required inline-message>
    <el-input
      :model-value="draft"
      inputmode="decimal"
      container-role="spinbutton"
      :aria-valuemin="step"
      :aria-valuemax="maxHours"
      :aria-valuenow="hours"
      :aria-invalid="Boolean(error)"
      @update:model-value="setDraft"
      @blur="formatDraft"
      @keydown.up.prevent="adjustHours(step)"
      @keydown.down.prevent="adjustHours(-step)"
    >
      <template #append>
        <div class="hours-controls">
          <button type="button" aria-label="增加 0.5 小时" :disabled="hours === maxHours" @mousedown.prevent @click="adjustHours(step)">
            <el-icon><ArrowUp /></el-icon>
          </button>
          <button type="button" aria-label="减少 0.5 小时" :disabled="hours === undefined || hours === step" @mousedown.prevent @click="adjustHours(-step)">
            <el-icon><ArrowDown /></el-icon>
          </button>
        </div>
      </template>
    </el-input>
  </el-form-item>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'

defineProps<{ label: string }>()
const model = defineModel<number | undefined>({ required: true })
const step = 0.5
const maxHours = 9999.5
const draft = ref(model.value?.toFixed(1) ?? '')

const hours = computed(() => {
  const value = draft.value.trim()
  if (!/^(?:\d+(?:\.[05]?)?|\.[05])$/.test(value)) return undefined
  const number = Number(value)
  return number >= step && number <= maxHours ? number : undefined
})
const error = computed(() => {
  if (hours.value !== undefined) return ''
  if (!draft.value.trim()) return '请输入工时'
  return '请输入 0.5～9999.5 小时，且为 0.5 的倍数'
})

watch(model, value => {
  if (value !== hours.value) draft.value = value?.toFixed(1) ?? ''
})

const setDraft = (value: string) => {
  draft.value = value
  model.value = hours.value
}
const formatDraft = () => {
  if (hours.value !== undefined) draft.value = hours.value.toFixed(1)
}
const adjustHours = (delta: number) => {
  const next = (hours.value ?? 0) + delta
  if (next >= step && next <= maxHours) setDraft(next.toFixed(1))
}
</script>

<style scoped>
.hours-controls {
  display: grid;
  width: 28px;
  height: 30px;
}
.hours-controls button {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--el-text-color-regular);
  cursor: pointer;
}
.hours-controls button + button { border-top: 1px solid var(--el-border-color); }
.hours-controls button:enabled:hover { color: var(--el-color-primary); }
.hours-controls button:disabled { color: var(--el-disabled-text-color); cursor: not-allowed; }
.hours-controls button:focus-visible { outline: 1px solid var(--el-color-primary); outline-offset: -2px; }
:deep(.el-input-group__append) { padding: 0; }
</style>
