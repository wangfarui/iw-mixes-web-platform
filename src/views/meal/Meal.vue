<template>
  <div>
    <el-button type="primary" @click="handleMealAdd">点餐</el-button>
  </div>
  <div>
    <el-table :data="list" style="width: 100%" @row-dblclick="handleClick">
      <el-table-column prop="mealDate" label="用餐日期" width="180" />
      <el-table-column prop="mealTimeStr" label="用餐时间" width="180" />
      <el-table-column prop="diners" label="用餐人数" width="180" />
      <el-table-column prop="remark" label="备注" />
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
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="sizes, prev, pager, next"
        :total="total"
        :background="true"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
    />
  </div>
</template>

<script setup lang="ts">
import {reactive, ref} from 'vue'
import type { FormInstance } from 'element-plus'
import router from '@/router'
import type {MealListData} from "@/api/types";

const list = reactive([
  {
    id: -1,
    mealDate: new Date().toLocaleDateString(),
    mealTimeStr: '',
    diners: 0,
    remark: ''
  }
] as Array<MealListData>)

function handleMealAdd() {
  router.push({path: '/meal/add'})
}

const handleClick = (row: MealListData) => {
  console.log("row")
  // 查询详情数据
  console.log(row)
}

const handleEdit = (index: number, row: MealListData) => {
  //
  console.log(index, row)
}
const handleDelete = (index: number, row: MealListData) => {
  console.log(index, row)
}

const total = ref(100);
const currentPage = ref(1);
const pageSize = ref(10);

const handleSizeChange = (val: number) => {
  pageSize.value = val;
  console.log(`${val} items per page`)
}
const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  console.log(`current page: ${val}`)
}

</script>

<style scoped>
</style>