<template>
  <div>
    <el-alert v-if="blocked" title="记账分类、标签与会员类型请在小程序的记账设置中维护" type="info" :closable="false" />
    <el-form v-if="!blocked" ref="formRef" :model="formData" label-width="auto" style="max-width: 500px">
      <el-form-item label="字典类型" prop="dictType">
        <el-select v-model="formData.dictType" placeholder="请选择字典类型" style="width: 400px">
          <el-option v-for="item in dictStore.getDictTypeArray().filter(item => ![4001, 4002, 4004, 4011].includes(Number(item.code)))"
                     :key="item.code"
                     :label="item.name"
                     :value="item.code"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="isWardrobeItemSubcategory" label="所属品类" prop="parentId">
        <el-select v-model="formData.parentId" placeholder="请选择所属品类" style="width: 400px">
          <el-option v-for="item in parentCategoryOptions"
                     :key="item.id"
                     :label="item.dictName"
                     :value="item.id"
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
      <el-button v-if="!blocked" type="primary" @click="handleDialogConfirm(formRef)">
        保存
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, ref, onMounted, watch} from "vue"
import type {FormInstance} from "element-plus"
import {ElMessage} from "element-plus"
import router from "@/router"
import {useRoute} from 'vue-router';
import {addDict, updateDict, queryDictDetail} from "@/api/dict"
import type {DictUpdateDto} from "@/types/dict";
import {useDictStore} from "@/stores/dict";

const dictStore = useDictStore();
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

const blocked = ref(false)
const id = route.params.id as string;

const formRef = ref<FormInstance>()

const isWardrobeItemSubcategory = computed(() => {
  return Number(formData.value.dictType) === Number(dictStore.dictTypeEnum.WARDROBE_ITEM_SUBCATEGORY)
})

const parentCategoryOptions = computed(() => {
  return dictStore.getDictDataArray(dictStore.dictTypeEnum.WARDROBE_ITEM_CATEGORY) || []
})

watch(() => formData.value.dictType, () => {
  if (!isWardrobeItemSubcategory.value) {
    formData.value.parentId = 0
  }
})

onMounted(() => {
  if (props.operate == "UPDATE") {
    queryDictDetail(id).then(res => {
      if ([4001, 4002, 4004, 4011].includes(Number(res.data.dictType))) { blocked.value = true; return }
      formData.value = res.data
    }).catch(() => { blocked.value = true })
  }
})

const handleDialogConfirm = (formEl: FormInstance | undefined) => {
  if (!formEl || blocked.value || [4001, 4002, 4004, 4011].includes(Number(formData.value.dictType))) return
  if (isWardrobeItemSubcategory.value && !formData.value.parentId) {
    ElMessage.warning('请选择所属品类')
    return
  }
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
