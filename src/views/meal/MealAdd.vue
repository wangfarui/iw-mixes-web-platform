<template>
  <div>
    <el-form ref="formRef" :model="meal.formData" label-width="auto" style="max-width: 500px">
      <el-form-item label="用餐日期" prop="mealDate">
        <el-date-picker
            v-model="meal.formData.mealDate"
            type="date"
            placeholder="请选择一个日期"
            clearable
            :disabled-date="disabledDate"
            style="width: 400px"
        />
      </el-form-item>
      <el-form-item label="用餐时间" prop="mealTime">
        <el-select v-model="meal.formData.mealTime" placeholder="请选择用餐时间" style="width: 400px">
          <el-option label="任意时间" :value="0"/>
          <el-option label="早餐" :value="1"/>
          <el-option label="午餐" :value="2"/>
          <el-option label="晚餐" :value="3"/>
        </el-select>
      </el-form-item>
      <el-form-item label="用餐人数" prop="diners">
        <el-input-number v-model="meal.formData.diners" :min="0" :max="99" :precision="0"/>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input
            v-model="meal.formData.remark"
            maxlength="255"
            :rows="3"
            type="textarea"
            placeholder="请备注用餐事项"
            style="width: 400px"
        />
      </el-form-item>
    </el-form>

    <el-divider />

    <div style="margin-bottom:10px">所选菜品&nbsp;&nbsp;<el-button type="primary" @click="handleSelectDishes">选菜</el-button></div>
    <div class="flex gap-2">
      <div v-if="meal.selectDishes.dishesList.length == 0">还未选菜哦～</div>
      <div v-else>
        <el-tag v-for="dishes in meal.selectDishes.dishesList"
                type="primary"
                :key="dishes.dishesId"
                closable
                @close="closeTag(dishes.dishesId)"
        >
          {{dishes.dishesName}}
        </el-tag>
      </div>
    </div>

    <el-dialog
        v-model="meal.selectDishes.show"
        title="选择菜品"
        width="750"
        align-center
        :close-on-click-modal = "false"
    >
      <DishesTable permission="select" ref="childComponent"/>
      <el-button type="primary" @click="confirmSelectDishes">确定</el-button>
    </el-dialog>

    <el-divider />

    <div class="dialog-footer">
      <el-button @click="router.back()">返回</el-button>
      <el-button type="primary" v-if="meal.operate != 'show'" @click="handleDialogConfirm(formRef)">
        保存
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from "vue"
import type {FormInstance} from "element-plus"
import router from "@/router"
import {addMeal, updateMeal} from "@/api/meal"
import DishesTable from "@/views/dishes/DishesTable.vue";
import {useMealStore} from "@/stores/meal";

const meal = useMealStore();

const childComponent = ref(null)

const formRef = ref<FormInstance>()

const disabledDate = (time: Date) => {
  const today = new Date().setHours(0, 0, 0, 0) // 获取当前日期的时间戳，忽略时分秒
  return time.getTime() < today // 返回一个布尔值，指示是否禁用该日期
}

const handleDialogConfirm = (formEl: FormInstance | undefined) => {
  if (!formEl) return
  meal.formData.mealMenuList = meal.selectDishes.dishesList
  if (meal.operate == "add") {
    // 保存点餐记录
    addMeal(meal.formData).then(res => {
      router.push({path: '/meal'})
    })
  } else if (meal.operate == "update") {
    // 修改点餐记录
    updateMeal(meal.formData).then(res => {
      router.push({path: '/meal'})
    })
  } else {
    console.log("未知操作")
    console.log(meal.operate)
  }

  formEl.resetFields()
}

function handleSelectDishes() {
  meal.selectDishes.show = true
}

const closeTag = (dishesId: number) => {
  meal.selectDishes.dishesList = meal.selectDishes.dishesList.filter(item => item.dishesId !== dishesId);
}

function confirmSelectDishes() {
  // @ts-ignore
  const multipleSelection = childComponent.value.multipleSelection;
  if (multipleSelection.length != 0) {
    for (const item of multipleSelection) {
      if (meal.selectDishes.dishesList.some(dishes => dishes.dishesId === item.id)) {
        continue
      }
      meal.selectDishes.dishesList.push({
        dishesId: item.id,
        dishesName: item.dishesName
      })
    }
  }
  meal.selectDishes.show = false
}

</script>

<style scoped>
.gap-2 .el-tag {
  margin: 5px 10px;
}
</style>