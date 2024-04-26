<template>
  <div>
    <el-form ref="formRef" :model="formData" label-width="auto" style="max-width: 500px">
      <el-form-item label="用餐日期" prop="mealDate">
        <el-date-picker
            v-model="formData.mealDate"
            type="date"
            placeholder="请选择一个日期"
            clearable
            :disabled-date="disabledDate"
            style="width: 400px"
        />
      </el-form-item>
      <el-form-item label="用餐时间" prop="mealTime">
        <el-select v-model="formData.mealTime" placeholder="请选择用餐时间" style="width: 400px">
          <el-option label="早餐" :value="1"/>
          <el-option label="午餐" :value="2"/>
          <el-option label="晚餐" :value="3"/>
        </el-select>
      </el-form-item>
      <el-form-item label="用餐人数" prop="diners">
        <el-input-number v-model="formData.diners" :min="0" :max="99" :precision="0"/>
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
import {ref, computed, watch} from "vue";
import type {FormInstance} from "element-plus";
import router from "@/router";
import { useRoute } from 'vue-router';
import {addMeal, updateMeal} from "@/api/meal";
import type {MealUpdateDto} from "@/api/types";

const formData = ref({
  id: 0,
  mealDate: new Date(),
  mealTime: 0,
  diners: 0,
  remark: ''
} as MealUpdateDto)

const formRef = ref<FormInstance>()

const operate = ref("add")

const route = useRoute();
// 解析查询参数并将数据设置给表单
const parseQueryData = () => {
  // @ts-ignore
  const data: string = route.query.data;
  if (data) {
    formData.value = JSON.parse(data);
  }
  if (route.query.operate) {
    operate.value = route.query.operate as string;
  }
  console.log(route.query)
};

const queryParams = computed(() => route.query);
watch(queryParams, parseQueryData, { immediate: true });

const disabledDate = (time: Date) => {
  const today = new Date().setHours(0, 0, 0, 0); // 获取当前日期的时间戳，忽略时分秒
  return time.getTime() < today; // 返回一个布尔值，指示是否禁用该日期
}

const handleDialogConfirm = (formEl: FormInstance | undefined) => {
  if (!formEl) return
  if (operate.value === "add") {
    // 保存点餐记录
    addMeal(formData.value).then(res => {
      console.log(res)
      router.push({path: '/meal'})
    })
  } else if (operate.value === "update") {
    // 修改点餐记录
    updateMeal(formData.value).then(res => {
      console.log(res)
      router.push({path: '/meal'})
    })
  } else {
    console.log("未知操作")
    console.log(operate.value)
  }

  formEl.resetFields()
}
</script>

<style scoped>

</style>