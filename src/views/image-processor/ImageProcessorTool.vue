<template>
  <div class="image-page" @paste="handlePaste">
    <header class="image-topbar">
      <div class="topbar-title">
        <h1>图片处理工具</h1>
        <el-tag type="success" effect="light">本地处理 / 不上传</el-tag>
        <span class="privacy-copy">压缩、ASCII、证件照换底色和像素风生成均在当前浏览器完成。</span>
      </div>
      <div class="topbar-actions">
        <ToolHomeButton />
        <el-button type="primary" :disabled="!activeImage || status === 'running'" @click="runProcessing">
          <el-icon><MagicStick /></el-icon>
          开始处理
        </el-button>
        <el-button v-if="status === 'running'" type="warning" @click="cancelProcessing">
          取消
        </el-button>
        <el-button :disabled="!result" @click="copyResult">
          <el-icon><CopyDocument /></el-icon>
          复制
        </el-button>
        <el-dropdown trigger="click" :disabled="!result && batchResults.length === 0" @command="handleExportCommand">
          <el-button :disabled="!result && batchResults.length === 0">
            <el-icon><Download /></el-icon>
            导出
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="result">当前结果</el-dropdown-item>
              <el-dropdown-item command="ascii-txt" :disabled="!result?.asciiText">ASCII 文本</el-dropdown-item>
              <el-dropdown-item command="ascii-html" :disabled="!result?.asciiText">ASCII HTML</el-dropdown-item>
              <el-dropdown-item command="ascii-png" :disabled="!result?.asciiText">ASCII PNG</el-dropdown-item>
              <el-dropdown-item command="zip" :disabled="batchResults.length === 0">批量 ZIP</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button
          v-if="settings.mode === 'compress'"
          :disabled="images.length < 2 || status === 'running'"
          @click="runBatchCompress"
        >
          批量压缩
        </el-button>
        <el-button type="danger" plain @click="clearAll">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </header>

    <main class="image-workbench">
      <aside class="upload-panel">
        <div
          class="drop-zone"
          :class="{ dragging }"
          @dragenter.prevent="dragging = true"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="handleDrop"
          @click="triggerFilePick"
        >
          <el-icon><Upload /></el-icon>
          <strong>拖入或选择图片</strong>
          <span>支持 PNG、JPG、WebP、GIF；也可以直接粘贴剪贴板图片。</span>
        </div>
        <input
          ref="fileInputRef"
          class="hidden-input"
          type="file"
          :accept="IMAGE_ACCEPT"
          multiple
          @change="handleFileInput"
        >

        <div class="file-list-head">
          <span>图片列表</span>
          <el-tag size="small" effect="plain">{{ images.length }} 张</el-tag>
        </div>
        <div v-if="images.length" class="file-list">
          <button
            v-for="image in images"
            :key="image.id"
            class="file-item"
            :class="{ active: image.id === activeImageId }"
            type="button"
            @click="selectImage(image.id)"
          >
            <img :src="image.objectUrl" :alt="image.name">
            <span>
              <strong>{{ image.name }}</strong>
              <small>{{ image.width }} x {{ image.height }} · {{ formatBytes(image.size) }}</small>
            </span>
            <el-button text type="danger" @click.stop="removeImage(image.id)">移除</el-button>
          </button>
        </div>
        <el-empty v-else description="还没有导入图片" class="small-empty" />
      </aside>

      <section class="preview-panel">
        <div class="panel-head">
          <div>
            <h2>预览</h2>
            <p>{{ previewSummary }}</p>
          </div>
          <div class="panel-actions">
            <el-radio-group v-model="settings.mode" size="small">
              <el-radio-button label="compress">压缩</el-radio-button>
              <el-radio-button label="ascii">ASCII</el-radio-button>
              <el-radio-button label="idPhoto">证件照</el-radio-button>
              <el-radio-button label="pixel">像素风</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <el-alert
          v-if="errorMessage"
          class="result-alert"
          type="error"
          :closable="false"
          show-icon
          :title="errorMessage"
        />
        <el-alert
          v-for="warning in result?.warnings || []"
          :key="warning"
          class="result-alert"
          type="warning"
          :closable="false"
          show-icon
          :title="warning"
        />

        <div class="preview-grid">
          <article class="image-preview-card">
            <div class="preview-card-head">
              <strong>原图</strong>
              <span v-if="activeImage">{{ activeImage.width }} x {{ activeImage.height }} · {{ formatBytes(activeImage.size) }}</span>
            </div>
            <div class="image-stage">
              <img v-if="activeImage" :src="activeImage.objectUrl" :alt="activeImage.name">
              <el-empty v-else description="选择图片后查看原图" />
            </div>
          </article>

          <article class="image-preview-card result-card">
            <div class="preview-card-head">
              <strong>结果</strong>
              <span>{{ resultSummary }}</span>
            </div>
            <div class="image-stage result-stage">
              <div v-if="status === 'running'" class="state-panel">
                <el-icon class="is-loading"><RefreshRight /></el-icon>
                <strong>{{ progressText || '正在本地处理...' }}</strong>
                <span>图片不会离开当前浏览器。</span>
              </div>
              <div v-else-if="status === 'error'" class="state-panel error">
                <el-icon><Close /></el-icon>
                <strong>处理失败</strong>
                <span>{{ errorMessage }}</span>
              </div>
              <pre v-else-if="result?.asciiText" class="ascii-preview">{{ result.asciiText }}</pre>
              <div v-else-if="result" class="result-image-wrap">
                <img :src="result.blobUrl" :alt="result.outputName">
                <canvas
                  v-if="settings.mode === 'idPhoto' && result.mode === 'idPhoto'"
                  ref="overlayCanvasRef"
                  class="mask-canvas"
                  @pointerdown="startMaskPaint"
                  @pointermove="paintMask"
                  @pointerup="stopMaskPaint"
                  @pointercancel="stopMaskPaint"
                  @pointerleave="stopMaskPaint"
                />
              </div>
              <el-empty v-else description="点击开始处理生成结果" />
            </div>
          </article>
        </div>

        <div v-if="result" class="result-metrics">
          <div>
            <span>输出尺寸</span>
            <strong>{{ result.width }} x {{ result.height }}</strong>
          </div>
          <div>
            <span>输出体积</span>
            <strong>{{ formatBytes(result.size) }}</strong>
          </div>
          <div>
            <span>耗时</span>
            <strong>{{ result.durationMs }}ms</strong>
          </div>
          <div>
            <span>摘要</span>
            <strong>{{ result.summary }}</strong>
          </div>
        </div>
      </section>

      <aside class="settings-panel">
        <div class="settings-head">
          <h2>{{ modeTitle }}</h2>
          <p>{{ modeDescription }}</p>
        </div>

        <el-form v-if="settings.mode === 'compress'" label-position="top" class="settings-form">
          <el-form-item label="输出格式">
            <el-select v-model="settings.compress.format">
              <el-option label="JPG" value="image/jpeg" />
              <el-option label="PNG" value="image/png" />
              <el-option label="WebP" value="image/webp" />
            </el-select>
          </el-form-item>
          <el-form-item label="质量">
            <el-slider v-model="settings.compress.quality" :min="0.1" :max="1" :step="0.01" :disabled="settings.compress.format === 'image/png'" />
          </el-form-item>
          <el-form-item label="最大宽度">
            <el-input-number v-model="settings.compress.maxWidth" :min="64" :max="8000" controls-position="right" />
          </el-form-item>
          <el-form-item label="最大高度">
            <el-input-number v-model="settings.compress.maxHeight" :min="64" :max="8000" controls-position="right" />
          </el-form-item>
          <el-form-item label="尺寸">
            <el-switch v-model="settings.compress.keepOriginalSize" active-text="保留原尺寸" />
          </el-form-item>
        </el-form>

        <el-form v-else-if="settings.mode === 'ascii'" label-position="top" class="settings-form">
          <el-form-item label="字符宽度">
            <el-slider v-model="settings.ascii.width" :min="32" :max="180" :step="2" show-input />
          </el-form-item>
          <el-form-item label="字符集">
            <el-select v-model="settings.ascii.charset">
              <el-option
                v-for="(label, key) in ASCII_CHARSET_LABELS"
                :key="key"
                :label="label"
                :value="key"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="亮度">
            <el-slider v-model="settings.ascii.brightness" :min="-120" :max="120" :step="1" />
          </el-form-item>
          <el-form-item label="对比度">
            <el-slider v-model="settings.ascii.contrast" :min="-120" :max="120" :step="1" />
          </el-form-item>
          <el-form-item label="显示">
            <div class="inline-switches">
              <el-switch v-model="settings.ascii.invert" active-text="反色" />
              <el-switch v-model="settings.ascii.colored" active-text="彩色 HTML" />
            </div>
          </el-form-item>
          <el-form-item label="文字大小">
            <el-input-number v-model="settings.ascii.fontSize" :min="6" :max="20" controls-position="right" />
          </el-form-item>
          <el-form-item label="颜色">
            <div class="color-row">
              <el-color-picker v-model="settings.ascii.foregroundColor" />
              <el-color-picker v-model="settings.ascii.backgroundColor" />
            </div>
          </el-form-item>
        </el-form>

        <el-form v-else-if="settings.mode === 'idPhoto'" label-position="top" class="settings-form">
          <el-form-item label="尺寸">
            <el-select v-model="settings.idPhoto.preset">
              <el-option
                v-for="(preset, key) in ID_PHOTO_PRESETS"
                :key="key"
                :label="preset.label"
                :value="key"
              />
            </el-select>
          </el-form-item>
          <div class="size-row">
            <el-form-item label="宽">
              <el-input-number v-model="settings.idPhoto.width" :min="64" :max="1600" controls-position="right" />
            </el-form-item>
            <el-form-item label="高">
              <el-input-number v-model="settings.idPhoto.height" :min="64" :max="2000" controls-position="right" />
            </el-form-item>
          </div>
          <el-form-item label="裁切">
            <el-radio-group v-model="settings.idPhoto.fitMode">
              <el-radio-button label="cover">铺满</el-radio-button>
              <el-radio-button label="contain">留边</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="底色">
            <el-select v-model="settings.idPhoto.background">
              <el-option
                v-for="(item, key) in ID_PHOTO_BACKGROUNDS"
                :key="key"
                :label="item.label"
                :value="key"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="settings.idPhoto.background === 'custom'" label="自定义底色">
            <el-color-picker v-model="settings.idPhoto.customColor" />
          </el-form-item>
          <el-form-item label="背景容差">
            <el-slider v-model="settings.idPhoto.tolerance" :min="8" :max="140" :step="1" show-input />
          </el-form-item>
          <el-form-item label="边缘羽化">
            <el-slider v-model="settings.idPhoto.feather" :min="0" :max="6" :step="1" />
          </el-form-item>
          <el-divider />
          <el-form-item label="手动画笔">
            <el-radio-group v-model="settings.idPhoto.brushMode">
              <el-radio-button label="background">标记背景</el-radio-button>
              <el-radio-button label="foreground">保留人物</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="画笔大小">
            <el-slider v-model="settings.idPhoto.brushSize" :min="4" :max="60" :step="1" />
          </el-form-item>
          <div class="brush-actions">
            <el-button :disabled="!manualMask" @click="clearManualMask">清除标记</el-button>
            <el-button type="primary" :disabled="!activeImage || status === 'running'" @click="runProcessing">
              应用修正
            </el-button>
          </div>
        </el-form>

        <el-form v-else label-position="top" class="settings-form">
          <el-form-item label="像素块">
            <el-slider v-model="settings.pixel.blockSize" :min="2" :max="64" :step="1" show-input />
          </el-form-item>
          <el-form-item label="调色板">
            <el-slider v-model="settings.pixel.paletteSize" :min="2" :max="64" :step="1" show-input />
          </el-form-item>
          <el-form-item label="输出格式">
            <el-select v-model="settings.pixel.format">
              <el-option label="PNG" value="image/png" />
              <el-option label="JPG" value="image/jpeg" />
              <el-option label="WebP" value="image/webp" />
            </el-select>
          </el-form-item>
          <el-form-item label="效果">
            <div class="inline-switches">
              <el-switch v-model="settings.pixel.dither" active-text="抖动" />
              <el-switch v-model="settings.pixel.edgeBoost" active-text="锐化" />
            </div>
          </el-form-item>
        </el-form>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  ArrowDown,
  Close,
  CopyDocument,
  Delete,
  Download,
  MagicStick,
  RefreshRight,
  Upload
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import ImageProcessorWorker from '@/workers/imageProcessor.worker?worker'
import type {
  ImageFileItem,
  ImageOutputFormat,
  ImageProcessorMode,
  ImageProcessorResult,
  ImageWorkerPayload,
  ImageWorkerRequest,
  ImageWorkerResponse
} from '@/types/imageProcessor'
import {
  ASCII_CHARSET_LABELS,
  ID_PHOTO_BACKGROUNDS,
  ID_PHOTO_PRESETS,
  IMAGE_ACCEPT,
  IMAGE_PROCESSOR_LIMITS,
  MODE_LABELS,
  createDefaultImageSettings,
  getIdPhotoBackgroundColor
} from '@/utils/image-processor/config'
import { compressImageFile } from '@/utils/image-processor/compress'
import {
  calculateLimitedSize,
  createImageId,
  createOutputName,
  downloadBlob,
  downloadTextFile,
  drawImageToCanvas,
  formatBytes,
  getCanvasImageData,
  getFormatExtension,
  imageDataToBlob,
  readImageFileItem
} from '@/utils/image-processor/files'
import {
  buildAsciiHtmlDocument,
  createZipBlob,
  downloadResult,
  renderAsciiPng
} from '@/utils/image-processor/exporters'

type ImageStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled'
type ExportCommand = 'result' | 'ascii-txt' | 'ascii-html' | 'ascii-png' | 'zip'

const settings = reactive(createDefaultImageSettings())
const images = ref<ImageFileItem[]>([])
const activeImageId = ref('')
const result = ref<ImageProcessorResult | null>(null)
const batchResults = ref<ImageProcessorResult[]>([])
const status = ref<ImageStatus>('idle')
const errorMessage = ref('')
const progressText = ref('')
const dragging = ref(false)
const fileInputRef = ref<HTMLInputElement>()
const overlayCanvasRef = ref<HTMLCanvasElement>()
const manualMask = ref<Uint8Array | null>(null)
const manualMaskWidth = ref(0)
const manualMaskHeight = ref(0)
const drawingMask = ref(false)

let worker: Worker | null = null
let requestId = 0

const activeImage = computed(() => images.value.find((item) => item.id === activeImageId.value) || null)
const modeTitle = computed(() => MODE_LABELS[settings.mode])
const modeDescription = computed(() => {
  if (settings.mode === 'compress') {
    return '调整尺寸、质量和格式，适合批量减小图片体积。'
  }
  if (settings.mode === 'ascii') {
    return '把图片采样成字符画，可复制文本或导出 HTML / PNG。'
  }
  if (settings.mode === 'idPhoto') {
    return '使用本地边缘背景识别换底色，可用画笔标记背景或人物区域。'
  }
  return '用像素块、色阶和抖动生成像素风图片。'
})
const previewSummary = computed(() => {
  if (!activeImage.value) {
    return '导入图片后开始处理。'
  }
  return `${activeImage.value.name} · ${settings.mode === 'idPhoto' ? `${settings.idPhoto.width} x ${settings.idPhoto.height}` : `${activeImage.value.width} x ${activeImage.value.height}`}`
})
const resultSummary = computed(() => {
  if (status.value === 'running') {
    return progressText.value || '正在处理'
  }
  if (!result.value) {
    return '结果会在本地生成'
  }
  if (result.value.compressionRatio !== undefined) {
    const percent = Math.round(result.value.compressionRatio * 100)
    return percent > 0 ? `缩小 ${percent}%` : '体积未减小'
  }
  return result.value.summary
})

