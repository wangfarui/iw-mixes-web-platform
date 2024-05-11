<template>
  <div>
    <el-form ref="formRef" :model="dishesStore.formData" label-width="auto" :rules="rules" style="max-width: 500px">
      <el-form-item label="菜品名称" prop="dishesName">
        <el-input v-model="dishesStore.formData.dishesName" style="width: 400px" placeholder="请输入菜品名称"/>
      </el-form-item>
      <el-form-item label="菜品封面图" prop="dishesImage">
        <el-upload
            v-loading.fullscreen.lock="fullscreenLoading"
            class="avatar-uploader"
            :action="uploadAction"
            name="file"
            method="post"
            :headers="iwHeaders"
            :show-file-list="false"
            :on-success="handleAvatarSuccess"
            :before-upload="beforeAvatarUpload"
        >
          <img v-if="dishesStore.formData.dishesImage" :src="dishesStore.formData.dishesImage" class="avatar" style="height: 100px; width: 100px"/>
          <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
        </el-upload>
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
      <el-button type="primary" v-if="dishesStore.operate != 'show'" @click="handleDialogConfirm(formRef)">
        保存
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, reactive} from "vue"
import type {FormInstance, FormRules} from "element-plus"
import {ElMessage} from "element-plus"
import { Plus } from '@element-plus/icons-vue'
import router from "@/router"
import {addDishes, updateDishes} from "@/api/dishes"
import type {DishesUpdateDto} from "@/types/dishes"
import {useDishesStore} from "@/stores/dishes";

import type { UploadProps } from 'element-plus'

const dishesStore = useDishesStore()

const fullscreenLoading = ref(false)
const formRef = ref<FormInstance>()
const uploadAction = ref('')
const iwHeaders = {"iwtoken": window.sessionStorage.getItem("iwtoken")}

if (import.meta.env.VITE_BUILD_ENV === 'dev') {
  uploadAction.value = 'http://localhost:18003/iw-eat/file/upload'
  // 在开发环境下执行的逻辑
} else if (import.meta.env.VITE_BUILD_ENV === 'prod') {
  uploadAction.value = 'https://api.itwray.com/iw-eat/file/upload'
} else {
  console.log("无法识别环境" + import.meta.env.VITE_BUILD_ENV)
}

const rules = reactive<FormRules<DishesUpdateDto>>({
  dishesName: [
    { required: true, message: '菜品名称不能为空', trigger: 'change' },
    { min: 1, max: 32, message: '菜品名称不能超过32个字符', trigger: 'blur' },
  ]
})

const handleAvatarSuccess: UploadProps['onSuccess'] = (
    response,
    uploadFile
) => {
  dishesStore.formData.dishesImage = response.data.fileUrl
  fullscreenLoading.value = false
}

const beforeAvatarUpload: UploadProps['beforeUpload'] = (rawFile) => {
  if (rawFile.type !== 'image/jpeg') {
    ElMessage.error('只支持 jpg 图片类型!')
    return false
  } else if (rawFile.size / 1024 / 1024 > 10) {
    ElMessage.error('图片大小不能超过10MB!')
    return false
  }
  fullscreenLoading.value = true
  return true
}

const handleDialogConfirm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  await formEl.validate((valid, fields) => {
    if (valid) {
      if (dishesStore.operate === "add") {
        // 保存点餐记录
        addDishes(dishesStore.formData).then(res => {
          router.push({path: '/dishes'})
          formEl.resetFields()
        })
      } else if (dishesStore.operate === "update") {
        // 修改点餐记录
        updateDishes(dishesStore.formData).then(res => {
          router.push({path: '/dishes'})
          formEl.resetFields()
        })
      } else {
        console.log("未知操作")
        console.log(dishesStore.operate)
      }
    }
  })
}
</script>

<style scoped>

</style>