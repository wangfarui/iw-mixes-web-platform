<template>
  <div class="color-page" @paste="handlePaste">
    <header class="color-topbar">
      <div class="topbar-title">
        <h1>颜色选择工具</h1>
        <el-tag type="success" effect="light">本地处理 / 不上传</el-tag>
        <span class="privacy-copy">颜色转换和图片像素取色均在当前浏览器完成。</span>
      </div>
      <div class="topbar-actions">
        <ToolHomeButton />
        <el-button @click="copyAllResults">
          <el-icon><CopyDocument /></el-icon>
          复制全部
        </el-button>
        <el-dropdown trigger="click" @command="handleExport">
          <el-button>
            <el-icon><Download /></el-icon>
            导出
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="txt">TXT</el-dropdown-item>
              <el-dropdown-item command="json">JSON</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="danger" plain @click="clearAll">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </header>

    <main class="color-workbench">
      <section class="preview-panel">
        <div class="panel-head">
          <div>
            <h2>当前颜色</h2>
            <p>{{ colorSummary }}</p>
          </div>
          <el-tag effect="plain">{{ alphaPercent }}% Alpha</el-tag>
        </div>

        <div class="color-preview-grid">
          <div class="color-hero" :style="heroPreviewStyle">
            <strong>{{ primaryHex }}</strong>
            <span>{{ primaryRgba }}</span>
          </div>
          <div class="preview-stack">
            <div class="preview-sample light" :style="{ color: readableTextColor }">
              <strong>文字预览</strong>
              <span>推荐文字色 {{ readableTextColor }}</span>
            </div>
            <div class="preview-sample dark" :style="{ backgroundColor: cssColorValue }">
              <strong :style="{ color: readableTextColor }">背景预览</strong>
              <span :style="{ color: readableTextColor }">CSS {{ cssColorValue }}</span>
            </div>
          </div>
        </div>

        <div class="contrast-grid">
          <div>
            <span>白底对比度</span>
            <strong>{{ contrast.contrastOnWhite }}</strong>
          </div>
          <div>
            <span>黑底对比度</span>
            <strong>{{ contrast.contrastOnBlack }}</strong>
          </div>
          <div>
            <span>普通文本 AA</span>
            <strong>{{ contrast.normalTextPassesAA ? '通过' : '不足' }}</strong>
          </div>
          <div>
            <span>大字号 AA</span>
            <strong>{{ contrast.largeTextPassesAA ? '通过' : '不足' }}</strong>
          </div>
        </div>
      </section>

      <aside class="control-panel">
        <div class="panel-head">
          <div>
            <h2>选择与输入</h2>
            <p>支持 HEX、RGB/RGBA、HSL/HSLA。</p>
          </div>
        </div>

        <el-form label-position="top" class="control-form">
          <el-form-item label="颜色选择器">
            <el-color-picker
              v-model="colorPickerValue"
              show-alpha
              color-format="rgb"
              :predefine="predefineColors"
              @change="handlePickerChange"
            />
          </el-form-item>
          <el-form-item label="颜色值">
            <div class="input-row">
              <el-input
                v-model="colorInput"
                clearable
                placeholder="#1677FF 或 rgba(22, 119, 255, 1)"
                @keyup.enter="applyColorInput"
              />
              <el-button type="primary" @click="applyColorInput">应用</el-button>
            </div>
          </el-form-item>
          <el-alert
            v-if="inputError"
            class="inline-alert"
            :title="inputError"
            type="error"
            show-icon
            :closable="false"
          />
          <div class="button-row">
            <el-button :disabled="!eyeDropperSupported" @click="pickFromScreen">
              <el-icon><Aim /></el-icon>
              屏幕取色
            </el-button>
            <el-button @click="resetToDefault">
              <el-icon><RefreshRight /></el-icon>
              默认色
            </el-button>
          </div>
          <p v-if="!eyeDropperSupported" class="muted-copy">
            当前浏览器不支持系统屏幕取色，可使用手动输入或图片取色。
          </p>
        </el-form>

        <div class="swatch-section">
          <h3>快捷色板</h3>
          <div class="swatch-grid">
            <button
              v-for="item in quickSwatches"
              :key="item.value"
              class="swatch-button"
              type="button"
              :title="`${item.name} ${item.value}`"
              :style="{ backgroundColor: item.value }"
              @click="selectColorValue(item.value)"
            />
          </div>
        </div>

        <div class="swatch-section">
          <div class="section-title-row">
            <h3>本次会话</h3>
            <el-button text :disabled="!recentColors.length" @click="recentColors = []">清除</el-button>
          </div>
          <div v-if="recentColors.length" class="swatch-grid">
            <button
              v-for="item in recentColors"
              :key="rgbaToHexAlpha(item)"
              class="swatch-button checker"
              type="button"
              :title="rgbaToHexAlpha(item)"
              @click="setActiveColor(item)"
            >
              <span :style="{ backgroundColor: formatRgba(item) }" />
            </button>
          </div>
          <el-empty v-else class="small-empty" description="暂无会话颜色" />
        </div>
      </aside>

      <section class="formats-panel">
        <div class="panel-head">
          <div>
            <h2>格式结果</h2>
            <p>点击任意行复制对应色值。</p>
          </div>
        </div>
        <div class="result-list">
          <button
            v-for="item in colorFormats"
            :key="item.key"
            class="result-row"
            type="button"
            @click="copyText(item.value, `${item.label} 已复制`)"
          >
            <span>
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </span>
            <code>{{ item.value }}</code>
            <el-icon><CopyDocument /></el-icon>
          </button>
        </div>
      </section>

      <aside class="snippet-panel">
        <div class="panel-head">
          <div>
            <h2>CSS 片段</h2>
            <p>直接复制到样式表或组件内。</p>
          </div>
        </div>
        <el-form label-position="top">
          <el-form-item label="CSS 变量名">
            <el-input v-model="cssVariableName" placeholder="--iw-color-custom" />
          </el-form-item>
        </el-form>
        <div class="snippet-list">
          <button
            v-for="item in cssSnippets"
            :key="item.key"
            class="snippet-row"
            type="button"
            @click="copyText(item.value, `${item.label} 已复制`)"
          >
            <span>{{ item.label }}</span>
            <code>{{ item.value }}</code>
          </button>
        </div>
      </aside>

      <section class="image-panel">
        <div class="panel-head">
          <div>
            <h2>图片像素取色</h2>
            <p>拖入、选择或粘贴图片，点击预览图读取 x/y px 坐标颜色。</p>
          </div>
          <el-button :disabled="!imageInfo" @click="clearImage">
            移除图片
          </el-button>
        </div>

        <div class="image-grid">
          <div
            class="drop-zone"
            :class="{ dragging }"
            @dragenter.prevent="dragging = true"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="handleDrop"
            @click="triggerFilePick"
          >
            <el-icon><Picture /></el-icon>
            <strong>选择本地图片</strong>
            <span>支持 PNG、JPG、WebP、GIF，也可以直接粘贴图片。</span>
          </div>
          <input
            ref="fileInputRef"
            class="hidden-input"
            type="file"
            accept="image/*"
            @change="handleFileInput"
          >

          <div class="canvas-shell">
            <canvas
              v-show="imageInfo"
              ref="canvasRef"
              class="image-canvas"
              @click="pickCanvasPixel"
            />
            <el-empty v-if="!imageInfo" description="导入图片后点击像素取色" />
          </div>
        </div>

        <el-alert
          v-if="imageError"
          class="inline-alert"
          :title="imageError"
          type="error"
          show-icon
          :closable="false"
        />

        <div v-if="imageInfo || pickedPixel" class="pixel-info-grid">
          <div v-if="imageInfo">
            <span>图片</span>
            <strong>{{ imageInfo.name }}</strong>
            <small>{{ imageInfo.width }} x {{ imageInfo.height }} px · {{ formatBytes(imageInfo.size) }}</small>
          </div>
          <div v-if="pickedPixel">
            <span>坐标</span>
            <strong>x {{ pickedPixel.x }}px / y {{ pickedPixel.y }}px</strong>
            <small>{{ formatColorSummary(pickedPixel.color) }}</small>
          </div>
          <div v-if="pickedPixel" class="pixel-color-cell">
            <span>像素颜色</span>
            <button type="button" @click="copyText(formatRgba(pickedPixel.color), '像素颜色已复制')">
              <i :style="{ backgroundColor: formatRgba(pickedPixel.color) }" />
              <strong>{{ formatRgba(pickedPixel.color) }}</strong>
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Aim,
  ArrowDown,
  CopyDocument,
  Delete,
  Download,
  Picture,
  RefreshRight
} from '@element-plus/icons-vue'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import type { ColorExportFormat, ColorSnapshot, PickedPixelInfo, RgbaColor } from '@/types/colorPicker'
import {
  buildColorFormats,
  buildCssSnippets,
  formatColorSummary,
  formatRgba,
  getColorContrast,
  getReadableTextColor,
  normalizeRgba,
  parseColorInput,
  rgbaToHex,
  rgbaToHexAlpha
} from '@/utils/color-picker/color'
import { buildColorExport, downloadColorExport } from '@/utils/color-picker/exporters'