watch(() => settings.idPhoto.preset, (preset) => {
  if (preset === 'custom') {
    return
  }
  const nextPreset = ID_PHOTO_PRESETS[preset]
  settings.idPhoto.width = nextPreset.width
  settings.idPhoto.height = nextPreset.height
  resetManualMask()
})

watch(() => settings.mode, () => {
  clearResult()
  resetManualMask()
  errorMessage.value = ''
})

watch(activeImageId, () => {
  clearResult()
  resetManualMask()
  errorMessage.value = ''
})

onBeforeUnmount(() => {
  cancelProcessing()
  revokeAllUrls()
})

const triggerFilePick = () => {
  fileInputRef.value?.click()
}

const handleFileInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  addFiles(Array.from(target.files || []))
  target.value = ''
}

const handleDrop = (event: DragEvent) => {
  dragging.value = false
  addFiles(Array.from(event.dataTransfer?.files || []))
}

const handlePaste = (event: ClipboardEvent) => {
  const files = Array.from(event.clipboardData?.files || []).filter((file) => file.type.startsWith('image/'))
  if (files.length) {
    event.preventDefault()
    addFiles(files)
  }
}

const addFiles = async (files: File[]) => {
  if (!files.length) {
    return
  }

  const remaining = Math.max(0, IMAGE_PROCESSOR_LIMITS.maxBatchFiles - images.value.length)
  const selected = files.slice(0, remaining)
  if (files.length > selected.length) {
    ElMessage.warning(`最多保留 ${IMAGE_PROCESSOR_LIMITS.maxBatchFiles} 张图片`)
  }

  for (const file of selected) {
    try {
      const item = await readImageFileItem(file)
      images.value.push(item)
      if (!activeImageId.value) {
        activeImageId.value = item.id
      }
    } catch (error: any) {
      ElMessage.error(error?.message || `${file.name} 读取失败`)
    }
  }
}

