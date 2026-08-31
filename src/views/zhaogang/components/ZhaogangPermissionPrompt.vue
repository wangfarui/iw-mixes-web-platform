<template>
  <el-alert class="permission-prompt" type="error" show-icon closable @close="$emit('dismiss')">
    <template #title>CODING 令牌权限不足</template>
    <div class="permission-prompt-content">
      <p>{{ prompt.message }}</p>
      <div v-if="prompt.permissions.length" class="missing-permissions">
        <span>需要开通：</span>
        <el-tag v-for="permission in prompt.permissions" :key="permission" type="danger" effect="plain">
          {{ permission }}
        </el-tag>
      </div>
      <el-button type="danger" plain size="small" @click="$emit('open')">前往 CODING 开通权限</el-button>
    </div>
  </el-alert>
</template>

<script setup lang="ts">
import type { ZhaogangPermissionPromptDetail } from '@/services/zhaogangPermissionPrompt'

defineProps<{ prompt: ZhaogangPermissionPromptDetail }>()
defineEmits<{ open: []; dismiss: [] }>()
</script>

<style scoped>
.permission-prompt { flex: 0 0 auto; margin-bottom: 14px; }
.permission-prompt-content { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding-top: 6px; }
.permission-prompt-content p { flex: 1 1 360px; margin: 0; color: #8f2f2f; line-height: 1.55; }
.missing-permissions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; color: #8f2f2f; font-size: 13px; }
</style>
