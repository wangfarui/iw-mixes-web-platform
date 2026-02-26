<template>
  <div v-loading="loading">
    <div class="filter-bar">
      <el-row :gutter="12">
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-input
              v-model="page.dto.taskName"
              placeholder="搜索任务名称"
              clearable
              style="width: 100%"
              @change="searchPage"
          />
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-select
              v-model="page.dto.taskStatus"
              placeholder="任务状态"
              clearable
              style="width: 100%"
              @change="searchPage"
          >
            <el-option label="未完成" :value="0"/>
            <el-option label="已完成" :value="1"/>
            <el-option label="已放弃" :value="2"/>
            <el-option label="已删除" :value="3"/>
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="24" :md="12" :lg="8">
          <el-date-picker
              v-model="deadlineRange"
              type="daterange"
              range-separator="至"
              start-placeholder="截止日期-开始"
              end-placeholder="截止日期-结束"
              value-format="YYYY-MM-DD"
              clearable
              style="width: 100%"
              @change="handleDeadlineRangeChange"
          />
        </el-col>
        <el-col :xs="24" :sm="24" :md="12" :lg="8">
          <el-date-picker
              v-model="doneRange"
              type="daterange"
              range-separator="至"
              start-placeholder="完成时间-开始"
              end-placeholder="完成时间-结束"
              value-format="YYYY-MM-DD"
              clearable
              style="width: 100%"
              @change="handleDoneRangeChange"
          />
        </el-col>
        <el-col :xs="24" :sm="24" :md="8" :lg="4" class="filter-actions">
          <el-button type="primary" @click="searchPage">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
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
        <el-table-column prop="createTime" label="创建日期" width="120"/>
        <el-table-column prop="deadlineDate" label="截止日期" width="120"/>
        <el-table-column prop="doneTime" label="任务完成时间" width="160"/>
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
    taskName: undefined,
    startDeadlineDate: undefined,
    endDeadlineDate: undefined,
    startDoneTime: undefined,
    endDoneTime: undefined
  } as TaskRecordsPageDto,
  total: 0,
  list: [] as Array<TaskRecordsPageVo>
})

const deadlineRange = ref<[string, string] | undefined>(undefined)
const doneRange = ref<[string, string] | undefined>(undefined)

onMounted(() => {
  searchPage()
})

const handleDeadlineRangeChange = (val: [string, string] | null) => {
  if (!val || val.length !== 2) {
    page.dto.startDeadlineDate = undefined
    page.dto.endDeadlineDate = undefined
  } else {
    page.dto.startDeadlineDate = val[0]
    page.dto.endDeadlineDate = val[1]
  }
  searchPage()
}

const handleDoneRangeChange = (val: [string, string] | null) => {
  if (!val || val.length !== 2) {
    page.dto.startDoneTime = undefined
    page.dto.endDoneTime = undefined
  } else {
    page.dto.startDoneTime = val[0]
    page.dto.endDoneTime = val[1]
  }
  searchPage()
}

const resetFilters = () => {
  page.dto.taskName = undefined
  page.dto.taskStatus = undefined
  page.dto.startDeadlineDate = undefined
  page.dto.endDeadlineDate = undefined
  page.dto.startDoneTime = undefined
  page.dto.endDoneTime = undefined
  page.dto.currentPage = 1
  deadlineRange.value = undefined
  doneRange.value = undefined
  searchPage()
}

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
.filter-bar {
  margin-bottom: 16px;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .filter-actions {
    justify-content: flex-start;
  }
}

:deep(.el-table__body) {
  border-collapse: separate;
  border-spacing: 0 8px;
}

:deep(.el-table__body-wrapper) {
  padding: 4px 0;
}

:deep(.el-table__body tr td) {
  background: #fff;
}

:deep(.el-table__body tr td:first-child) {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

:deep(.el-table__body tr td:last-child) {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}
</style>
