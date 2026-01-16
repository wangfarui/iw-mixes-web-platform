<template>
  <div v-loading="loading">
    <div style="display: flex; gap: 10px; margin-bottom: 16px;">
      <el-button type="primary" @click="searchPage">刷新</el-button>
    </div>

    <div style="margin-bottom: 16px;">
      <el-row>
        <el-col :span="3">
          <el-input
              v-model="page.dto.source"
              placeholder="搜索积分来源"
              clearable
              style="width: 150px"
              @change="searchPage"
          />
        </el-col>
        <el-col :span="3">
          <el-select
              v-model="page.dto.transactionType"
              placeholder="积分变动类型"
              clearable
              style="width: 150px"
              @change="searchPage"
          >
            <el-option label="增加" :value="1"/>
            <el-option label="扣减" :value="2"/>
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              @change="handleDateChange"
              class="date-picker-width"
          />
        </el-col>
      </el-row>
    </div>

    <div>
      <el-table :data="page.list" style="width: 100%">
        <el-table-column prop="source" label="积分来源" width="225"/>
        <el-table-column prop="transactionType" label="变动类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.transactionType === 1 ? 'success' : 'danger'">
              {{ row.transactionType === 1 ? '增加' : '扣减' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="points" label="变动积分" width="120">
          <template #default="{ row }">
            <span :style="{ color: row.transactionType === 1 ? '#67c23a' : '#f56c6c' }">
              {{ row.transactionType === 1 ? '+' : '' }}{{ row.points }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180"/>
        <el-table-column prop="remark" label="备注" min-width="200"/>
      </el-table>

      <el-pagination
        :current-page="page.dto.currentPage"
        :page-size="page.dto.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="sizes, prev, pager, next, total"
        :total="page.total"
        :background="true"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import type { PointsRecordsPageDto, PointsRecordsPageVo } from "@/types/points"
import { queryPointsRecordsPage } from "@/api/points"
import { ElMessage } from 'element-plus'

const loading = ref(false)
const dateRange = ref<[Date, Date] | null>(null)

const page = reactive({
  dto: {
    currentPage: 1,
    pageSize: 10,
    source: undefined,
    transactionType: undefined,
    createStartTime: undefined,
    createEndTime: undefined
  } as PointsRecordsPageDto,
  total: 0,
  list: [] as Array<PointsRecordsPageVo>
})

onMounted(() => {
  searchPage()
})

function searchPage() {
  loading.value = true
  queryPointsRecordsPage(page.dto).then(data => {
    page.total = data.data.total
    page.list = data.data.records
    loading.value = false
  }).catch(error => {
    ElMessage.error('加载数据失败')
    loading.value = false
  }).finally(() => {
    loading.value = false
  })
}

const handleSizeChange = (val: number) => {
  page.dto.currentPage = 1
  page.dto.pageSize = val
  searchPage()
}

const handleCurrentChange = (val: number) => {
  page.dto.currentPage = val
  searchPage()
}

const handleDateChange = (val: [Date, Date] | null) => {
  if (val && val.length === 2) {
    // 格式化为 ISO 字符串格式，服务端会通过 Deserializer 转换
    page.dto.createStartTime = val[0].toISOString().split('T')[0]
    page.dto.createEndTime = val[1].toISOString().split('T')[0]
  } else {
    page.dto.createStartTime = undefined
    page.dto.createEndTime = undefined
  }
  page.dto.currentPage = 1
  searchPage()
}
</script>

<style scoped>
.date-picker-width :deep(.el-input) {
  width: 280px;
}
</style>