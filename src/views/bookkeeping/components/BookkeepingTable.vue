<template>
  <div v-loading="loading">
    <div style="display: flex; gap: 10px; margin-bottom: 16px;">
      <el-button type="primary" @click="searchPage">刷新</el-button>
      <el-upload
        class="upload-demo"
        :http-request="handleImport"
        :show-file-list="false"
        accept=".xlsx,.xls,.csv"
      >
        <el-button type="primary">导入</el-button>
      </el-upload>
    </div>

    <div style="margin-bottom: 16px;">
      <el-row :gutter="10">
        <el-col :span="4">
          <el-input
            v-model="page.dto.recordSource"
            placeholder="搜索记录来源"
            clearable
            @change="searchPage"
          />
        </el-col>

        <el-col :span="4">
          <el-select
            v-model="page.dto.recordCategory"
            placeholder="记录类型"
            clearable
            @change="searchPage"
          >
            <el-option
              v-for="item in dictStore.getDictDataArray(dictStore.dictTypeEnum.BOOKKEEPING_RECORD_CATEGORY)"
              :key="item.dictCode"
              :label="item.dictName"
              :value="item.dictCode"
            />
          </el-select>
        </el-col>

        <el-col :span="4">
          <el-select
            v-model="page.dto.recordType"
            placeholder="记录分类"
            clearable
            @change="searchPage"
          >
            <el-option
              v-for="item in dictStore.getDictDataArray(dictStore.dictTypeEnum.BOOKKEEPING_RECORD_TYPE)"
              :key="item.dictCode"
              :label="item.dictName"
              :value="item.dictCode"
            />
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
      <el-table :data="page.list" style="width: 100%" @row-dblclick="handleClick">
        <el-table-column prop="recordTime" label="记录时间" width="180"/>
        <el-table-column prop="recordCategory" label="记录类型" width="180">
          <template #default="{ row }">
            {{
              dictStore.getDictNameByCode(dictStore.dictTypeEnum.BOOKKEEPING_RECORD_CATEGORY, row.recordCategory)
            }}
          </template>
        </el-table-column>
        <el-table-column prop="recordSource" label="记录来源" width="180"/>
        <el-table-column prop="amount" label="金额" width="180"/>
        <el-table-column prop="recordType" label="记录分类" width="180">
          <template #default="{ row }">
            {{ dictStore.getDictNameByCode(dictStore.dictTypeEnum.BOOKKEEPING_RECORD_TYPE, row.recordType) }}
          </template>
        </el-table-column>
<!--        <el-table-column label="操作">-->
<!--          <template #default="scope">-->
<!--            <el-button size="small" @click="handleEdit(scope.$index, scope.row)">-->
<!--              编辑-->
<!--            </el-button>-->
<!--            <el-button-->
<!--                size="small"-->
<!--                type="danger"-->
<!--                @click="handleDelete(scope.$index, scope.row)"-->
<!--            >-->
<!--              删除-->
<!--            </el-button>-->
<!--          </template>-->
<!--        </el-table-column>-->
      </el-table>
      <el-pagination
          :current-page="page.dto.currentPage"
          :page-size="page.dto.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="sizes, prev, pager, next"
          :total="page.total"
          :background="true"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, reactive} from 'vue'
import router from '@/router'
import type {BookkeepingListData, BookkeepingPageDto} from "@/types/bookkeeping"
import {queryBookkeepingPage, queryBookkeepingDetail, deleteBookkeeping} from "@/api/bookkeeping"
import {useDictStore} from "@/stores/dict";
import { ElMessage } from 'element-plus'
import request from "@/api/request"

const dictStore = useDictStore();
const baseUrl = import.meta.env.VITE_API_BASE_URL

const loading = ref(false)
const dateRange = ref<[Date, Date] | null>(null)

const page = reactive({
  dto: {
    currentPage: 1,
    pageSize: 10,
    recordSource: undefined,
    recordCategory: undefined,
    recordType: undefined,
    recordStartDate: undefined,
    recordEndDate: undefined
  } as BookkeepingPageDto,
  total: 0,
  list: [] as Array<BookkeepingListData>
})

onMounted(() => {
  searchPage()
})

function searchPage() {
  loading.value = true
  queryBookkeepingPage(page.dto).then(data => {
    page.total = data.data.total
    page.list = data.data.records
    loading.value = false
  }).finally(() => {
    loading.value = false
  })
}

function handleBookkeepingAdd() {
  router.push({path: '/bookkeeping/add'})
}

const handleClick = (row: BookkeepingListData) => {
  router.push({path: '/bookkeeping/detail'})
}

const handleEdit = (index: number, row: BookkeepingListData) => {
  router.push({path: '/bookkeeping/edit'})
}

const handleDelete = (index: number, row: BookkeepingListData) => {
  loading.value = true
  deleteBookkeeping(row.id).then(res => {
    searchPage()
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
    page.dto.recordStartDate = val[0].toISOString().split('T')[0]
    page.dto.recordEndDate = val[1].toISOString().split('T')[0]
  } else {
    page.dto.recordStartDate = undefined
    page.dto.recordEndDate = undefined
  }
  page.dto.currentPage = 1
  searchPage()
}

const handleImport = async (options: any) => {
  const formData = new FormData()
  formData.append('file', options.file)
  
  try {
    await request({
      url: '/bookkeeping-service/bookkeeping/records/import',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    ElMessage.success('导入成功')
    searchPage()
  } catch (error) {
    ElMessage.error('导入失败')
  }
}
</script>

<style scoped>
.date-picker-width :deep(.el-input) {
  width: 100%;
}

:deep(.el-input),
:deep(.el-select) {
  width: 100%;
}
</style>

