<template>
  <div class="remote-share-page">
    <header class="tool-header">
      <div>
        <p class="eyebrow">端到端加密 · 两台设备</p>
        <h1>远程共享</h1>
        <p>同一 Wi-Fi 下优先直连；无法直连时自动临时存储。</p>
      </div>
      <ToolHomeButton />
    </header>

    <main class="remote-share-grid">
      <section class="panel session-panel">
        <h2>创建或加入会话</h2>
        <template v-if="!device">
          <el-button type="primary" :loading="loading" class="wide-button" @click="createSession">创建新会话</el-button>
          <el-divider>或</el-divider>
          <el-input v-model="joinLink" placeholder="粘贴对方的分享链接或 #s= 会话秘密" clearable />
          <el-button :loading="loading" class="wide-button" @click="joinSession">加入会话</el-button>
        </template>
        <template v-else>
          <el-tag :type="paired ? 'success' : 'info'" effect="light">{{ paired ? '两台设备已连接' : '等待另一台设备加入' }}</el-tag>
          <p class="status-copy">当前设备：{{ device.slot }} · 会话有效至 {{ expiryText }}</p>
          <el-input :model-value="shareUrl" readonly>
            <template #append><el-button @click="copyShareUrl">复制链接</el-button></template>
          </el-input>
          <el-button type="danger" plain class="wide-button" @click="endSession">结束会话</el-button>
        </template>
      </section>

      <section class="panel send-panel">
        <h2>发送内容</h2>
        <el-tabs v-model="activeTab" stretch>
          <el-tab-pane label="文本" name="text">
            <el-input v-model="textDraft" type="textarea" :rows="10" maxlength="600000" show-word-limit placeholder="输入要共享的文本…" />
            <p class="hint">{{ textBytes }} B · 64 KB 以下在线即时转发；无法直连时自动临时存储。</p>
            <el-button type="primary" class="wide-button" :disabled="!device || !textDraft.trim()" :loading="sending" @click="sendText">发送文本</el-button>
          </el-tab-pane>
          <el-tab-pane label="图片 / 文件" name="file">
            <el-upload drag :auto-upload="false" :show-file-list="false" :on-change="selectFile">
              <el-icon class="upload-icon"><UploadFilled /></el-icon>
              <div class="el-upload__text">拖入或选择图片、文件</div>
              <template #tip><div class="el-upload__tip">单项最大 10 MB；浏览器会先尝试局域网直连。</div></template>
            </el-upload>
            <div v-if="selectedFile" class="file-summary">{{ selectedFile.name }} · {{ formatBytes(selectedFile.size) }}</div>
            <el-button type="primary" class="wide-button" :disabled="!device || !selectedFile" :loading="fileSending" @click="sendFile">发送文件</el-button>
            <el-alert type="info" :closable="false" show-icon title="会先尝试局域网直连；无法直连时自动临时存储。" />
          </el-tab-pane>
        </el-tabs>
      </section>

      <section class="panel records-panel">
        <h2>收发记录</h2>
        <el-empty v-if="records.length === 0" description="创建或加入会话后，收发内容会显示在这里。" />
        <article v-for="record in records" :key="record.id" class="record-item" :class="record.direction">
          <div class="record-meta">{{ record.direction === 'sent' ? '已发送' : '已接收' }} · {{ record.at }}</div>
          <pre>{{ record.text }}</pre>
          <el-button v-if="record.direction === 'received'" text @click="copyText(record.text)">复制</el-button>
          <el-button v-if="record.file" type="primary" text @click="downloadFile(record)">下载并领取</el-button>
        </article>
      </section>
    </main>

    <footer>所有内容均在浏览器中加密；会话秘密只保留在分享链接的 # 片段中。</footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, type UploadFile } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import ToolHomeButton from '@/views/tools/components/ToolHomeButton.vue'
import { beginRemoteShareBinary, claimRemoteShareTexts, closeRemoteShareSession, completeRemoteShareBinary, createRemoteShareSession, downloadRemoteShareChunk, getRemoteShareState, joinRemoteShareSession, pendingRemoteShareBinaries, receiptRemoteShareBinary, sendRemoteShareText, uploadRemoteShareChunk, type RemoteShareDevice } from '@/api/remoteShare'
import { SMALL_TEXT_BYTES, createSessionSecret, decryptBytes, decryptText, deriveSessionMaterial, encryptBytes, encryptText, readSessionSecret, shareLink, utf8ByteLength, type RemoteShareMaterial } from '@/utils/remote-share/remoteShareProtocol'
import { RemoteSharePeer } from '@/utils/remote-share/remoteSharePeer'

