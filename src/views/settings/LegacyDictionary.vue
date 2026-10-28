<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { legacySystemType } from '@/api/systemOptions'
const route = useRoute(), destination = ref('')
onMounted(async () => {
  if (!route.params.id) return
  try {
    const type = await legacySystemType(String(route.params.id))
    destination.value = [3002,3003,3004,3010,3011].includes(type || 0) ? '厨房设置' : [4001,4002,4003,4004,4005,4006,4011].includes(type || 0) ? '记账设置' : type === 2010 ? '账号管理' : '小程序对应业务设置'
  } catch (_) {}
})
</script>
<template><main class="migration"><h1>字典管理已迁入业务设置</h1><p>{{ destination ? `此选项请前往${destination}。` : '请从对应业务管理选项。' }}系统固定项由管理员查看与同步。</p><div class="links"><el-button @click="$router.push('/kitchen/settings')">厨房设置</el-button><el-button @click="$router.push('/bookkeeping/settings')">记账设置</el-button><el-button @click="$router.push('/account')">账号管理</el-button></div><p>食材分类、分区、记账分类与标签、会员类型和衣柜选项，请在小程序对应业务设置中维护。</p></main></template>
<style scoped>.migration{padding:32px;max-width:800px}h1{font-size:24px}p{color:#78818c;line-height:1.8}.links{display:flex;flex-wrap:wrap;gap:12px}.links .el-button{margin:0}</style>