const selectImage = (id: string) => {
  activeImageId.value = id
}

const removeImage = (id: string) => {
  const index = images.value.findIndex((image) => image.id === id)
  if (index < 0) {
    return
  }

  const [removed] = images.value.splice(index, 1)
  URL.revokeObjectURL(removed.objectUrl)
  if (activeImageId.value === id) {
    activeImageId.value = images.value[0]?.id || ''
  }
}

const clearResult = () => {
  if (result.value) {
    URL.revokeObjectURL(result.value.blobUrl)
  }
  result.value = null
  batchResults.value.forEach((item) => URL.revokeObjectURL(item.blobUrl))
  batchResults.value = []
}

const revokeAllUrls = () => {
  images.value.forEach((item) => URL.revokeObjectURL(item.objectUrl))
  clearResult()
}

const clearAll = () => {
  cancelProcessing()
  revokeAllUrls()
  images.value = []
  activeImageId.value = ''
  status.value = 'idle'
  errorMessage.value = ''
  progressText.value = ''
  resetManualMask()
}

const resetManualMask = () => {
  manualMask.value = null
  manualMaskWidth.value = 0
  manualMaskHeight.value = 0
  nextTick(drawManualMaskOverlay)
}

const prepareManualMask = (width: number, height: number) => {
  if (!manualMask.value || manualMaskWidth.value !== width || manualMaskHeight.value !== height) {
    manualMask.value = new Uint8Array(width * height)
    manualMaskWidth.value = width
    manualMaskHeight.value = height
  }
}