interface PendingFile { itemId: string; chunks: number; name: string; type: string; kind: 'file' | 'text' }
interface RecordItem { id: string; direction: 'sent' | 'received'; text: string; at: string; file?: PendingFile }

const loading = ref(false)
const sending = ref(false)
const joinLink = ref('')
const textDraft = ref('')
const activeTab = ref('text')
const device = ref<RemoteShareDevice>()
const material = ref<RemoteShareMaterial>()
const paired = ref(false)
const records = ref<RecordItem[]>([])
const selectedFile = ref<File>()
const fileSending = ref(false)
const knownPendingFiles = new Set<string>()
let pollTimer: number | undefined
let directPeer: RemoteSharePeer | undefined

const shareUrl = computed(() => material.value ? shareLink(window.location.origin, readSessionSecret(window.location.hash) || '') : '')
const expiryText = computed(() => device.value ? new Date(device.value.expiresAt).toLocaleString() : '')
const textBytes = computed(() => utf8ByteLength(textDraft.value))

const secretFromInput = (value: string) => {
  const hash = value.includes('#') ? value.slice(value.indexOf('#')) : `#s=${value.replace(/^#?s=/, '')}`
  return readSessionSecret(hash)
}

const activate = async (secret: string, action: 'create' | 'join') => {
  loading.value = true
  try {
    const nextMaterial = await deriveSessionMaterial(secret)
    const nextDevice = action === 'create' ? await createRemoteShareSession(nextMaterial) : await joinRemoteShareSession(nextMaterial)
    material.value = nextMaterial
    device.value = nextDevice
    window.history.replaceState(null, '', shareLink(window.location.origin, secret))
    await refresh()
    startPolling()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '无法建立会话')
  } finally {
    loading.value = false
  }
}

const createSession = () => activate(createSessionSecret(), 'create')
const joinSession = async () => {
  const secret = secretFromInput(joinLink.value)
  if (!secret) return ElMessage.warning('请输入有效的分享链接或会话秘密')
  await activate(secret, 'join')
}

const refresh = async () => {
  if (!material.value || !device.value) return
  const state = await getRemoteShareState(material.value.roomId, device.value.capability)
  paired.value = state.paired
  if (paired.value && !directPeer) startPeer()
  const pending = await claimRemoteShareTexts(material.value.roomId, device.value.capability)
  for (const item of pending) {
    const text = await decryptText(material.value.contentKey, item.ciphertext)
    records.value.unshift({ id: item.id, direction: 'received', text, at: new Date().toLocaleTimeString() })
  }
  const binaries = await pendingRemoteShareBinaries(material.value.roomId, device.value.capability)
  for (const item of binaries) {
    if (knownPendingFiles.has(item.itemId)) continue
    const manifest = JSON.parse(await decryptText(material.value.contentKey, item.encryptedManifest)) as { name: string; type: string; kind?: 'file' | 'text' }
    knownPendingFiles.add(item.itemId)
    const kind = manifest.kind || 'file'
    records.value.unshift({ id: item.itemId, direction: 'received', text: kind === 'text' ? '收到长文本，点击领取后可复制。' : `收到文件：${manifest.name}`, at: new Date().toLocaleTimeString(), file: { itemId: item.itemId, chunks: item.chunks, name: manifest.name, type: manifest.type, kind } })
  }
}

