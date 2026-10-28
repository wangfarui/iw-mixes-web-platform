<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import authSession from '@/services/authSession'
import { systemCapabilities, systemPreview, syncSystemOptions, refreshSystemOptionsCache } from '@/api/systemOptions'
import { getAllDictList } from '@/api/login'
import { useDictStore } from '@/stores/dict'
import type { SystemPreview } from '@/types/systemOptions'
const props = defineProps<{ domain: string }>()
const items = computed(() => props.domain === 'kitchen' ? [{ type: 3003, name: '菜品分类' }, { type: 3002, name: '用餐时间' }, { type: 3004, name: '菜品状态' }] : [{ type: 4003, name: '收支类型' }, { type: 4005, name: '订阅计费周期' }, { type: 4006, name: '订阅周期单位' }])
const selected = ref(0), preview = ref<SystemPreview | null>(null), allowed = ref(false), loading = ref(false), busy = ref(false), error = ref(''), confirming = ref(false), committed = ref(false), cachePending = ref(false)
let generation = 0
const active = (seq: number, token: string | null) => seq === generation && token === authSession.getToken()
const canSync = computed(() => allowed.value && preview.value && !preview.value.issues.length && preview.value.addCount + preview.value.correctCount > 0 && !committed.value && !cachePending.value && !busy.value)
async function load(type = selected.value) {
  if (busy.value) return
  const seq = ++generation, token = authSession.getToken()
  selected.value = type; preview.value = null; allowed.value = false; error.value = ''; confirming.value = false; loading.value = true
  try {
    const cap = await systemCapabilities()
    if (!active(seq, token)) return
    if (!cap.manageSystemOptions) { error.value = '当前账号没有系统选项维护权限'; return }
    const result = await systemPreview(props.domain, type)
    if (!active(seq, token)) return
    allowed.value = true; preview.value = result; committed.value = false
  } catch (e) { if (active(seq, token)) error.value = String(e instanceof Error ? e.message : e) }
  finally { if (active(seq, token)) loading.value = false }
}
async function refreshLocal() { const res = await getAllDictList(); useDictStore().setDictDataArrayMap(res.data) }
async function sync() {
  if (!canSync.value || !preview.value) return
  const seq = generation, token = authSession.getToken(), domain = props.domain
  busy.value = true
  let saved = false
  try {
    const result = await syncSystemOptions(domain, selected.value, preview.value.scopeVersion)
    if (!active(seq, token)) return
    saved = true; committed.value = true; confirming.value = false; cachePending.value = !result.cacheRefreshed
    ElMessage.success(result.cacheRefreshed ? '系统选项已同步' : '数据已保存，请重试缓存刷新')
    try { await refreshLocal() } catch (_) { error.value = '数据已保存，候选读取失败，请重新预览。' }
  } catch (e) {
    if (!active(seq, token)) return
    error.value = String(e instanceof Error ? e.message : e)
    try { const cap = await systemCapabilities(); if (active(seq, token) && !cap.manageSystemOptions) { allowed.value = false; preview.value = null; confirming.value = false } }
    catch (_) { if (active(seq, token)) { allowed.value = false; preview.value = null; confirming.value = false } }
  } finally { if (active(seq, token)) busy.value = false }
  if (saved && active(seq, token) && !cachePending.value) await load()
}
async function retryCache() {
  if (busy.value) return
  const seq = generation, token = authSession.getToken()
  busy.value = true
  try { const ok = await refreshSystemOptionsCache(props.domain); if (active(seq, token)) { cachePending.value = !ok; if (ok) await refreshLocal() } }
  catch (_) {} finally { if (active(seq, token)) busy.value = false }
  if (active(seq, token) && !cachePending.value) await load()
}
watch(() => props.domain, () => { busy.value = false; cachePending.value = false; load(items.value[0].type) }, { immediate: true })
const reloadOnSessionEvent = () => { if (busy.value) return; generation++; allowed.value = false; preview.value = null; confirming.value = false; busy.value = false; void load() }
onMounted(() => { window.addEventListener('storage', reloadOnSessionEvent); window.addEventListener('focus', reloadOnSessionEvent) })
onBeforeUnmount(() => { generation++; window.removeEventListener('storage', reloadOnSessionEvent); window.removeEventListener('focus', reloadOnSessionEvent) })
</script>
<template>
  <main class="business-settings">
    <h1>{{ domain === 'kitchen' ? '厨房设置' : '记账设置' }}</h1>
    <p class="muted">系统选项由管理员统一维护，影响所有用户。个人与家庭选项请在小程序对应设置中维护。</p>
    <el-alert v-if="error" :title="error" type="warning" :closable="false" show-icon />
    <el-button class="reload" :disabled="busy" @click="load()">重新预览</el-button>
    <div v-loading="loading" class="settings-layout">
      <nav><el-button v-for="item in items" :key="item.type" :type="selected === item.type ? 'primary' : 'default'" :disabled="busy" @click="load(item.type)">{{ item.name }}</el-button></nav>
      <section v-if="preview && allowed" class="options-panel">
        <h2>{{ preview.definitions[0].name }} <el-tag type="info">系统固定项</el-tag></h2>
        <p class="muted">以当前服务端支持的编码、名称和顺序为准，扩展业务含义需随功能更新。</p>
        <el-table :data="preview.definitions[0].options"><el-table-column prop="name" label="名称"/><el-table-column prop="code" label="编码" width="90"/><el-table-column prop="sort" label="顺序" width="90"/><el-table-column label="状态" width="90"><template #default>启用</template></el-table-column></el-table>
        <h3>差异预览</h3>
        <p>影响 {{ preview.userCount }} 位用户及系统模板；将补齐 {{ preview.addCount }} 条，校准 {{ preview.correctCount }} 条。</p>
        <el-alert v-if="preview.issues.length" title="存在存量异常，已阻止同步；不会自动删除或重映射。" type="error" :closable="false"><p v-for="(issue, i) in preview.issues" :key="i">{{ issue }}</p></el-alert>
        <el-table :data="preview.differences"><el-table-column prop="option" label="选项"/><el-table-column prop="addCount" label="补齐" width="90"/><el-table-column prop="correctCount" label="校准" width="90"/></el-table>
        <div class="actions"><el-button v-if="cachePending" :loading="busy" @click="retryCache">已保存，重试缓存刷新</el-button><el-button v-else type="primary" :disabled="!canSync" :loading="busy" @click="confirming = true">{{ committed ? '已保存，请重新预览' : preview.issues.length ? '存在异常，暂不可同步' : preview.addCount + preview.correctCount ? '同步系统选项' : '已是最新' }}</el-button><el-button :disabled="busy" @click="retryCache">刷新候选缓存</el-button></div>
      </section>
    </div>
    <el-dialog v-model="confirming" title="确认同步系统选项" width="min(92vw, 480px)" :close-on-click-modal="!busy" :close-on-press-escape="!busy" :show-close="!busy">
      <template v-if="preview"><p>本次仅同步「{{ preview.definitions[0].name }}」，影响 {{ preview.userCount }} 位用户及系统模板。</p><p>补齐 {{ preview.addCount }} 条，校准 {{ preview.correctCount }} 条名称、顺序或启用状态。保留现有业务记录和编码。</p></template>
      <template #footer><el-button :disabled="busy" @click="confirming = false">取消</el-button><el-button type="primary" :loading="busy" :disabled="!canSync" @click="sync">确认同步</el-button></template>
    </el-dialog>
  </main>
</template>
<style scoped>
.business-settings{padding:28px;max-width:1100px;margin:auto}h1{font-size:24px}h2{font-size:20px}h3{font-size:17px;margin-top:28px}.muted{color:#7a818b;line-height:1.7}.reload{margin:16px 0}.settings-layout{display:flex;gap:24px;min-height:180px}nav{display:flex;flex-direction:column;gap:12px;min-width:160px}nav .el-button{margin:0}.options-panel{flex:1;min-width:0;background:white;padding:24px;border:1px solid #ebeef0;border-radius:16px}.actions{margin-top:24px}p{line-height:1.7;overflow-wrap:anywhere}@media(max-width:650px){.business-settings{padding:16px}.settings-layout{display:block}nav{flex-direction:row;flex-wrap:wrap;margin-bottom:20px}.options-panel{padding:16px}}
</style>