const cancelProcessing = () => {
  if (worker) {
    worker.terminate()
    worker = null
  }
  if (status.value === 'running') {
    status.value = 'cancelled'
    progressText.value = ''
  }
}

const runProcessing = async () => {
  const image = activeImage.value
  if (!image) {
    ElMessage.warning('请先选择图片')
    return
  }

  cancelProcessing()
  clearResult()
  status.value = 'running'
  errorMessage.value = ''
  progressText.value = '准备图片数据'

  try {
    if (settings.mode === 'compress') {
      const compressed = await compressImageFile(image, settings.compress)
      setResult({
        id: createImageId(),
        sourceId: image.id,
        sourceName: image.name,
        mode: 'compress',
        outputName: compressed.outputName,
        width: compressed.width,
        height: compressed.height,
        size: compressed.blob.size,
        mimeType: compressed.mimeType,
        blob: compressed.blob,
        blobUrl: URL.createObjectURL(compressed.blob),
        durationMs: compressed.durationMs,
        summary: `${formatBytes(image.size)} -> ${formatBytes(compressed.blob.size)}`,
        compressionRatio: compressed.compressionRatio,
        warnings: compressed.warnings
      })
      return
    }

    const prepared = await prepareImageData(image, settings.mode)
    if (settings.mode === 'idPhoto') {
      prepareManualMask(prepared.imageData.width, prepared.imageData.height)
    }
    progressText.value = '正在 Web Worker 中处理'
    const payload = await runWorker(prepared.imageData, settings.mode)
    await applyWorkerPayload(image, payload)
  } catch (error: any) {
    status.value = 'error'
    errorMessage.value = error?.message || '图片处理失败'
  } finally {
    progressText.value = ''
  }
}

const runBatchCompress = async () => {
  if (images.value.length < 2) {
    ElMessage.warning('至少导入两张图片才能批量压缩')
    return
  }

  cancelProcessing()
  clearResult()
  status.value = 'running'
  errorMessage.value = ''
  const nextResults: ImageProcessorResult[] = []

  try {
    for (let index = 0; index < images.value.length; index += 1) {
      const image = images.value[index]
      progressText.value = `批量压缩 ${index + 1}/${images.value.length}`
      const compressed = await compressImageFile(image, settings.compress)
      nextResults.push({
        id: createImageId(),
        sourceId: image.id,
        sourceName: image.name,
        mode: 'compress',
        outputName: compressed.outputName,
        width: compressed.width,
        height: compressed.height,
        size: compressed.blob.size,
        mimeType: compressed.mimeType,
        blob: compressed.blob,
        blobUrl: URL.createObjectURL(compressed.blob),
        durationMs: compressed.durationMs,
        summary: `${formatBytes(image.size)} -> ${formatBytes(compressed.blob.size)}`,
        compressionRatio: compressed.compressionRatio,
        warnings: compressed.warnings
      })
    }

    batchResults.value = nextResults
    result.value = nextResults[0] || null
    status.value = 'done'
    ElMessage.success(`已压缩 ${nextResults.length} 张图片，可导出 ZIP`)
  } catch (error: any) {
    nextResults.forEach((item) => URL.revokeObjectURL(item.blobUrl))
    status.value = 'error'
    errorMessage.value = error?.message || '批量压缩失败'
  } finally {
    progressText.value = ''
  }
}

