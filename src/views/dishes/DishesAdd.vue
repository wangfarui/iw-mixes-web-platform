<template>
  <div>
    <el-form ref="formRef" :model="formData" label-width="auto" :rules="rules" style="max-width: 500px">
      <el-form-item label="菜品名称" prop="dishesName">
        <el-input v-model="formData.dishesName" style="width: 400px" placeholder="请输入菜品名称"/>
      </el-form-item>
      <el-form-item label="菜品分类" prop="dishesType">
        <el-select v-model="formData.dishesType" placeholder="请选择菜品分类" style="width: 400px">
          <el-option label="未知" :value="0"/>
          <el-option label="荤" :value="1"/>
          <el-option label="素" :value="2"/>
          <el-option label="荤素" :value="3"/>
        </el-select>
      </el-form-item>
      <el-form-item label="难度系数" prop="difficultyFactor">
        <el-input-number v-model="formData.difficultyFactor" :min="0" :max="99" :precision="0"/>
      </el-form-item>
      <el-form-item label="用时（分钟）" prop="useTime">
        <el-input-number v-model="formData.useTime" :min="0" :max="240" :precision="0"/>
      </el-form-item>
      <el-form-item label="价格（元）" prop="prices">
        <el-input-number v-model="formData.prices" :min="0" :max="10000" :precision="0"/>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="formData.status" placeholder="请选择菜品状态" style="width: 400px">
          <el-option label="启用" :value="1"/>
          <el-option label="禁用" :value="2"/>
          <el-option label="售空" :value="3"/>
        </el-select>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input
            v-model="formData.remark"
            maxlength="255"
            :rows="3"
            type="textarea"
            placeholder="请备注用餐事项"
            style="width: 400px"
        />
      </el-form-item>
    </el-form>
    <div class="dialog-footer">
      <el-button @click="router.back()">返回</el-button>
      <el-button type="primary" v-if="operate != 'show'" @click="handleDialogConfirm(formRef)">
        保存
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, watch, reactive} from "vue"
import type {FormInstance, FormRules} from "element-plus"
import router from "@/router"
import {useRoute} from 'vue-router'
import {addDishes, updateDishes} from "@/api/dishes"
import type {DishesUpdateDto} from "@/types/dishes"

const formData = ref({
  id: 0,
  dishesName: '',
  dishesType: 0,
  difficultyFactor: 0,
  useTime: 0,
  prices: 0,
  status: 1
} as DishesUpdateDto)

const formRef = ref<FormInstance>()
const ruleFormRef = ref<FormInstance>()
const operate = ref("add")

const rules = reactive<FormRules<DishesUpdateDto>>({
  dishesName: [
    { required: true, message: '菜品名称不能为空', trigger: 'change' },
    { min: 1, max: 32, message: '菜品名称不能超过32个字符', trigger: 'blur' },
  ]
})

const route = useRoute()
// 解析查询参数并将数据设置给表单
const parseQueryData = () => {
  // @ts-ignore
  const data: string = route.query.data
  if (data) {
    formData.value = JSON.parse(data)
  }
  if (route.query.operate) {
    operate.value = route.query.operate as string
  }
}

const queryParams = computed(() => route.query)
watch(queryParams, parseQueryData, {immediate: true})

const handleDialogConfirm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  await formEl.validate((valid, fields) => {
    if (valid) {
      if (operate.value === "add") {
        // 保存点餐记录
        addDishes(formData.value).then(res => {
          router.push({path: '/dishes'})
        })
            .catch(reason => {
              console.log(reason)
            })
      } else if (operate.value === "update") {
        // 修改点餐记录
        updateDishes(formData.value).then(res => {
          router.push({path: '/dishes'})
        })
      } else {
        console.log("未知操作")
        console.log(operate.value)
      }

      formEl.resetFields()
    }
  })
}
</script>

<style scoped>

</style>