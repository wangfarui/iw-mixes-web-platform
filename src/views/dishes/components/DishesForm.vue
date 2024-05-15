<template>
  <div>
    <el-form ref="formRef" :model="dishesStore.formData" label-width="auto" :rules="rules">
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
            :on-error="onUploadError"
            :before-upload="beforeAvatarUpload"
        >
          <el-image v-if="dishesStore.formData.dishesImage"
                    style="width: 100px; height: 100px" :src="dishesStore.formData.dishesImage" fit="fill" />
          <el-icon v-else class="avatar-uploader-icon">
            <Plus/>
          </el-icon>
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
            :autosize="{ minRows: 3, maxRows: 10 }"
            type="textarea"
            placeholder="请备注用餐事项"
            style="width: 400px"
        />
      </el-form-item>

      <div>
        所需食材：
        <div v-for="(item, index) in dishesStore.formData.dishesMaterialList" :key="index" class="dishes-item">
          <el-row :gutter="20" align="middle">
            <el-col :span="6">
              <el-form-item label="食材名称">
                <el-input v-model="item.materialName" maxlength="16" placeholder="输入食材名称"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="食材用量">
                <el-input v-model="item.materialDosage" maxlength="16" placeholder="输入食材用量"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="3">
              <el-form-item label="是否需要购买">
                <el-switch v-model="item.isPurchase"></el-switch>
              </el-form-item>
            </el-col>
            <el-col :span="2">
              <el-form-item>
                <div v-if="index !== 0">
                  <el-button @click="removeItem(dishesStore.formData.dishesMaterialList, index)" type="danger"
                             icon="el-icon-delete">移除
                  </el-button>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="2">
              <div style="display: flex;justify-content: space-between;">
                <el-button v-if="index !== 0" @click="moveItemUp(dishesStore.formData.dishesMaterialList, index)"
                           type="primary" icon="el-icon-arrow-up">上移
                </el-button>
                <el-button v-if="index !== dishesStore.formData.dishesMaterialList.length - 1"
                           @click="moveItemDown(dishesStore.formData.dishesMaterialList, index)" type="primary"
                           icon="el-icon-arrow-down">下移
                </el-button>
              </div>
            </el-col>
          </el-row>
        </div>
        <div style="margin-bottom: 10px;">
          <el-button type="primary" @click="addItem(dishesStore.formData.dishesMaterialList)">添加食材</el-button>
        </div>
      </div>

      <div style="margin-top: 20px">
        制作方法：
        <div v-for="(item, index) in dishesStore.formData.dishesCreationMethodList" :key="index" class="dishes-item">
          <el-row>
            <el-col :span="4">
              步骤{{ (index+1).toString() }}
            </el-col>
            <el-col :span="20">
              <el-button v-if="index !== 0" @click="moveItemUp(dishesStore.formData.dishesCreationMethodList, index)"
                         type="primary" icon="el-icon-arrow-up">
                上移
              </el-button>
              <el-button v-if="index !== dishesStore.formData.dishesCreationMethodList.length - 1"
                         @click="moveItemDown(dishesStore.formData.dishesCreationMethodList, index)" type="primary"
                         icon="el-icon-arrow-down">
                下移
              </el-button>
                <el-button v-if="index !== 0" style="text-align: end"
                           @click="removeItem(dishesStore.formData.dishesCreationMethodList, index)" type="danger"
                           icon="el-icon-delete" >
                  移除
                </el-button>
            </el-col>
          </el-row>
          <div>
            +步骤图<el-text type="info">（清晰的步骤会让制作过程更轻松）</el-text>
            <el-upload
                v-loading.fullscreen.lock="fullscreenLoading"
                class="avatar-uploader"
                :action="uploadAction"
                name="file"
                method="post"
                :headers="iwHeaders"
                :show-file-list="false"
                :on-success="handleDishesStepSuccess(item)"
                :on-error="onUploadError"
                :before-upload="beforeAvatarUpload"
            >
              <el-image v-if="item.stepImage"
                        style="width: 100px; height: 100px" :src="item.stepImage" fit="fill" />
              <el-icon v-else class="avatar-uploader-icon">
                <Plus/>
              </el-icon>
            </el-upload>
          </div>
          <div>
            <el-input
                v-model="item.stepContent"
                :rows="2"
                autosize
                type="textarea"
                placeholder="添加步骤内容"
            />
          </div>
        </div>
        <div style="margin-bottom: 10px;">
          <el-button type="primary" @click="addItem(dishesStore.formData.dishesCreationMethodList)">添加步骤</el-button>
        </div>
      </div>
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
import {Plus} from '@element-plus/icons-vue'
import router from "@/router"
import {addDishes, updateDishes} from "@/api/dishes"
import type {DishesCreationMethodAddDto, DishesUpdateDto} from "@/types/dishes"
import {useDishesStore} from "@/stores/dishes";

import type {UploadProps} from 'element-plus'

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
    {required: true, message: '菜品名称不能为空', trigger: 'change'},
    {min: 1, max: 32, message: '菜品名称不能超过32个字符', trigger: 'blur'},
  ]
})

const handleAvatarSuccess: UploadProps['onSuccess'] = (
    response
) => {
  dishesStore.formData.dishesImage = response.data.fileUrl
  fullscreenLoading.value = false
}

const handleDishesStepSuccess = (myParam: DishesCreationMethodAddDto) => {
  return (response: any) => {
    myParam.stepImage = response.data.fileUrl
    fullscreenLoading.value = false
  }
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

const onUploadError = () => {
  fullscreenLoading.value = true
}

const addItem = (list: Array<any>) => {
  list.push({})
};

const removeItem = (list: Array<any>, index: number) => {
  list.splice(index, 1)
};

const moveItemUp = (list: Array<any>, index: number) => {
  if (index > 0) {
    const item = list.splice(index, 1)[0];
    list.splice(index - 1, 0, item);
  }
};

const moveItemDown = (list: Array<any>, index: number) => {
  if (index < list.length - 1) {
    const item = list.splice(index, 1)[0];
    list.splice(index + 1, 0, item);
  }
};

const handleDialogConfirm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return

  const formData: DishesUpdateDto = JSON.parse(JSON.stringify(dishesStore.formData));

  // 过滤 食材集合 和 步骤集合 的脏数据
  formData.dishesMaterialList = formData.dishesMaterialList
      .filter(t => t.materialName != undefined && t.materialName !== '')
  formData.dishesCreationMethodList = formData.dishesCreationMethodList
      .filter(t => t.stepContent != undefined && t.stepContent !== '')

  // 表单校验
  await formEl.validate((valid) => {
    if (valid) {
      if (dishesStore.operate === "add") {
        // 保存点餐记录
        addDishes(formData).then(() => {
          router.push({path: '/dishes'})
          formEl.resetFields()
        })
      } else if (dishesStore.operate === "update") {
        // 修改点餐记录
        updateDishes(formData).then(() => {
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
.el-icon.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  text-align: center;
  background-color: #fafafa;
}
.dishes-item {
  margin: 10px 0;
  padding: 10px;
  border: 2px solid var(--el-border-color);
}
</style>