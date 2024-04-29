<template>
  <div>
    <el-form ref="formRef" :model="dishesStore.formData" label-width="auto" :rules="rules" style="max-width: 500px">
      <el-form-item label="菜品名称" prop="dishesName">
        <el-input v-model="dishesStore.formData.dishesName" style="width: 400px" placeholder="请输入菜品名称"/>
      </el-form-item>
      <el-form-item label="菜品分类" prop="dishesType">
        <el-select v-model="dishesStore.formData.dishesType" placeholder="请选择菜品分类" style="width: 400px">
          <el-option label="未知" :value="0"/>
          <el-option label="荤" :value="1"/>
          <el-option label="素" :value="2"/>
          <el-option label="荤素" :value="3"/>
        </el-select>
      </el-form-item>
      <el-form-item label="难度系数" prop="difficultyFactor">
        <el-input-number v-model="dishesStore.formData.difficultyFactor" :min="0" :max="99" :precision="0"/>
      </el-form-item>
      <el-form-item label="用时（分钟）" prop="useTime">
        <el-input-number v-model="dishesStore.formData.useTime" :min="0" :max="240" :precision="0"/>
      </el-form-item>
      <el-form-item label="价格（元）" prop="prices">
        <el-input-number v-model="dishesStore.formData.prices" :min="0" :max="10000" :precision="0"/>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="dishesStore.formData.status" placeholder="请选择菜品状态" style="width: 400px">
          <el-option label="启用" :value="1"/>
          <el-option label="禁用" :value="2"/>
          <el-option label="售空" :value="3"/>
        </el-select>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input
            v-model="dishesStore.formData.remark"
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
import {ref, reactive} from "vue"
import type {FormInstance, FormRules} from "element-plus"
import router from "@/router"
import {addDishes, updateDishes} from "@/api/dishes"
import type {DishesUpdateDto} from "@/types/dishes"
import {useDishesStore} from "@/stores/dishes";

const dishesStore = useDishesStore()

const formRef = ref<FormInstance>()

const rules = reactive<FormRules<DishesUpdateDto>>({
  dishesName: [
    { required: true, message: '菜品名称不能为空', trigger: 'change' },
    { min: 1, max: 32, message: '菜品名称不能超过32个字符', trigger: 'blur' },
  ]
})

const handleDialogConfirm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  await formEl.validate((valid, fields) => {
    if (valid) {
      if (dishesStore.operate === "add") {
        // 保存点餐记录
        addDishes(dishesStore.formData).then(res => {
          router.push({path: '/dishes'})
        })
      } else if (dishesStore.operate === "update") {
        // 修改点餐记录
        updateDishes(dishesStore.formData).then(res => {
          router.push({path: '/dishes'})
        })
      } else {
        console.log("未知操作")
        console.log(dishesStore.operate)
      }

      formEl.resetFields()
    }
  })
}
</script>

<style scoped>

</style>