const startPeer = () => {
  if (!material.value || !device.value || directPeer) return
  directPeer = new RemoteSharePeer(material.value.roomId, device.value.capability, device.value.slot, async (ciphertext) => {
    try {
      const text = await decryptText(material.value!.contentKey, ciphertext)
      records.value.unshift({ id: crypto.randomUUID(), direction: 'received', text, at: new Date().toLocaleTimeString() })
    } catch { ElMessage.warning('收到的内容校验失败') }
  }, () => ElMessage.success('已建立局域网直连'), async (encryptedManifest, encryptedChunks) => {
    try {
      const manifest = JSON.parse(await decryptText(material.value!.contentKey, encryptedManifest)) as { name: string; type: string; kind?: 'file' | 'text' }
      const parts = await Promise.all(encryptedChunks.map(part => decryptBytes(material.value!.contentKey, part)))
      if (manifest.kind === 'text') {
        const text = await new Blob(parts, { type: manifest.type }).text()
        records.value.unshift({ id: crypto.randomUUID(), direction: 'received', text, at: new Date().toLocaleTimeString() })
        return
      }
      const blob = new Blob(parts, { type: manifest.type })
      const url = URL.createObjectURL(blob)
      records.value.unshift({ id: crypto.randomUUID(), direction: 'received', text: `已通过局域网直连收到文件：${manifest.name}`, at: new Date().toLocaleTimeString() })
      const link = document.createElement('a'); link.href = url; link.download = manifest.name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { ElMessage.warning('直连文件校验失败') }
  })
  directPeer.connect()
  window.setTimeout(() => { if (!directPeer?.isOpen()) ElMessage.info('当前无法与对方设备建立直连，可在发送时选择临时存储') }, 5000)
}

const startPolling = () => {
  window.clearInterval(pollTimer)
  pollTimer = window.setInterval(() => refresh().catch(() => undefined), 2500)
}

const sendText = async () => {
  if (!material.value || !device.value) return
  sending.value = true
  try {
    const plaintext = textDraft.value.trim()
    if (utf8ByteLength(plaintext) <= SMALL_TEXT_BYTES && directPeer?.isRelayOpen()) {
      const ciphertext = await encryptText(material.value.contentKey, plaintext)
      directPeer.sendRelay(ciphertext)
    } else if (utf8ByteLength(plaintext) > SMALL_TEXT_BYTES) {
      await sendBinary(new File([plaintext], 'shared-text.txt', { type: 'text/plain;charset=utf-8' }), 'text')
    } else {
      const ciphertext = await encryptText(material.value.contentKey, plaintext)
      await sendRemoteShareText(material.value.roomId, device.value.capability, ciphertext)
      ElMessage.success('文本已加密临时存储，等待对方领取')
    }
    records.value.unshift({ id: crypto.randomUUID(), direction: 'sent', text: plaintext, at: new Date().toLocaleTimeString() })
    textDraft.value = ''
    ElMessage.success('文本已加密发送')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '发送失败')
  } finally {
    sending.value = false
  }
}

