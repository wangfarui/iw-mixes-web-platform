<template>
  <div v-loading="loading">
    <div>
      <el-button type="primary" @click="handleDishesAdd">新增菜品</el-button>
      <el-button type="primary" @click="searchPage">刷新</el-button>
    </div>
    <div>
      <el-table :data="page.list" style="width: 100%" @row-dblclick="handleClick">
        <el-table-column prop="dishesName" label="菜品名称" width="180" />
        <el-table-column prop="dishesType" label="菜品分类" width="100">
          <template #default="{ row }">
            {{ getDishesTypeLabel(row.dishesType) }}
          </template>
        </el-table-column>
        <el-table-column prop="difficultyFactor" label="难度系数" width="100" />
        <el-table-column prop="useTime" label="用时" width="100" :formatter="formatUseTime" />
        <el-table-column prop="prices" label="价格" width="100" :formatter="formatPrices" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            {{ getStatusLabel(row.status) }}
          </template>
        </el-table-column>
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
import type {DishesListData, DishesPageDto} from "@/types/dishes"
import {queryDishesPage, queryDishesDetail, deleteDishes} from "@/api/dishes"

const loading = ref(false)

const page = reactive({
  dto: {
    currentPage: 1,
    pageSize: 10
  } as DishesPageDto,
  total: 0,
  list: [

  ] as Array<DishesListData>
})

onMounted(() => {
  searchPage()
})

function searchPage() {
  loading.value = true
  queryDishesPage(page.dto).then(data => {
    page.total = data.data.total
    page.list = data.data.records
    loading.value = false
  }).catch(err => {
    console.log(err)
    loading.value = false
  })
}

function formatUseTime(row: any, column: any, cellValue: any, index: number) {
  if (cellValue == 0) {
    return ''
  }
  return cellValue + '分钟'
}

function formatPrices(row: any, column: any, cellValue: any, index: number) {
  if (cellValue == 0) {
    return '免费'
  }
  return cellValue + '元'
}

const getDishesTypeLabel = (dishesType: number) => {
  // 根据枚举值返回相应的标签
  if (dishesType === 1) {
    return '荤'
  } else if (dishesType === 2) {
    return '素'
  } else if (dishesType === 3) {
    return '荤素'
  } else {
    return ''
  }
}

const getStatusLabel = (status: number) => {
  // 根据枚举值返回相应的标签
  if (status === 1) {
    return '启用'
  } else if (status === 2) {
    return '禁用'
  } else if (status === 3) {
    return '售空'
  } else {
    return ''
  }
}

function handleDishesAdd() {
  router.push({path: '/dishes/add'})
}

const handleClick = (row: DishesListData) => {
  queryDishesDetail(row.id).then(res => {
    router.push({path: '/dishes/add', query: {
        operate: "show",
        data: JSON.stringify(res.data)
      }})
  })
}

const handleEdit = (index: number, row: DishesListData) => {
  queryDishesDetail(row.id).then(res => {
    router.push({path: '/dishes/add', query: {
        operate: "update",
        data: JSON.stringify(res.data)
      }})
  })
}
const handleDelete = (index: number, row: DishesListData) => {
  deleteDishes(row.id).then(res => {
    searchPage()
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

<style scoped>

</style>