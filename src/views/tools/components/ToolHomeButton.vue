<template>
  <el-button class="tool-home-button" aria-label="返回工具首页" @click="goToolsHome">
    <el-icon><Back /></el-icon>
    工具首页
  </el-button>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Back } from '@element-plus/icons-vue'

const router = useRouter()

const goToolsHome = () => {
  router.push('/tools/home')
}
</script>

<style scoped>
.tool-home-button {
  flex-shrink: 0;
}
</style>