const selectFile = (uploadFile: UploadFile) => {
  const file = uploadFile.raw
  if (!file) return
  if (file.size > 10 * 1024 * 1024) return ElMessage.error('单个文件不能超过 10 MB')
  selectedFile.value = file
}
const sendFile = async () => {
  if (!material.value || !device.value || !selectedFile.value) return
  fileSending.value = true
  try {
    await sendBinary(selectedFile.value, 'file')
    selectedFile.value = undefined
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '文件发送失败') } finally { fileSending.value = false }
}
const sendBinary = async (file: File, kind: 'file' | 'text') => {
  if (!material.value || !device.value) return
  const chunkSize = 1024 * 1024
  const chunks = Math.ceil(file.size / chunkSize)
  const totalBytes = file.size + chunks * 28
  const itemId = crypto.randomUUID().replace(/-/g, '')
  const manifest = await encryptText(material.value.contentKey, JSON.stringify({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, kind }))
  const encryptedChunks: Uint8Array[] = []
  for (let index = 0; index < chunks; index += 1) {
    const source = new Uint8Array(await file.slice(index * chunkSize, Math.min(file.size, (index + 1) * chunkSize)).arrayBuffer())
    encryptedChunks.push(await encryptBytes(material.value.contentKey, source))
  }
  if (await waitForDirectPath()) {
    await directPeer!.sendFile(manifest, encryptedChunks)
    if (kind === 'file') records.value.unshift({ id: itemId, direction: 'sent', text: `已通过局域网直连发送文件：${file.name}`, at: new Date().toLocaleTimeString() })
    return
  }
  await beginRemoteShareBinary(material.value.roomId, device.value.capability, itemId, totalBytes, chunks, manifest)
  for (let index = 0; index < chunks; index += 1) {
    await uploadRemoteShareChunk(material.value.roomId, device.value.capability, itemId, index, encryptedChunks[index])
  }
  await completeRemoteShareBinary(material.value.roomId, device.value.capability, itemId)
  ElMessage.success(kind === 'text' ? '长文本已加密临时存储，等待对方领取' : '文件已加密临时存储，等待对方领取')
}
const downloadFile = async (record: RecordItem) => {
  if (!record.file || !material.value || !device.value) return
  try {
    const chunks: Uint8Array[] = []
    for (let index = 0; index < record.file.chunks; index += 1) {
      chunks.push(await decryptBytes(material.value.contentKey, await downloadRemoteShareChunk(material.value.roomId, device.value.capability, record.file.itemId, index)))
    }
    const blob = new Blob(chunks, { type: record.file.type })
    if (record.file.kind === 'text') {
      record.text = await blob.text()
      await receiptRemoteShareBinary(material.value.roomId, device.value.capability, record.file.itemId)
      record.file = undefined
      ElMessage.success('长文本已领取')
      return
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = record.file.name
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    await receiptRemoteShareBinary(material.value.roomId, device.value.capability, record.file.itemId)
    record.file = undefined
    record.text = `已领取文件：${record.text.replace('收到文件：', '')}`
    ElMessage.success('文件已下载，临时内容已删除')
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '文件下载失败') }
}
const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`
const waitForDirectPath = async () => {
  if (directPeer?.isOpen()) return true
  if (!directPeer && paired.value) startPeer()
  if (directPeer) return directPeer.waitForReady(5000)
  await new Promise(resolve => window.setTimeout(resolve, 5000))
  return false
}
const copyText = async (value: string) => { await navigator.clipboard.writeText(value); ElMessage.success('已复制') }
const copyShareUrl = () => copyText(shareUrl.value)
const endSession = async () => {
  if (!material.value || !device.value) return
  await closeRemoteShareSession(material.value.roomId, device.value.capability)
  directPeer?.close()
  directPeer = undefined
  window.clearInterval(pollTimer)
  device.value = undefined
  material.value = undefined
  paired.value = false
  records.value = []
  knownPendingFiles.clear()
  window.history.replaceState(null, '', '/tools/remote-share')
}

onMounted(async () => {
  const secret = readSessionSecret(window.location.hash)
  if (secret) joinLink.value = shareLink(window.location.origin, secret)
})
onBeforeUnmount(() => { window.clearInterval(pollTimer); directPeer?.close() })
</script>

<style scoped>
.remote-share-page { min-height: 100%; padding: 28px; background: #f5f7fb; color: #1f2937; }
.tool-header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; max-width: 1500px; margin: 0 auto 20px; }
.tool-header h1 { margin: 4px 0; font-size: 30px; }.tool-header p { margin: 0; color: #64748b; }.eyebrow { color: #4f46e5 !important; font-weight: 700; font-size: 13px; }
.remote-share-grid { max-width: 1500px; margin: auto; display: grid; grid-template-columns: minmax(260px, .8fr) minmax(360px, 1.1fr) minmax(360px, 1.2fr); gap: 20px; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; box-shadow: 0 2px 8px rgb(15 23 42 / 6%); padding: 22px; min-height: 480px; }.panel h2 { margin-top: 0; font-size: 19px; }.wide-button { width: 100%; margin-top: 14px; }.status-copy,.hint { color: #64748b; font-size: 13px; line-height: 1.6; }.file-summary { margin: 14px 0; color: #334155; }.upload-icon { font-size: 42px; color: #6366f1; }.record-item { margin-bottom: 12px; padding: 12px; border-radius: 10px; background: #f8fafc; }.record-item.sent { border-left: 3px solid #6366f1; }.record-item.received { border-left: 3px solid #10b981; }.record-meta { color: #94a3b8; font-size: 12px; margin-bottom: 8px; }.record-item pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; margin: 0; }.remote-share-page footer { max-width: 1500px; margin: 20px auto 0; text-align: center; color: #94a3b8; font-size: 13px; }
@media (max-width: 1080px) { .remote-share-grid { grid-template-columns: 1fr 1fr; }.records-panel { grid-column: 1 / -1; min-height: 260px; } }
@media (max-width: 700px) { .remote-share-page { padding: 16px; }.tool-header { flex-direction: column; }.remote-share-grid { grid-template-columns: 1fr; }.records-panel { grid-column: auto; } }
</style>