const prepareImageData = async (image: ImageFileItem, mode: ImageProcessorMode) => {
  if (mode === 'idPhoto') {
    const background = getIdPhotoBackgroundColor(settings.idPhoto.background, settings.idPhoto.customColor)
    const canvas = await drawImageToCanvas(
      image,
      settings.idPhoto.width,
      settings.idPhoto.height,
      settings.idPhoto.fitMode,
      background
    )
    return {
      imageData: getCanvasImageData(canvas)
    }
  }

  const limit = calculateLimitedSize(image.width, image.height, IMAGE_PROCESSOR_LIMITS.workerMaxDimension)
  const canvas = await drawImageToCanvas(image, limit.width, limit.height, 'contain', '#ffffff')
  return {
    imageData: getCanvasImageData(canvas)
  }
}

const runWorker = (imageData: ImageData, mode: Exclude<ImageProcessorMode, 'compress'>) => {
  return new Promise<ImageWorkerPayload>((resolve, reject) => {
    requestId += 1
    const currentId = requestId
    worker?.terminate()
    worker = new ImageProcessorWorker()
    worker.onmessage = (event: MessageEvent<ImageWorkerResponse>) => {
      if (event.data.id !== currentId) {
        return
      }
      worker?.terminate()
      worker = null
      if (event.data.ok) {
        resolve(event.data.result)
      } else {
        reject(new Error(event.data.error))
      }
    }
    worker.onerror = (event) => {
      worker?.terminate()
      worker = null
      reject(new Error(event.message || '图片处理 Worker 异常'))
    }

    const transfers: Transferable[] = [imageData.data.buffer]
    let request: ImageWorkerRequest
    if (mode === 'ascii') {
      request = {
        id: currentId,
        mode,
        width: imageData.width,
        height: imageData.height,
        imageData,
        settings: { ...settings.ascii }
      }
    } else if (mode === 'idPhoto') {
      const mask = manualMask.value ? new Uint8Array(manualMask.value) : undefined
      if (mask) {
        transfers.push(mask.buffer)
      }
      request = {
        id: currentId,
        mode,
        width: imageData.width,
        height: imageData.height,
        imageData,
        settings: { ...settings.idPhoto },
        manualMask: mask
      }
    } else {
      request = {
        id: currentId,
        mode,
        width: imageData.width,
        height: imageData.height,
        imageData,
        settings: { ...settings.pixel }
      }
    }

    worker.postMessage(request, transfers)
  })
}

const applyWorkerPayload = async (image: ImageFileItem, payload: ImageWorkerPayload) => {
  if (settings.mode === 'ascii') {
    const text = payload.asciiText || ''
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    setResult({
      id: createImageId(),
      sourceId: image.id,
      sourceName: image.name,
      mode: 'ascii',
      outputName: createOutputName(image.name, 'ascii', 'txt'),
      width: payload.width,
      height: payload.height,
      size: blob.size,
      mimeType: 'text/plain',
      blob,
      blobUrl: URL.createObjectURL(blob),
      durationMs: payload.durationMs,
      summary: `${payload.width} 列 x ${payload.height} 行`,
      warnings: payload.warnings,
      asciiText: text,
      asciiHtml: payload.asciiHtml
    })
    return
  }

  if (!payload.imageData) {
    throw new Error('Worker 未返回图片结果')
  }

  const format: ImageOutputFormat = settings.mode === 'pixel' ? settings.pixel.format : 'image/png'
  const blob = await imageDataToBlob(payload.imageData, format, settings.mode === 'pixel' ? 0.92 : 1)
  const suffix = settings.mode === 'idPhoto' ? 'id-photo' : 'pixel'
  const summary = settings.mode === 'idPhoto'
    ? `替换 ${payload.backgroundPixels || 0} 个背景像素`
    : `${settings.pixel.blockSize}px 像素块`

  setResult({
    id: createImageId(),
    sourceId: image.id,
    sourceName: image.name,
    mode: settings.mode,
    outputName: createOutputName(image.name, suffix, getFormatExtension(format)),
    width: payload.width,
    height: payload.height,
    size: blob.size,
    mimeType: format,
    blob,
    blobUrl: URL.createObjectURL(blob),
    durationMs: payload.durationMs,
    summary,
    warnings: payload.warnings
  })
}

const setResult = (nextResult: ImageProcessorResult) => {
  if (result.value) {
    URL.revokeObjectURL(result.value.blobUrl)
  }
  result.value = nextResult
  status.value = 'done'
  nextTick(drawManualMaskOverlay)
}