interface LocalImageInfo {
  name: string
  size: number
  width: number
  height: number
  objectUrl: string
}

interface EyeDropperLike {
  open: () => Promise<{ sRGBHex: string }>
}

type WindowWithEyeDropper = Window & {
  EyeDropper?: new () => EyeDropperLike
}

const DEFAULT_COLOR: RgbaColor = { r: 22, g: 119, b: 255, a: 1 }
const MAX_IMAGE_BYTES = 16 * 1024 * 1024

const predefineColors = [
  '#1677FF',
  '#409EFF',
  '#67C23A',
  '#E6A23C',
  '#F56C6C',
  '#909399',
  '#111827',
  '#FFFFFF',
  '#13C2C2',
  '#722ED1',
  '#EB2F96',
  '#FA541C'
]

const quickSwatches = [
  { name: 'IW Blue', value: '#1677FF' },
  { name: 'Element Blue', value: '#409EFF' },
  { name: 'Success', value: '#67C23A' },
  { name: 'Warning', value: '#E6A23C' },
  { name: 'Danger', value: '#F56C6C' },
  { name: 'Slate', value: '#111827' },
  { name: 'Cyan', value: '#13C2C2' },
  { name: 'Violet', value: '#722ED1' },
  { name: 'Rose', value: '#EB2F96' },
  { name: 'Orange', value: '#FA541C' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#000000' }
]

const activeColor = ref<RgbaColor>({ ...DEFAULT_COLOR })
const colorInput = ref(rgbaToHex(DEFAULT_COLOR))
const colorPickerValue = ref(formatRgba(DEFAULT_COLOR))
const inputError = ref('')
const cssVariableName = ref('--iw-color-custom')
const recentColors = ref<RgbaColor[]>([])
const dragging = ref(false)
const imageError = ref('')
const imageInfo = ref<LocalImageInfo | null>(null)
const pickedPixel = ref<PickedPixelInfo | undefined>()
const canvasRef = ref<HTMLCanvasElement>()
const fileInputRef = ref<HTMLInputElement>()

const eyeDropperSupported = computed(() => {
  return typeof window !== 'undefined' && Boolean((window as WindowWithEyeDropper).EyeDropper)
})

const colorFormats = computed(() => buildColorFormats(activeColor.value))
const cssSnippets = computed(() => buildCssSnippets(activeColor.value, cssVariableName.value))
const contrast = computed(() => getColorContrast(activeColor.value))
const readableTextColor = computed(() => getReadableTextColor(activeColor.value))
const primaryHex = computed(() => rgbaToHex(activeColor.value))
const primaryRgba = computed(() => formatRgba(activeColor.value))
const cssColorValue = computed(() => activeColor.value.a < 1 ? formatRgba(activeColor.value) : rgbaToHex(activeColor.value))
const alphaPercent = computed(() => Math.round(activeColor.value.a * 100))
const colorSummary = computed(() => formatColorSummary(activeColor.value))
const heroPreviewStyle = computed(() => ({
  backgroundColor: formatRgba(activeColor.value),
  color: readableTextColor.value
}))

const createSnapshot = (): ColorSnapshot => ({
  color: normalizeRgba(activeColor.value),
  formats: colorFormats.value,
  cssSnippets: cssSnippets.value,
  contrast: contrast.value,
  pickedPixel: pickedPixel.value,
  generatedAt: new Date().toISOString()
})

const addRecentColor = (color: RgbaColor) => {
  const normalized = normalizeRgba(color)
  const key = rgbaToHexAlpha(normalized)
  recentColors.value = [
    normalized,
    ...recentColors.value.filter((item) => rgbaToHexAlpha(item) !== key)
  ].slice(0, 12)
}

const setActiveColor = (color: RgbaColor, syncInput = true) => {
  const normalized = normalizeRgba(color)
  activeColor.value = normalized
  colorPickerValue.value = formatRgba(normalized)
  inputError.value = ''

  if (syncInput) {
    colorInput.value = normalized.a < 1 ? formatRgba(normalized) : rgbaToHex(normalized)
  }

  addRecentColor(normalized)
}

const selectColorValue = (value: string) => {
  setActiveColor(parseColorInput(value).color)
}

const handlePickerChange = (value: string | null) => {
  if (!value) {
    return
  }

  try {
    setActiveColor(parseColorInput(value).color)
  } catch (error) {
    inputError.value = error instanceof Error ? error.message : '颜色选择失败'
  }
}

const applyColorInput = () => {
  try {
    const parsed = parseColorInput(colorInput.value)
    setActiveColor(parsed.color, false)
    colorPickerValue.value = formatRgba(parsed.color)
    inputError.value = ''
  } catch (error) {
    inputError.value = error instanceof Error ? error.message : '颜色值解析失败'
  }
}

const resetToDefault = () => {
  setActiveColor(DEFAULT_COLOR)
}

const fallbackCopy = (value: string) => {
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.top = '-1000px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

const copyText = async (value: string, successMessage = '已复制') => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
    } else {
      fallbackCopy(value)
    }
    ElMessage.success(successMessage)
  } catch {
    ElMessage.error('复制失败，请检查浏览器权限')
  }
}

