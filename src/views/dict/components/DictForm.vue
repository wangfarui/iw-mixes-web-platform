<template>
  <div>
    <el-form ref="formRef" :model="formData" label-width="auto" style="max-width: 500px">
      <el-form-item label="字典类型" prop="dictType">
        <el-select v-model="formData.dictType" placeholder="请选择字典类型" style="width: 400px">
          <el-option v-for="item in commonStore.getDictTypeArray()"
                     :key="item.code"
                     :label="item.name"
                     :value="item.code"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="字典code" prop="dictCode">
        <el-input-number v-model="formData.dictCode" :precision="0" :controls="false"/>
      </el-form-item>
      <el-form-item label="字典名称" prop="dictName">
        <el-input v-model="formData.dictName"/>
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="formData.sort" :precision="0" :controls="false"/>
      </el-form-item>
      <el-form-item label="字典状态" prop="dictStatus">
        <el-switch
            v-model="formData.dictStatus"
            size="small"
            active-text="启用"
            :active-value="1"
            inactive-text="禁用"
            :inactive-value="0"
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
import {ref, onMounted} from "vue"
import type {FormInstance} from "element-plus"
import router from "@/router"
import {useRoute} from 'vue-router';
import {addDict, updateDict, queryDictDetail} from "@/api/dict"
import type {DictUpdateDto} from "@/types/dict";
import {useCommonStore} from "@/stores";

const commonStore = useCommonStore();
const route = useRoute();

const formData = ref({
  parentId: 0,
  dictStatus: 1
} as DictUpdateDto)

const props = defineProps({
  operate: {
    require: true,
    type: String,
    default: 'ADD'
  }
});

const id = route.params.id as string;

const formRef = ref<FormInstance>()

onMounted(() => {
  if (props.operate == "UPDATE") {
    queryDictDetail(id).then(res => {
      formData.value = res.data
    })
  }
})

const handleDialogConfirm = (formEl: FormInstance | undefined) => {
  if (!formEl) return
  if (props.operate == "ADD") {
    // 新增字典
    addDict(formData.value).then(res => {
      router.push({path: '/dict'})
    })
  } else if (props.operate == "UPDATE") {
    // 修改字典
    updateDict(formData.value).then(res => {
      router.push({path: '/dict'})
    })
  }

  formEl.resetFields()
}

</script>

<style scoped>

</style>