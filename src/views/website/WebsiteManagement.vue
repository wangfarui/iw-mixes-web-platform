<template>
  <div v-loading="loading">
    <div>
      <el-button type="primary" @click="handleAdd">新增</el-button>
      <el-button type="primary" @click="searchPage">刷新</el-button>
    </div>
    <div style="margin-bottom: 10px; margin-top: 10px">
      <el-row :gutter="20" class="search-row">
        <el-col :span="6">
          <div class="search-input">
            <span class="label">网站名称:</span>
            <el-input v-model="page.dto.name" @keyup.enter="searchPage" placeholder="请输入网站名称"/>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="search-input">
            <span class="label">网站分类:</span>
            <el-input v-model="page.dto.category" @keyup.enter="searchPage" placeholder="请输入网站分类"/>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="search-input">
            <span class="label">标签关键字:</span>
            <el-input v-model="page.dto.tag" @keyup.enter="searchPage" placeholder="请输入标签关键字"/>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="search-input">
            <span class="label">网站状态:</span>
            <el-select v-model="page.dto.status" clearable placeholder="请选择网站状态">
              <el-option label="在线" :value="1"/>
              <el-option label="离线" :value="2"/>
            </el-select>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="search-input">
            <span class="label">共享状态:</span>
            <el-select v-model="page.dto.shared" clearable placeholder="请选择共享状态">
              <el-option label="不共享" :value="0"/>
              <el-option label="共享" :value="1"/>
            </el-select>
          </div>
        </el-col>
        <el-col :span="6" class="search-btns">
          <el-button type="primary" @click="searchPage">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-col>
      </el-row>
    </div>

    <div>
      <el-table :data="page.list" style="width: 100%">
        <el-table-column prop="name" label="网站名称" width="160"/>
        <el-table-column prop="url" label="网站链接" width="260">
          <template #default="{ row }">
            <el-link :href="formatUrl(row.url)" target="_blank" type="primary">{{ row.url }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="网站分类" width="140"/>
        <el-table-column prop="tags" label="标签" width="200">
          <template #default="{ row }">
            {{ formatTags(row.tags) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="网站状态" width="100">
          <template #default="{ row }">
            {{ row.status === 2 ? '离线' : '在线' }}
          </template>
        </el-table-column>
        <el-table-column prop="shared" label="共享" width="100">
          <template #default="{ row }">
            {{ row.shared === 1 ? '共享' : '不共享' }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="网站描述" min-width="220"/>
        <el-table-column prop="updateTime" label="更新时间" width="180"/>
        <el-table-column label="操作" width="220">
          <template #default="scope">
            <el-button size="small" @click="openWebsite(scope.row.url)">
              打开
            </el-button>
            <el-button size="small" type="primary" @click="handleEdit(scope.$index, scope.row)">
              编辑
            </el-button>
            <el-button
                size="small"
                type="danger"
                @click="handleDelete(scope.$index, scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
          :current-page="page.dto.currentPage"
          :page-size="page.dto.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="sizes, prev, pager, next"
          :total="page.total"
          :background="true"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
      />
    </div>

    <el-dialog
        v-model="dialogData.visible"
        :title="dialogData.title"
        width="560"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        align-center
        @close="cancelDialog()"
    >
      <div>
        <el-form ref="formRef" :model="formData" :rules="formRules" label-width="auto" style="max-width: 520px">
          <el-form-item label="网站名称" prop="name">
            <el-input v-model="formData.name" maxlength="64" show-word-limit/>
          </el-form-item>
          <el-form-item label="网站链接" prop="url">
            <el-input v-model="formData.url" maxlength="255" show-word-limit/>
          </el-form-item>
          <el-form-item label="网站分类" prop="category">
            <el-input v-model="formData.category" maxlength="32" show-word-limit/>
          </el-form-item>
          <el-form-item label="网站图标URL" prop="icon">
            <el-input v-model="formData.icon" maxlength="255" show-word-limit/>
          </el-form-item>
          <el-form-item label="标签" prop="tags">
            <el-select
                v-model="formData.tags"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="请输入并回车创建标签"
                style="width: 100%"
            >
              <el-option
                  v-for="item in tagOptions"
                  :key="item"
                  :label="item"
                  :value="item"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="网站状态" prop="status">
            <el-radio-group v-model="formData.status">
              <el-radio :label="1">在线</el-radio>
              <el-radio :label="2">离线</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="共享" prop="shared">
            <el-switch
                v-model="formData.shared"
                active-text="共享"
                :active-value="1"
                inactive-text="不共享"
                :inactive-value="0"
            />
          </el-form-item>
          <el-form-item label="网站描述" prop="description">
            <el-input v-model="formData.description" type="textarea" maxlength="255" show-word-limit/>
          </el-form-item>
        </el-form>

        <div class="dialog-footer">
          <el-button @click="cancelDialog()">取消</el-button>
          <el-button type="primary" @click="handleDialogConfirm(formRef)">
            保存
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, reactive, ref} from 'vue'
import {
  addWebsiteNavigation,
  deleteWebsiteNavigation,
  queryWebsiteNavigationDetail,
  queryWebsiteNavigationPage,
  updateWebsiteNavigation
} from "@/api/websiteNavigation"
import type {
  WebsiteNavigationAddDto,
  WebsiteNavigationListData,
  WebsiteNavigationPageDto,
  WebsiteNavigationUpdateDto
} from "@/types/websiteNavigation";
import {ElMessage} from "element-plus";
import type {FormInstance, FormRules} from "element-plus";

const loading = ref(false)
const formRef = ref<FormInstance>()

const page = reactive({
  dto: {
    currentPage: 1,
    pageSize: 10
  } as WebsiteNavigationPageDto,
  total: 0,
  list: [] as Array<WebsiteNavigationListData>
})

const formData = ref({
  id: undefined,
  name: '',
  url: '',
  description: '',
  icon: '',
  category: '',
  tags: [] as Array<string>,
  status: 1,
  shared: 0
} as WebsiteNavigationUpdateDto)

const dialogData = reactive({
  visible: false,
  operate: 'ADD',
  title: '新增网站'
})

const formRules = reactive<FormRules<WebsiteNavigationUpdateDto>>({
  name: [{required: true, message: '请输入网站名称', trigger: 'blur'}],
  url: [{required: true, message: '请输入网站链接', trigger: 'blur'}],
  status: [{required: true, message: '请选择网站状态', trigger: 'change'}]
})

const tagOptions = computed(() => {
  const allTags = page.list.flatMap(item => item.tags ?? [])
  return Array.from(new Set(allTags))
})

onMounted(() => {
  searchPage()
})

function searchPage() {
  loading.value = true
  queryWebsiteNavigationPage(page.dto).then(data => {
    page.total = data.data.total
    page.list = data.data.records
  }).finally(() => {
    loading.value = false
  })
}

function resetSearch() {
  page.dto.currentPage = 1
  page.dto.name = undefined
  page.dto.category = undefined
  page.dto.tag = undefined
  page.dto.status = undefined
  page.dto.shared = undefined
  searchPage()
}

function handleAdd() {
  initFormData()
  dialogData.operate = 'ADD'
  dialogData.title = '新增网站'
  dialogData.visible = true
}

function handleEdit(index: number, row: WebsiteNavigationListData) {
  loading.value = true
  queryWebsiteNavigationDetail(row.id).then(res => {
    formData.value = {
      ...res.data,
      tags: res.data.tags ?? [],
      status: res.data.status ?? 1,
      shared: res.data.shared ?? 0
    }
    dialogData.operate = 'UPDATE'
    dialogData.title = '编辑网站'
    dialogData.visible = true
  }).finally(() => {
    loading.value = false
  })
}

function handleDelete(index: number, row: WebsiteNavigationListData) {
  loading.value = true
  deleteWebsiteNavigation(row.id).then(() => {
    ElMessage.success('删除成功')
    searchPage()
  }).finally(() => {
    loading.value = false
  })
}

function cancelDialog() {
  dialogData.visible = false
  initFormData()
}

function handleDialogConfirm(formEl: FormInstance | undefined) {
  if (!formEl) {
    return
  }
  formEl.validate((valid) => {
    if (!valid) {
      return
    }
    if (dialogData.operate === 'ADD') {
      const {id, ...addData} = formData.value
      addWebsiteNavigation(addData).then(() => {
        ElMessage.success('新增成功')
        searchPage()
        dialogData.visible = false
      })
      return
    }
    updateWebsiteNavigation(formData.value).then(() => {
      ElMessage.success('保存成功')
      searchPage()
      dialogData.visible = false
    })
  })
}

function initFormData() {
  formData.value = {
    id: undefined,
    name: '',
    url: '',
    description: '',
    icon: '',
    category: '',
    tags: [],
    status: 1,
    shared: 0
  }
}

function handleSizeChange(val: number) {
  page.dto.currentPage = 1
  page.dto.pageSize = val
  searchPage()
}

function handleCurrentChange(val: number) {
  page.dto.currentPage = val
  searchPage()
}

function formatTags(tags?: Array<string>) {
  if (!tags || tags.length === 0) {
    return ''
  }
  return tags.join(', ')
}

function formatUrl(url?: string) {
  if (!url) {
    return ''
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `https://${url}`
}

function openWebsite(url?: string) {
  if (!url) {
    ElMessage.warning('网站链接为空')
    return
  }
  window.open(formatUrl(url), '_blank')
}
</script>

<style scoped>
.search-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.label {
  margin-right: 10px;
  white-space: nowrap;
}

.search-btns {
  display: flex;
  justify-content: flex-end;
}
</style>