const copyAllResults = async () => {
  const payload = buildColorExport(createSnapshot(), 'txt')
  await copyText(payload.content, '颜色结果已复制')
}

const handleExport = (command: string | number | object) => {
  const format: ColorExportFormat = command === 'json' ? 'json' : 'txt'
  downloadColorExport(createSnapshot(), format)
}

const pickFromScreen = async () => {
  const EyeDropper = (window as WindowWithEyeDropper).EyeDropper
  if (!EyeDropper) {
    ElMessage.warning('当前浏览器不支持系统屏幕取色')
    return
  }

  try {
    const result = await new EyeDropper().open()
    setActiveColor(parseColorInput(result.sRGBHex).color)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      ElMessage.info('已取消屏幕取色')
      return
    }
    ElMessage.error('屏幕取色失败')
  }
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const triggerFilePick = () => {
  fileInputRef.value?.click()
}

const revokeImageUrl = () => {
  if (imageInfo.value?.objectUrl) {
    URL.revokeObjectURL(imageInfo.value.objectUrl)
  }
}

const drawImageFile = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    imageError.value = '请选择图片文件'
    return
  }

  if (file.size > MAX_IMAGE_BYTES) {
    imageError.value = `图片不能超过 ${formatBytes(MAX_IMAGE_BYTES)}`
    return
  }

  const objectUrl = URL.createObjectURL(file)
  const image = new Image()

  image.onload = async () => {
    revokeImageUrl()
    imageInfo.value = {
      name: file.name,
      size: file.size,
      width: image.naturalWidth,
      height: image.naturalHeight,
      objectUrl
    }
    pickedPixel.value = undefined
    imageError.value = ''
    await nextTick()

    const canvas = canvasRef.value
    const context = canvas?.getContext('2d', { willReadFrequently: true })
    if (!canvas || !context) {
      imageError.value = '当前浏览器无法读取图片像素'
      return
    }

    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0)
  }

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    imageError.value = '图片读取失败'
  }

  image.src = objectUrl
}

const handleFileInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    void drawImageFile(file)
  }
  input.value = ''
}

const handleDrop = (event: DragEvent) => {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    void drawImageFile(file)
  }
}

const handlePaste = (event: ClipboardEvent) => {
  const items = Array.from(event.clipboardData?.items || [])
  const imageItem = items.find((item) => item.type.startsWith('image/'))
  const file = imageItem?.getAsFile()
  if (file) {
    void drawImageFile(file)
  }
}

const pickCanvasPixel = (event: MouseEvent) => {
  const canvas = canvasRef.value
  const context = canvas?.getContext('2d', { willReadFrequently: true })
  if (!canvas || !context || !imageInfo.value) {
    return
  }

  const rect = canvas.getBoundingClientRect()
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width)
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height)
  const safeX = Math.min(canvas.width - 1, Math.max(0, x))
  const safeY = Math.min(canvas.height - 1, Math.max(0, y))
  const [r, g, b, alpha] = context.getImageData(safeX, safeY, 1, 1).data
  const color = normalizeRgba({ r, g, b, a: alpha / 255 })

  pickedPixel.value = {
    x: safeX,
    y: safeY,
    width: canvas.width,
    height: canvas.height,
    color
  }
  setActiveColor(color)
}

const clearImage = () => {
  revokeImageUrl()
  imageInfo.value = null
  pickedPixel.value = undefined
  imageError.value = ''

  const canvas = canvasRef.value
  const context = canvas?.getContext('2d')
  if (canvas && context) {
    context.clearRect(0, 0, canvas.width, canvas.height)
    canvas.width = 0
    canvas.height = 0
  }
}

