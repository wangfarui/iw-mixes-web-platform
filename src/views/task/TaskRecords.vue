<template>
  <div v-loading="loading">
    <div style="display: flex; gap: 10px; margin-bottom: 16px;">
      <el-button type="primary" @click="searchPage">刷新</el-button>
    </div>

    <div style="margin-bottom: 16px;">
      <el-row :gutter="10">
        <el-col :span="4">
          <el-input
              v-model="page.dto.taskName"
              placeholder="搜索任务名称"
              clearable
              style="width: 200px"
              @change="searchPage"
          />
        </el-col>
        <el-col :span="4">
          <el-select
              v-model="page.dto.taskStatus"
              placeholder="任务状态"
              clearable
              style="width: 150px"
              @change="searchPage"
          >
            <el-option label="未完成" :value="0"/>
            <el-option label="已完成" :value="1"/>
            <el-option label="已放弃" :value="2"/>
            <el-option label="已删除" :value="3"/>
          </el-select>
        </el-col>
      </el-row>
    </div>

    <div>
      <el-table :data="page.list" style="width: 100%">
        <el-table-column prop="taskGroupName" label="任务分组" width="150"/>
        <el-table-column prop="taskName" label="任务名称" width="200"/>
        <el-table-column prop="taskStatus" label="任务状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.taskStatus)">
              {{ getStatusText(row.taskStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deadlineDate" label="截止日期" width="120"/>
        <el-table-column prop="deadlineTime" label="截止时间" width="100"/>
        <el-table-column prop="taskRemark" label="任务备注" min-width="200"/>
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
import type { TaskRecordsPageDto, TaskRecordsPageVo } from "@/types/task"
import { queryTaskRecordsPage } from "@/api/taskList"
import { ElMessage } from 'element-plus'

const loading = ref(false)

const page = reactive({
  dto: {
    currentPage: 1,
    pageSize: 10,
    taskStatus: undefined,
    taskName: undefined
  } as TaskRecordsPageDto,
  total: 0,
  list: [] as Array<TaskRecordsPageVo>
})

onMounted(() => {
  searchPage()
})

function searchPage() {
  loading.value = true
  queryTaskRecordsPage(page.dto).then(data => {
    page.total = data.data.total
    page.list = data.data.records
  }).catch(() => {
    ElMessage.error('加载数据失败')
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

const getStatusType = (status: number) => {
  const typeMap: Record<number, string> = {
    0: 'warning',
    1: 'success',
    2: 'info',
    3: 'danger'
  }
  return typeMap[status] || ''
}

const getStatusText = (status: number) => {
  const textMap: Record<number, string> = {
    0: '未完成',
    1: '已完成',
    2: '已放弃',
    3: '已删除'
  }
  return textMap[status] || '未知'
}
</script>

<style scoped>
</style>