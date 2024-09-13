<template>
  <div v-loading="loading">
    <div>
      <el-button type="primary" @click="handleDictAdd">新增</el-button>
      <el-button type="primary" @click="searchPage">刷新</el-button>
    </div>
    <div style="margin-bottom: 10px; margin-top: 10px">
      <el-row :gutter="20" class="search-row">
        <el-col :span="6">
          <div class="search-input">
            <span class="label">字典名称:</span>
            <el-input v-model="page.dto.dictName" @keyup.enter="searchPage" placeholder="请输入字典名称"/>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="search-input">
            <span class="label">字典类型:</span>
            <el-select v-model="page.dto.dictType" clearable placeholder="请选择字典类型">
              <el-option v-for="item in commonStore.getDictTypeArray()"
                         :key="item.code"
                         :label="item.name"
                         :value="item.code"
              />
            </el-select>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="search-input">
            <span class="label">状态:</span>
            <el-select v-model="page.dto.dictStatus" clearable placeholder="请选择字典状态">
              <el-option label="启用" :value="1"/>
              <el-option label="禁用" :value="0"/>
            </el-select>
          </div>
        </el-col>
        <el-col :span="6" class="search-btns">
          <el-button type="primary" @click="searchPage">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-col>
      </el-row>
    </div>

    <div>
      <el-table :data="page.list" style="width: 100%" @row-dblclick="handleClick">
        <el-table-column prop="dictType" label="字典类型" width="180">
          <template #default="{ row }">
            {{ commonStore.getDictTypeName(row.dictType) }}
          </template>
        </el-table-column>
        <el-table-column prop="dictCode" label="字典code" width="180">
          <template #default="{ row }">
            {{ row.dictCode != undefined && row.dictCode != 0 ? row.dictCode : '' }}
          </template>
        </el-table-column>
        <el-table-column prop="dictName" label="字典名称" width="180"/>
        <el-table-column prop="sort" label="排序值" width="180"/>
        <el-table-column prop="dictStatus" label="字典状态" width="180">
          <template #default="{ row }">
            {{ row.dictStatus == 1 ? '启用' : '禁用' }}
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
import type {DictListData, DictPageDto} from "@/types/dict"
import {queryDictPage, queryDictDetail, deleteDict} from "@/api/dict"
import {useCommonStore} from "@/stores";

const commonStore = useCommonStore();

const loading = ref(false)

const page = reactive({
  dto: {
    currentPage: 1,
    pageSize: 10
  } as DictPageDto,
  total: 0,
  list: [] as Array<DictListData>
})

onMounted(() => {
  searchPage()
})

function searchPage() {
  loading.value = true
  queryDictPage(page.dto).then(data => {
    page.total = data.data.total
    page.list = data.data.records
    loading.value = false
  }).finally(() => {
    loading.value = false
  })
}

function resetSearch() {
  page.dto.dictType = undefined
  page.dto.dictName = undefined
  page.dto.dictStatus = undefined
  searchPage()
}

function handleDictAdd() {
  router.push({path: '/dict/add'})
}

const handleClick = (row: DictListData) => {
  router.push({path: '/dict/detail'})
}

const handleEdit = (index: number, row: DictListData) => {
  const activeId = row.id
  router.push({path: `/dict/edit/${activeId}`})
}

const handleDelete = (index: number, row: DictListData) => {
  loading.value = true
  deleteDict(row.id).then(res => {
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