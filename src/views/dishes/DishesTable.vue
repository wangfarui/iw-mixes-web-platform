<template>
  <div v-loading="loading">
    <div style="margin-bottom: 10px">
      <el-row :gutter="20" class="search-row">
        <el-col :span="6">
          <div class="search-input">
            <span class="label">菜品名称:</span>
            <el-input v-model="page.dto.dishesName" @keyup.enter="searchPage" placeholder="请输入菜品名称"/>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="search-input">
            <span class="label">菜品分类:</span>
            <el-select v-model="page.dto.dishesType" clearable placeholder="请选择菜品分类">
              <el-option label="未知" :value="0"/>
              <el-option label="荤" :value="1"/>
              <el-option label="素" :value="2"/>
              <el-option label="荤素" :value="3"/>
            </el-select>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="search-input">
            <span class="label">状态:</span>
            <el-select v-model="page.dto.status" clearable placeholder="请选择菜品状态">
              <el-option label="启用" :value="1"/>
              <el-option label="禁用" :value="2"/>
              <el-option label="售空" :value="3"/>
            </el-select>
          </div>
        </el-col>
        <el-col :span="6" class="search-btns">
          <el-button type="primary" @click="searchPage">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-col>
      </el-row>
    </div>

    <el-table :data="page.list"
              style="width: 100%"
              @row-dblclick="handleClick"
              @selection-change="handleSelectionChange"
    >
      <el-table-column v-if="permission == 2" type="selection" width="55"/>
      <el-table-column prop="dishesName" label="菜品名称" width="180"/>
      <el-table-column prop="dishesType" label="菜品分类" width="100">
        <template #default="{ row }">
          {{ getDishesTypeLabel(row.dishesType) }}
        </template>
      </el-table-column>
      <el-table-column prop="difficultyFactor" label="难度系数" width="100"/>
      <el-table-column prop="useTime" label="用时" width="100" :formatter="formatUseTime"/>
      <el-table-column prop="prices" label="价格" width="100" :formatter="formatPrices"/>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          {{ getStatusLabel(row.status) }}
        </template>
      </el-table-column>
      <el-table-column v-if="permission == 1" label="操作">
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
</template>

<script setup lang="ts">
import {ref, onMounted, reactive} from 'vue'
import router from '@/router'
import type {DishesListData, DishesPageDto} from "@/types/dishes"
import {queryDishesPage, queryDishesDetail, deleteDishes} from "@/api/dishes"

const props = defineProps<{
  permission?: string
}>()

const loading = ref(false)
const permission = ref(
    props.permission == undefined ? 0
        : props.permission == 'edit' ? 1
            : props.permission == 'select' ? 2
                : 0
)

const page = reactive({
  dto: {
    currentPage: 1,
    pageSize: 10,
    dishesName: '',
    dishesType: undefined,
    status: undefined
  } as DishesPageDto,
  total: 0,
  list: [] as Array<DishesListData>
})

const multipleSelection = ref<DishesListData[]>([])

defineExpose({
  multipleSelection
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
  }).finally(() => {
    loading.value = false
  })
}

function resetSearch() {
  page.dto.dishesName = ''
  page.dto.dishesType = undefined
  page.dto.status = undefined
  searchPage()
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

const handleClick = (row: DishesListData) => {
  if (permission.value != 1) return;
  queryDishesDetail(row.id).then(res => {
    router.push({
      path: '/dishes/add', query: {
        operate: "show",
        data: JSON.stringify(res.data)
      }
    })
  })
}

const handleEdit = (index: number, row: DishesListData) => {
  queryDishesDetail(row.id).then(res => {
    router.push({
      path: '/dishes/add', query: {
        operate: "update",
        data: JSON.stringify(res.data)
      }
    })
  })
}
const handleDelete = (index: number, row: DishesListData) => {
  loading.value = true
  deleteDishes(row.id).then(res => {
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

const handleSelectionChange = (val: DishesListData[]) => {
  multipleSelection.value = val
}

</script>

<style scoped>
.search-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.label {
  margin-right: 10px;
  white-space: nowrap;
}

.search-btns {
  display: flex;
  justify-content: flex-end;
}
</style>