const clearAll = () => {
  activeColor.value = { ...DEFAULT_COLOR }
  colorInput.value = rgbaToHex(DEFAULT_COLOR)
  colorPickerValue.value = formatRgba(DEFAULT_COLOR)
  inputError.value = ''
  cssVariableName.value = '--iw-color-custom'
  recentColors.value = []
  clearImage()
  ElMessage.success('已清空当前状态')
}

onBeforeUnmount(() => {
  revokeImageUrl()
})
</script>

<style scoped>
.color-page {
  min-height: 100vh;
  padding: 24px;
  color: #1f2937;
  background: #f6f8fb;
}

.color-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  width: min(1360px, 100%);
  margin: 0 auto 18px;
  padding: 18px 20px;
  background: #ffffff;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
}

.topbar-title {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.topbar-title h1 {
  width: 100%;
  margin: 0;
  font-size: 24px;
  line-height: 1.3;
  letter-spacing: 0;
}

.privacy-copy,
.muted-copy {
  color: #5b6472;
  font-size: 13px;
  line-height: 1.6;
}

.topbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.color-workbench {
  display: grid;
  grid-template-columns: minmax(320px, 0.95fr) minmax(420px, 1.3fr) minmax(320px, 0.9fr);
  gap: 16px;
  width: min(1360px, 100%);
  margin: 0 auto;
}

.preview-panel,
.control-panel,
.formats-panel,
.snippet-panel,
.image-panel {
  min-width: 0;
  padding: 18px;
  background: #ffffff;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
}

.preview-panel {
  grid-column: span 2;
}

.image-panel {
  grid-column: span 3;
}

.panel-head,
.section-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-head h2,
.swatch-section h3,
.section-title-row h3 {
  margin: 0;
  font-size: 17px;
  line-height: 1.35;
  letter-spacing: 0;
}

.panel-head p {
  margin: 4px 0 0;
  color: #5b6472;
  font-size: 13px;
  line-height: 1.6;
}

.color-preview-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(260px, 0.85fr);
  gap: 14px;
}

.color-hero {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 260px;
  padding: 22px;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background-image:
    linear-gradient(45deg, rgba(0, 0, 0, 0.08) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(0, 0, 0, 0.08) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, 0.08) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, 0.08) 75%);
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  background-size: 16px 16px;
}

.color-hero strong {
  font-size: 34px;
  line-height: 1.2;
  letter-spacing: 0;
}

.color-hero span {
  margin-top: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 14px;
}

.preview-stack {
  display: grid;
  gap: 14px;
}

.preview-sample {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 123px;
  padding: 18px;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
}

.preview-sample.light {
  background: #ffffff;
}

.preview-sample strong {
  font-size: 18px;
  line-height: 1.4;
}

.preview-sample span {
  margin-top: 6px;
  font-size: 13px;
}

.contrast-grid,
.pixel-info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.contrast-grid > div,
.pixel-info-grid > div {
  min-width: 0;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e5e9f0;
  border-radius: 8px;
}

