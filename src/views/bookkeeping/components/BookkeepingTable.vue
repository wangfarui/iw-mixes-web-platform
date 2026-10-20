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
            v-model="page.dto.categoryNames"
            multiple
            placeholder="记录分类"
            clearable
            @change="searchPage"
          >
            <el-option
              v-for="item in filterOptions.categories"
              :key="item.name"
              :label="item.name"
              :value="item.name"
            />
          </el-select>
        </el-col>

        <el-col :span="4">
          <el-select v-model="page.dto.tagNames" multiple clearable placeholder="历史标签" @change="searchPage">
            <el-option v-for="name in tagOptions" :key="name" :label="name" :value="name" />
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
        <el-table-column prop="recordTypeName" label="记录分类" width="180">
          <template #default="{ row }">
            {{ categoryName(row) }}
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="180">
          <template #default="{ row }">{{ tagNames(row) }}</template>
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
    <el-dialog v-model="showDetail" title="账单详情" width="540px">
      <el-descriptions v-if="detail" :column="1" border>
        <el-descriptions-item label="记录时间">{{ detail.recordDate || detail.recordTime }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ detail.recordSource }}</el-descriptions-item>
        <el-descriptions-item label="金额">{{ detail.amount }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ categoryName(detail) }}</el-descriptions-item>
        <el-descriptions-item label="标签">{{ tagNames(detail) || '无' }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ detail.remark || '无' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, reactive, computed} from 'vue'
import router from '@/router'
import type {BookkeepingListData, BookkeepingPageDto, BookkeepingDetailVo, BookkeepingFilterOptions} from "@/types/bookkeeping"
import {queryBookkeepingPage, queryBookkeepingDetail, deleteBookkeeping, queryBookkeepingFilterOptions} from "@/api/bookkeeping"
import {useDictStore} from "@/stores/dict";
import { ElMessage } from 'element-plus'
import request from "@/api/request"
import authSession from '@/services/authSession'

const dictStore = useDictStore();
const baseUrl = import.meta.env.VITE_API_BASE_URL

const loading = ref(false)
const showDetail = ref(false)
const detail = ref<BookkeepingDetailVo | null>(null)
const filterOptions = ref<BookkeepingFilterOptions>({ categories: [], expenseTags: [], incomeTags: [] })
const tagOptions = computed(() => Array.from(new Set((page.dto.recordCategory === 1 ? filterOptions.value.expenseTags : page.dto.recordCategory === 2 ? filterOptions.value.incomeTags : [...filterOptions.value.expenseTags, ...filterOptions.value.incomeTags]).map(item => item.name))))
function tagNames(row: BookkeepingListData) { return (row.recordTagSnapshots || []).map(tag => tag.name).join('、') }
function categoryName(row: BookkeepingListData) {
  return row.dictionarySnapshotStatus === 0 ? '分类待核对' : row.recordTypeName || '未分类'
}
const dateRange = ref<[Date, Date] | null>(null)

const page = reactive({
  dto: {
    currentPage: 1,
    pageSize: 10,
    recordSource: undefined,
    recordCategory: undefined,
    categoryNames: [],
    tagNames: [],
    recordStartDate: undefined,
    recordEndDate: undefined
  } as BookkeepingPageDto,
  total: 0,
  list: [] as Array<BookkeepingListData>
})

onMounted(() => {
  searchPage()
})

let requestSequence = 0
async function searchPage() {
  const requestId = ++requestSequence
  const token = authSession.getToken()
  loading.value = true
  const params = { recordStartDate: page.dto.recordStartDate, recordEndDate: page.dto.recordEndDate, recordCategory: page.dto.recordCategory }
  const isCurrent = () => requestId === requestSequence && token === authSession.getToken()
  try {
    await Promise.all([
      queryBookkeepingPage(page.dto).then(data => {
        if (!isCurrent()) return
        page.total = data.data.total
        page.list = data.data.records
      }),
      queryBookkeepingFilterOptions(params).then(res => {
        if (isCurrent()) filterOptions.value = res.data
      })
    ])
  } finally {
    if (isCurrent()) loading.value = false
  }
}

function handleBookkeepingAdd() {
  router.push({path: '/bookkeeping/add'})
}

const handleClick = async (row: BookkeepingListData) => {
  const res = await queryBookkeepingDetail(row.id)
  detail.value = res.data
  showDetail.value = true
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

