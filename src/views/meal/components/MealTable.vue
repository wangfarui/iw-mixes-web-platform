<template>
  <div v-loading="loading">
    <div>
      <el-button type="primary" @click="handleMealAdd">点餐</el-button>
      <el-button type="primary" @click="searchPage">刷新</el-button>
    </div>
    <div>
      <el-table :data="page.list" style="width: 100%" @row-dblclick="handleClick">
        <el-table-column prop="mealDate" label="用餐日期" width="180"/>
        <el-table-column prop="mealTime" label="用餐时间" width="180">
          <template #default="{ row }">
            {{ dictStore.getDictName('mealTime', row.mealTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="diners" label="用餐人数" width="180"/>
        <el-table-column prop="remark" label="备注"/>
        <el-table-column label="操作">
          <template #default="scope">
            <el-button size="small" @click="handleEdit(scope.$index, scope.row)">
              编辑
            </el-button>
            <el-button
                size="small"
                type="danger"
                @click="handleDelete(scope.$index, scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
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
import type {MealListData, MealPageDto} from "@/types/meal"
import {queryMealPage, queryMealDetail, deleteMeal} from "@/api/meal"
import {useCommonStore} from "@/stores";
import {useMealStore} from "@/stores/meal";

const dictStore = useCommonStore();
const mealStore = useMealStore();

const loading = ref(false)

const page = reactive({
  dto: {
    currentPage: 1,
    pageSize: 10
  } as MealPageDto,
  total: 0,
  list: [] as Array<MealListData>
})

onMounted(() => {
  searchPage()
})

function searchPage() {
  loading.value = true
  queryMealPage(page.dto).then(data => {
    page.total = data.data.total
    page.list = data.data.records
    loading.value = false
  }).finally(() => {
    loading.value = false
  })
}

function handleMealAdd() {
  mealStore.initFormData()
  router.push({path: '/meal/add'})
}

const handleClick = (row: MealListData) => {
  queryMealDetail(row.id).then(res => {
    mealStore.operate = 'show'
    mealStore.formData = res.data
    mealStore.selectDishes.dishesList = res.data.mealMenuList
    router.push({path: '/meal/detail'})
  })
}

const handleEdit = (index: number, row: MealListData) => {
  queryMealDetail(row.id).then(res => {
    mealStore.operate = 'update'
    mealStore.formData = res.data
    mealStore.selectDishes.dishesList = res.data.mealMenuList
    router.push({path: '/meal/edit'})
  })
}

const handleDelete = (index: number, row: MealListData) => {
  loading.value = true
  deleteMeal(row.id).then(res => {
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