const copyResult = async () => {
  if (!result.value) {
    return
  }

  try {
    if (result.value.asciiText) {
      await navigator.clipboard.writeText(result.value.asciiText)
      ElMessage.success('已复制 ASCII 文本')
      return
    }

    const ClipboardItemCtor = (window as any).ClipboardItem
    if (ClipboardItemCtor && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItemCtor({
          [result.value.mimeType]: result.value.blob
        })
      ])
      ElMessage.success('已复制图片')
      return
    }

    await navigator.clipboard.writeText(result.value.outputName)
    ElMessage.success('当前浏览器不支持复制图片，已复制文件名')
  } catch {
    ElMessage.error('复制失败，请使用导出按钮下载')
  }
}

const handleExportCommand = async (command: ExportCommand) => {
  if (command === 'zip') {
    await downloadZip()
    return
  }

  if (!result.value) {
    return
  }

  if (command === 'result') {
    downloadResult(result.value)
    return
  }

  if (!result.value.asciiText) {
    return
  }

  if (command === 'ascii-txt') {
    downloadTextFile(result.value.outputName, result.value.asciiText)
  } else if (command === 'ascii-html') {
    const html = result.value.asciiHtml || buildAsciiHtmlDocument(result.value.asciiText, settings.ascii)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    downloadBlob(createOutputName(result.value.sourceName, 'ascii', 'html'), blob)
  } else if (command === 'ascii-png') {
    const blob = await renderAsciiPng(result.value.asciiText, settings.ascii)
    downloadBlob(createOutputName(result.value.sourceName, 'ascii', 'png'), blob)
  }
}

const downloadZip = async () => {
  if (!batchResults.value.length) {
    return
  }
  try {
    const blob = await createZipBlob(batchResults.value)
    downloadBlob(`image-processor-${Date.now()}.zip`, blob)
  } catch (error: any) {
    ElMessage.error(error?.message || 'ZIP 导出失败')
  }
}

const startMaskPaint = (event: PointerEvent) => {
  if (!result.value || result.value.mode !== 'idPhoto') {
    return
  }
  drawingMask.value = true
  ;(event.currentTarget as HTMLCanvasElement).setPointerCapture(event.pointerId)
  paintMask(event)
}

const stopMaskPaint = (event: PointerEvent) => {
  drawingMask.value = false
  const canvas = event.currentTarget as HTMLCanvasElement
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId)
  }
}

const paintMask = (event: PointerEvent) => {
  if (!drawingMask.value || !manualMask.value || !overlayCanvasRef.value) {
    return
  }

  const rect = overlayCanvasRef.value.getBoundingClientRect()
  const x = Math.round(((event.clientX - rect.left) / rect.width) * manualMaskWidth.value)
  const y = Math.round(((event.clientY - rect.top) / rect.height) * manualMaskHeight.value)
  const radius = Math.max(1, Math.round(settings.idPhoto.brushSize))
  const mark = settings.idPhoto.brushMode === 'background' ? 2 : 1

  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      if (offsetX * offsetX + offsetY * offsetY > radius * radius) {
        continue
      }
      const nextX = x + offsetX
      const nextY = y + offsetY
      if (nextX < 0 || nextX >= manualMaskWidth.value || nextY < 0 || nextY >= manualMaskHeight.value) {
        continue
      }
      manualMask.value[nextY * manualMaskWidth.value + nextX] = mark
    }
  }

  drawManualMaskOverlay()
}

const drawManualMaskOverlay = () => {
  const canvas = overlayCanvasRef.value
  if (!canvas || !manualMask.value || !manualMaskWidth.value || !manualMaskHeight.value) {
    if (canvas) {
      const context = canvas.getContext('2d')
      context?.clearRect(0, 0, canvas.width, canvas.height)
    }
    return
  }

  canvas.width = manualMaskWidth.value
  canvas.height = manualMaskHeight.value
  const context = canvas.getContext('2d')
  if (!context) {
    return
  }
  const imageData = context.createImageData(manualMaskWidth.value, manualMaskHeight.value)

  for (let index = 0; index < manualMask.value.length; index += 1) {
    const mark = manualMask.value[index]
    if (!mark) {
      continue
    }
    const offset = index * 4
    if (mark === 2) {
      imageData.data[offset] = 26
      imageData.data[offset + 1] = 115
      imageData.data[offset + 2] = 232
      imageData.data[offset + 3] = 90
    } else {
      imageData.data[offset] = 34
      imageData.data[offset + 1] = 197
      imageData.data[offset + 2] = 94
      imageData.data[offset + 3] = 90
    }
  }

  context.putImageData(imageData, 0, 0)
}

