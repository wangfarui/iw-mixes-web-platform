<template>
  <div v-loading="loading">
    <div>
<!--      <el-button type="primary" @click="handleBookkeepingAdd">新增</el-button>-->
      <el-button type="primary" @click="searchPage">刷新</el-button>
    </div>
    <div>
      <el-table :data="page.list" style="width: 100%" @row-dblclick="handleClick">
        <el-table-column prop="recordTime" label="记录时间" width="180"/>
        <el-table-column prop="recordCategory" label="记录类型" width="180">
          <template #default="{ row }">
            {{
              commonStore.getDictNameByCode(commonStore.dictTypeEnum.BOOKKEEPING_RECORD_CATEGORY, row.recordCategory)
            }}
          </template>
        </el-table-column>
        <el-table-column prop="recordSource" label="记录来源" width="180"/>
        <el-table-column prop="amount" label="金额" width="180"/>
        <el-table-column prop="recordType" label="记录分类" width="180">
          <template #default="{ row }">
            {{ commonStore.getDictNameByCode(commonStore.dictTypeEnum.BOOKKEEPING_RECORD_TYPE, row.recordType) }}
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
import {useCommonStore} from "@/stores";

const commonStore = useCommonStore();

const loading = ref(false)

const page = reactive({
  dto: {
    currentPage: 1,
    pageSize: 10
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
</script>