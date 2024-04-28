<template>
  <div>
    <div style="margin-bottom: 10px">
      <el-button type="primary" @click="handleDishesAdd">新增菜品</el-button>
    </div>
    <DishesTable permission="edit"/>
  </div>
</template>

<script setup lang="ts">
import router from '@/router'
import DishesTable from "@/views/dishes/DishesTable.vue";

function handleDishesAdd() {
  router.push({path: '/dishes/add'})
}

</script>

<style scoped>

</style>