.contrast-grid span,
.pixel-info-grid span {
  display: block;
  color: #64748b;
  font-size: 12px;
}

.contrast-grid strong,
.pixel-info-grid strong {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  font-size: 16px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pixel-info-grid small {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control-form {
  margin-bottom: 16px;
}

.input-row,
.button-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.input-row .el-input {
  min-width: 0;
}

.inline-alert {
  margin-bottom: 12px;
}

.swatch-section {
  padding-top: 14px;
  border-top: 1px solid #edf1f7;
}

.swatch-section + .swatch-section {
  margin-top: 14px;
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.swatch-button {
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid #d6dce6;
  border-radius: 8px;
  cursor: pointer;
}

.swatch-button:hover,
.swatch-button:focus-visible {
  border-color: #409eff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.18);
}

.swatch-button.checker {
  overflow: hidden;
  background-color: #ffffff;
  background-image:
    linear-gradient(45deg, #dfe5ee 25%, transparent 25%),
    linear-gradient(-45deg, #dfe5ee 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #dfe5ee 75%),
    linear-gradient(-45deg, transparent 75%, #dfe5ee 75%);
  background-position: 0 0, 0 6px, 6px -6px, -6px 0;
  background-size: 12px 12px;
}

.swatch-button.checker span {
  display: block;
  width: 100%;
  height: 100%;
}

.small-empty {
  padding: 10px 0;
}

.result-list,
.snippet-list {
  display: grid;
  gap: 8px;
}

.result-row,
.snippet-row {
  display: grid;
  grid-template-columns: minmax(110px, 0.8fr) minmax(0, 1fr) 18px;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 11px 12px;
  color: #1f2937;
  text-align: left;
  background: #f8fafc;
  border: 1px solid #e5e9f0;
  border-radius: 8px;
  cursor: pointer;
}

.snippet-row {
  grid-template-columns: minmax(86px, 0.45fr) minmax(0, 1fr);
}

.result-row:hover,
.result-row:focus-visible,
.snippet-row:hover,
.snippet-row:focus-visible {
  border-color: #409eff;
  outline: none;
}

.result-row strong,
.snippet-row span {
  display: block;
  font-size: 13px;
  line-height: 1.35;
}

.result-row small {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.result-row code,
.snippet-row code {
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.45fr) minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
}

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  padding: 20px;
  color: #475569;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #aeb8c8;
  border-radius: 8px;
  cursor: pointer;
}

.drop-zone.dragging,
.drop-zone:hover {
  color: #1f7a55;
  background: #f1fbf6;
  border-color: #1f7a55;
}

.drop-zone .el-icon {
  margin-bottom: 10px;
  font-size: 28px;
}

.drop-zone strong {
  font-size: 15px;
}

.drop-zone span {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
}

.hidden-input {
  display: none;
}

.canvas-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  overflow: auto;
  background: #f8fafc;
  border: 1px solid #e5e9f0;
  border-radius: 8px;
}

.image-canvas {
  display: block;
  max-width: 100%;
  max-height: 520px;
  cursor: crosshair;
}

.pixel-color-cell button {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  margin-top: 5px;
  padding: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.pixel-color-cell i {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}

@media (max-width: 1180px) {
  .color-workbench {
    grid-template-columns: minmax(0, 1fr) minmax(320px, 0.9fr);
  }

  .preview-panel,
  .image-panel {
    grid-column: span 2;
  }
}

@media (max-width: 860px) {
  .color-page {
    padding: 14px;
  }

  .color-topbar,
  .panel-head {
    flex-direction: column;
  }

  .topbar-actions,
  .input-row,
  .button-row {
    justify-content: flex-start;
    width: 100%;
  }

  .color-workbench,
  .color-preview-grid,
  .image-grid {
    grid-template-columns: 1fr;
  }

  .preview-panel,
  .image-panel {
    grid-column: span 1;
  }

  .contrast-grid,
  .pixel-info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .result-row,
  .snippet-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .topbar-actions .el-button,
  .topbar-actions .el-dropdown,
  .button-row .el-button {
    width: 100%;
  }

  .color-hero {
    min-height: 210px;
  }

  .contrast-grid,
  .pixel-info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
