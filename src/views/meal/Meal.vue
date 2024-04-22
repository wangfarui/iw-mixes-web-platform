<template>
  <div>
    <el-button type="primary">点餐</el-button>
  </div>
  <div>
    <div>点餐列表</div>
    <el-row>
      <el-col :span="6"><div class="grid-content">用餐日期</div></el-col>
      <el-col :span="6"><div class="grid-content">用餐时间</div></el-col>
      <el-col :span="6"><div class="grid-content">用餐人数</div></el-col>
      <el-col :span="6"><div class="grid-content">备注</div></el-col>
    </el-row>
    <div class="infinite-list-wrapper" style="overflow: auto">
      <ul
          v-infinite-scroll="load"
          class="list"
          :infinite-scroll-disabled="disabled"
      >
        <li v-for="l in list" :key="l.id" class="list-item">
          <el-row>
            <el-col :span="6"><div class="grid-content">{{l.mealDate}}</div></el-col>
            <el-col :span="6"><div class="grid-content">{{l.mealTime}}</div></el-col>
            <el-col :span="6"><div class="grid-content">{{l.diners}}</div></el-col>
            <el-col :span="6"><div class="grid-content">{{l.remark}}</div></el-col>
          </el-row>
        </li>
      </ul>
      <p v-if="loading">Loading...</p>
      <p v-if="noMore">No more</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, reactive, ref} from 'vue'

type CustomRouteRecordRaw =  {
  id: number,
  mealDate: string,
  mealTime?: string,
  diners?: number,
  remark?: string
}

const list = reactive([
  {
    id: -1,
    mealDate: new Date().toLocaleDateString(),
    mealTime: '',
    diners: 0,
    remark: ''
  }
] as Array<CustomRouteRecordRaw>)
const count = ref(1)
const loading = ref(false)
const noMore = computed(() => count.value >= 20)
const disabled = computed(() => loading.value || noMore.value)
const load = () => {
  loading.value = true
  setTimeout(() => {
    const today: Date = new Date(); // 当前日期
    const sevenDaysAgo: Date = new Date(today); // 创建一个新的日期对象，初始值为当前日期
    sevenDaysAgo.setDate(today.getDate() - count.value); // 将新日期对象的天数减去7，即得到7天前的日期
    list.push({
      id: count.value,
      mealDate: sevenDaysAgo.toLocaleDateString(),
      mealTime: '晚餐',
      diners: 0,
      remark: '测试'
    })

    count.value += 1
    loading.value = false
  }, 1000)
}
</script>

<style scoped>
.grid-content {
  text-align: center;
  justify-content: center;
}

.infinite-list-wrapper {
  height: 70vh;
  text-align: center;
}
.infinite-list-wrapper .list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.infinite-list-wrapper .list-item {
  align-items: center;
  justify-content: center;
  height: 50px;
  background: var(--el-color-danger-light-9);
  color: black;
}
.infinite-list-wrapper .list-item + .list-item {
  margin-top: 10px;
}
</style>