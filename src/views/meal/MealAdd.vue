<template>
  <div>
    <el-form ref="formRef" :model="form" label-width="auto" style="max-width: 500px">
      <el-form-item label="用餐日期" prop="mealDate">
        <el-date-picker
            v-model="form.mealDate"
            type="date"
            placeholder="请选择一个日期"
            clearable
            :disabled-date="disabledDate"
            style="width: 400px"
        />
      </el-form-item>
      <el-form-item label="用餐时间" prop="mealTime">
        <el-select v-model="form.mealTime" placeholder="请选择用餐时间" style="width: 400px">
          <el-option label="早餐" value="1"/>
          <el-option label="午餐" value="2"/>
          <el-option label="晚餐" value="3"/>
        </el-select>
      </el-form-item>
      <el-form-item label="用餐人数" prop="diners">
        <el-input-number v-model="form.diners" :min="0" :max="99" :precision="0"/>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input
            v-model="form.remark"
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
      <el-button type="primary" @click="handleDialogConfirm(formRef)">
        保存
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from "vue";
import type {FormInstance} from "element-plus";
import router from "@/router";

const form = ref({
  mealDate: new Date(),
  mealTime: '',
  diners: '',
  remark: ''
})
const formRef = ref<FormInstance>()

const disabledDate = (time: Date) => {
  const today = new Date().setHours(0, 0, 0, 0); // 获取当前日期的时间戳，忽略时分秒
  return time.getTime() < today; // 返回一个布尔值，指示是否禁用该日期
}

const handleDialogConfirm = (formEl: FormInstance | undefined) => {
  if (!formEl) return
  // TODO 保存点餐数据
  formEl.resetFields()
}
</script>

<style scoped>

</style>