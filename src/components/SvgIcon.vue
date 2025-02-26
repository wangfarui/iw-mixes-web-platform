<template>
  <el-icon :size="size">
    <component
        :is="loadedIcon"
        v-if="loadedIcon"
        class="svg-icon"
    />
  </el-icon>
</template>


<script setup>
import { shallowRef, watchEffect } from 'vue'

const props = defineProps({
  name: String, // 传入的图标名称
  size: {
    type: [String, Number],
    default: 16, // 可以设置默认大小
  },
})

const loadedIcon = shallowRef(null)

watchEffect(async () => {
  if (!props.name) return

  try {
    // 动态导入 SVG
    const iconModule = await import(`@/assets/icons/${props.name}.svg`)
    loadedIcon.value = iconModule.default
  } catch (error) {
    console.error(`SVG 图标加载失败: ${props.name}`, error)
  }
})
</script>

<style scoped>
.svg-icon {
  width: 1em;
  height: 1em;
  fill: currentColor;
  vertical-align: middle;
}
</style>