const clearManualMask = () => {
  if (manualMask.value) {
    manualMask.value.fill(0)
  }
  drawManualMaskOverlay()
}
</script>

<style scoped>
.image-page {
  min-height: 100vh;
  padding: 16px;
  background: #f5f7fb;
  color: #1f2937;
}

.image-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.topbar-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 260px;
}

.topbar-title h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
}

.privacy-copy {
  font-size: 13px;
  color: #64748b;
}

.topbar-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.image-workbench {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 320px;
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}

.upload-panel,
.preview-panel,
.settings-panel {
  min-width: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.upload-panel,
.settings-panel {
  padding: 14px;
}

.drop-zone {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 160px;
  padding: 18px;
  border: 1px dashed #b6c2d4;
  border-radius: 8px;
  background: #f8fafc;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease;
}

.drop-zone.dragging {
  border-color: #409eff;
  background: #ecf5ff;
}

.drop-zone .el-icon {
  font-size: 28px;
  color: #409eff;
}

.drop-zone span {
  max-width: 220px;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
}

.hidden-input {
  display: none;
}

.file-list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16px 0 8px;
  font-size: 13px;
  font-weight: 600;
}

.file-list {
  display: grid;
  gap: 8px;
  max-height: calc(100vh - 330px);
  overflow: auto;
}

.file-item {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.file-item.active {
  border-color: #409eff;
  background: #f0f7ff;
}

.file-item img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  background: #eef2f7;
}

.file-item strong,
.file-item small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-item strong {
  font-size: 13px;
}

.file-item small {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.small-empty {
  --el-empty-padding: 24px 0;
}

.preview-panel {
  padding: 0;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid #e5e7eb;
}

.panel-head h2,
.settings-head h2 {
  margin: 0;
  font-size: 16px;
}

.panel-head p,
.settings-head p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #64748b;
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.result-alert {
  margin: 12px 14px 0;
}

.preview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  padding: 14px;
}

.image-preview-card {
  min-width: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.preview-card-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
}

.preview-card-head span {
  overflow: hidden;
  color: #64748b;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-stage {
  display: grid;
  place-items: center;
  min-height: 420px;
  max-height: calc(100vh - 350px);
  padding: 12px;
  overflow: auto;
  background:
    linear-gradient(45deg, #eef2f7 25%, transparent 25%),
    linear-gradient(-45deg, #eef2f7 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eef2f7 75%),
    linear-gradient(-45deg, transparent 75%, #eef2f7 75%);
  background-color: #fff;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  background-size: 16px 16px;
}

.image-stage img {
  max-width: 100%;
  max-height: calc(100vh - 390px);
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
}

.result-stage {
  background-color: #f8fafc;
}

.state-panel {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 220px;
  color: #475569;
  text-align: center;
}

.state-panel .el-icon {
  font-size: 28px;
  color: #409eff;
}

.state-panel.error .el-icon {
  color: #f56c6c;
}

.state-panel span {
  max-width: 260px;
  font-size: 12px;
  line-height: 1.5;
}

.ascii-preview {
  align-self: stretch;
  justify-self: stretch;
  min-height: 360px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border-radius: 6px;
  background: #ffffff;
  color: #111827;
  font: 8px/0.58 "SFMono-Regular", Consolas, monospace;
  letter-spacing: 0;
  white-space: pre;
}

.result-image-wrap {
  position: relative;
  display: grid;
  place-items: center;
  max-width: 100%;
}

.mask-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}

.result-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 0 14px 14px;
}

.result-metrics div {
  min-width: 0;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.result-metrics span,
.result-metrics strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-metrics span {
  font-size: 12px;
  color: #64748b;
}

.result-metrics strong {
  margin-top: 4px;
  font-size: 13px;
}

.settings-head {
  margin-bottom: 14px;
}

.settings-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.settings-form :deep(.el-input-number),
.settings-form :deep(.el-select) {
  width: 100%;
}

.inline-switches,
.color-row,
.brush-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.size-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 1280px) {
  .image-workbench {
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .settings-panel {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .image-page {
    padding: 10px;
  }

  .image-topbar,
  .panel-head {
    display: grid;
  }

  .topbar-actions,
  .panel-actions {
    justify-content: flex-start;
  }

  .image-workbench,
  .preview-grid,
  .result-metrics {
    grid-template-columns: 1fr;
  }

  .image-stage {
    min-height: 280px;
    max-height: none;
  }

  .image-stage img {
    max-height: 420px;
  }
}
</style>
