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
          <el-option label="任意时间" :value="0"/>
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

    <el-divider />

    <div style="margin-bottom:10px">所选菜品&nbsp;&nbsp;<el-button type="primary" @click="handleSelectDishes">选菜</el-button></div>
    <div class="flex gap-2">
      <div v-if="selectDishes.dishesList.length == 0">还未选菜哦～</div>
      <div v-else>
        <el-tag v-for="dishes in selectDishes.dishesList"
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
        v-model="selectDishes.show"
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
      <el-button type="primary" v-if="operate != 'show'" @click="handleDialogConfirm(formRef)">
        保存
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, watch, reactive, onMounted} from "vue"
import type {FormInstance} from "element-plus"
import router from "@/router"
import { useRoute } from 'vue-router'
import {addMeal, updateMeal} from "@/api/meal"
import type {MealMenuAddDto, MealUpdateDto} from "@/types/meal"
import DishesTable from "@/views/dishes/DishesTable.vue";

const selectDishes = reactive({
  show: false,
  dishesList: [

  ] as Array<MealMenuAddDto>
})

const formData = ref({
  id: 0,
  mealDate: new Date(),
  mealTime: 0,
  diners: 0,
  remark: '',
  mealMenuList: []
} as MealUpdateDto)

const childComponent = ref(null)

const formRef = ref<FormInstance>()
const operate = ref("add")

const route = useRoute()
// 解析查询参数并将数据设置给表单
const parseQueryData = () => {
  // @ts-ignore
  const data: string = route.query.data
  if (data) {
    const dataJson: MealUpdateDto = JSON.parse(data)
    formData.value = dataJson
    selectDishes.dishesList = dataJson.mealMenuList as Array<MealMenuAddDto>
  }
  if (route.query.operate) {
    operate.value = route.params.operate as string
  }
}

const queryParams = computed(() => route.query)
watch(queryParams, parseQueryData, { immediate: true })

const disabledDate = (time: Date) => {
  const today = new Date().setHours(0, 0, 0, 0) // 获取当前日期的时间戳，忽略时分秒
  return time.getTime() < today // 返回一个布尔值，指示是否禁用该日期
}

const handleDialogConfirm = (formEl: FormInstance | undefined) => {
  if (!formEl) return
  formData.value.mealMenuList = selectDishes.dishesList
  if (operate.value == "add") {
    // 保存点餐记录
    addMeal(formData.value).then(res => {
      router.push({path: '/meal'})
    })
  } else if (operate.value == "update") {
    // 修改点餐记录
    updateMeal(formData.value).then(res => {
      router.push({path: '/meal'})
    })
  } else {
    console.log("未知操作")
    console.log(operate.value)
  }

  formEl.resetFields()
}

function handleSelectDishes() {
  selectDishes.show = true
}

const closeTag = (dishesId: number) => {
  selectDishes.dishesList = selectDishes.dishesList.filter(item => item.dishesId !== dishesId);
}

function confirmSelectDishes() {
  // @ts-ignore
  const multipleSelection = childComponent.value.multipleSelection;
  if (multipleSelection.length != 0) {
    for (const item of multipleSelection) {
      if (selectDishes.dishesList.some(dishes => dishes.dishesId === item.id)) {
        continue
      }
      selectDishes.dishesList.push({
        dishesId: item.id,
        dishesName: item.dishesName
      })
    }
  }
  selectDishes.show = false
}

</script>

<style scoped>
.gap-2 .el-tag {
  margin: 5px 10px;
}
</style>