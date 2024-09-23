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
              <el-option v-for="item in dictStore.getDictDataArray(dictStore.dictTypeEnum.EAT_DISHES_TYPE)"
                         :key="item.dictCode"
                         :label="item.dictName"
                         :value="item.dictCode"
              />
            </el-select>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="search-input">
            <span class="label">状态:</span>
            <el-select v-model="page.dto.status" clearable placeholder="请选择菜品状态">
              <el-option v-for="item in dictStore.getDictDataArray(dictStore.dictTypeEnum.EAT_DISHES_STATUS)"
                         :key="item.dictCode"
                         :label="item.dictName"
                         :value="item.dictCode"
              />
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
          {{ dictStore.getDictNameByCode(dictStore.dictTypeEnum.EAT_DISHES_TYPE, row.dishesType) }}
        </template>
      </el-table-column>
      <el-table-column prop="difficultyFactor" label="难度系数" width="100"/>
      <el-table-column prop="useTime" label="用时" width="100" :formatter="formatUseTime"/>
      <el-table-column prop="prices" label="价格" width="100" :formatter="formatPrices"/>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          {{ dictStore.getDictNameByCode(dictStore.dictTypeEnum.EAT_DISHES_STATUS, row.status) }}
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
              @click="handleDelete(scope.row)"
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

    <el-dialog v-model="confirmDelete" title="提示" width="200" center>
    <span>
      确定删除吗
    </span>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="confirmDelete = false;">取消</el-button>
          <el-button type="primary" @click="handleConfirmDelete">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, reactive} from 'vue'
import router from '@/router'
import type {DishesListData, DishesPageDto} from "@/types/dishes"
import {queryDishesPage, queryDishesDetail, deleteDishes} from "@/api/dishes"
import {useDictStore} from "@/stores/dict";
import {useDishesStore} from "@/stores/dishes";

const dictStore = useDictStore()
const dishesStore = useDishesStore()

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
const confirmDelete = ref(false)
const waitDeleteRow = ref<DishesListData>()

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

const handleClick = (row: DishesListData) => {
  // 非编辑状态 不可双击查询详情
  if (permission.value != 1) return;
  queryDishesDetail(row.id).then(res => {
    dishesStore.operate = 'show'
    dishesStore.formData = res.data
    router.push({path: '/dishes/detail'})
  })
}

const handleEdit = (index: number, row: DishesListData) => {
  queryDishesDetail(row.id).then(res => {
    dishesStore.operate = 'update'
    dishesStore.formData = res.data
    router.push({path: '/dishes/edit'})
  })
}

const handleDelete = (row: DishesListData) => {
  waitDeleteRow.value = row
  confirmDelete.value = true
}

const handleConfirmDelete = () => {
  if (!waitDeleteRow.value) {
    confirmDelete.value = false
    return
  }

  loading.value = true
  deleteDishes(waitDeleteRow.value.id).then(res => {
    searchPage()
  }).finally(() => {
    waitDeleteRow.value = undefined
    confirmDelete.value = false
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