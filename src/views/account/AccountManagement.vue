<template>
  <div v-loading="loading">
    <el-alert title="应用分类请在小程序“账号管理 → 管理分类”维护" type="info" :closable="false" style="margin-bottom: 12px" />
    <div>
      <el-button type="primary" @click="handleAdd">新增</el-button>
      <el-button type="primary" @click="searchPage">刷新</el-button>
    </div>
    <div style="margin-bottom: 10px; margin-top: 10px">
      <el-row :gutter="20" class="search-row">
        <el-col :span="6">
          <div class="search-input">
            <span class="label">应用名称:</span>
            <el-input v-model="page.dto.name" @keyup.enter="searchPage" placeholder="请输入应用名称"/>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="search-input">
            <span class="label">应用地址:</span>
            <el-input v-model="page.dto.address" @keyup.enter="searchPage" placeholder="请输入应用地址"/>
          </div>
        </el-col>
        <el-col :span="6" class="search-btns">
          <el-button type="primary" @click="searchPage">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-col>
      </el-row>
    </div>

    <div>
      <div>
        <el-tabs
          v-model="activeName"
          type="card"
          @tab-click="handleClick"
        >
          <el-tab-pane :key="-1" label="所有" :name="-1" />
          <el-tab-pane v-for="item in categories.filter(item => item.enabled || item.accountCount > 0)"
                      :key="item.code"
                      :label="item.name + (item.enabled ? '' : ' · 已停用')"
                      :name="item.code">
          </el-tab-pane>
      </el-tabs>
    </div>
      <el-table :data="page.list" style="width: 100%">
        <el-table-column prop="name" label="应用名称" width="180"/>
        <el-table-column prop="address" label="应用地址" width="180"/>
        <el-table-column prop="account" label="账号" width="180"/>
        <el-table-column prop="type" label="应用分类" width="100">
          <template #default="{ row }">
            {{ row.typeName || '未分类' }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" width="180"/>
        <el-table-column prop="updateTime" label="更新时间" width="180"/>
        <el-table-column label="操作">
          <template #default="scope">
            <el-button size="small" @click="handleViewPassword(scope.$index, scope.row)">
              查看密码
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
        width="500"
        :show-close="!saving"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        align-center
        @close="cancelDialog()"
    >
      <div>
        <el-form ref="formRef" :model="formData" label-width="auto" style="max-width: 500px">
          <el-form-item label="应用分类" prop="type">
            <el-select v-model="formData.type" placeholder="未分类" clearable style="width: 400px">
              <el-option v-for="item in categories.filter(item => item.enabled || item.code === formData.type)"
                        :key="item.code"
                        :label="item.name + (item.enabled ? '' : ' · 已停用')"
                        :value="item.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="应用名称" prop="name">
            <el-input v-model="formData.name"/>
          </el-form-item>
          <el-form-item label="应用地址" prop="address">
            <el-input v-model="formData.address" type="textarea" autosize/>
          </el-form-item>
          <el-form-item label="账号" prop="account">
            <el-input v-model="formData.account"/>
          </el-form-item>
          <el-form-item label="修改密码" prop="updatePassword" v-if="dialogData.operate === 'UPDATE'">
            <el-switch v-model="formData.updatePassword"/>
          </el-form-item>
          <el-form-item label="密码" prop="password" v-if="dialogData.operate === 'ADD' || formData.updatePassword">
            <el-input v-model="formData.password" type="password" show-password/>
          </el-form-item>
          <el-form-item label="备注" prop="remark">
            <el-input v-model="formData.remark" type="textarea" autosize/>
          </el-form-item>
        </el-form>

        <div class="dialog-footer">
          <el-button :disabled="saving" @click="cancelDialog()">取消</el-button>
          <el-button type="primary" :loading="saving" :disabled="saving" @click="handleDialogConfirm(formRef)">
            保存
          </el-button>
        </div>
      </div>
    </el-dialog>
    <el-dialog
        v-model="viewPasswordDialog.visible"
        @close="clearPassword"
        title="查看密码"
        width="500"
        align-center
    >
      <div v-loading="viewPasswordDialog.loading">
        <span>{{ viewPasswordDialog.pd }}</span>
        <el-button type="primary" @click="copyText" style="margin-left: 10px;">
          <SvgIcon name="copy-text-white" />
          <span>复制</span>
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {onMounted, onBeforeUnmount, reactive, ref} from 'vue'
import type {AccountCategory, AccountListData, AccountPageDto, AccountUpdateDto} from "@/types/applicationAccount"
import {
  addApplicationAccount,
  deleteApplicationAccount,
  queryApplicationAccountDetail,
  queryApplicationAccountPage,
  updateApplicationAccount,
  viewPasswordById,
  queryAccountCategories
} from "@/api/applicationAccount"
import SvgIcon from "@/components/SvgIcon.vue";
import {ElMessage, ElMessageBox} from "element-plus";
import type { FormInstance, TabsPaneContext } from 'element-plus'

const categories = ref<AccountCategory[]>([])

const loading = ref(false)
const saving = ref(false)
let passwordRequest = 0
onBeforeUnmount(() => { passwordRequest++; viewPasswordDialog.pd = '' })
const formRef = ref<FormInstance>()
// Tab选中的名称
const activeName = ref<string | number>(-1)

const page = reactive({
  dto: {
    currentPage: 1,
    pageSize: 10
  } as AccountPageDto,
  total: 0,
  list: [] as Array<AccountListData>
})

const formData = ref({
  id: undefined,
  name: '',
  address: '',
  account: '',
  password: '',
  remark: '',
  updatePassword: false
} as AccountUpdateDto)

const dialogData = reactive({
  visible: false,
  operate: 'ADD',
  title: '新增应用账号信息'
})

const viewPasswordDialog = reactive({
  visible: false,
  loading: false,
  pd: ''
})

onMounted(() => {
  queryAccountCategories().then(res => { categories.value = res.data.items }).catch(() => { categories.value = [] })
  searchPage()
})

const handleClick = (tab: TabsPaneContext, event: Event) => {
  const name = tab.props.name;
  page.dto.type = name == "-1" ? undefined : name;
  page.dto.currentPage = 1
  searchPage() 
}

function searchPage() {
  loading.value = true
  queryApplicationAccountPage(page.dto).then(data => {
    page.total = data.data.total
    page.list = data.data.records
    loading.value = false
  }).finally(() => {
    loading.value = false
  })
}

function resetSearch() {
  activeName.value = -1
  page.dto.currentPage = 1
  page.dto.type = undefined
  page.dto.name = undefined
  page.dto.address = undefined
  searchPage()
}

function handleAdd() {
  initFormData()
  dialogData.operate = 'ADD'
  dialogData.visible = true;
}

const clearPassword = () => { passwordRequest++; viewPasswordDialog.pd = '' }
const handleViewPassword = async (index: number, row: AccountListData) => {
  const request = ++passwordRequest
  viewPasswordDialog.visible = true
  viewPasswordDialog.pd = ''
  viewPasswordDialog.loading = true
  try {
    const res = await viewPasswordById(row.id)
    if (request === passwordRequest && viewPasswordDialog.visible) viewPasswordDialog.pd = res.data
  } finally { if (request === passwordRequest) viewPasswordDialog.loading = false }
}

// 复制到剪贴板
const copyText = async () => {
  try {
    await navigator.clipboard.writeText(viewPasswordDialog.pd);
    ElMessage.success('复制成功！');
  } catch (err) {
    ElMessage.error('复制失败，请重试');
  }
};

const handleEdit = (index: number, row: AccountListData) => {
  loading.value = true
  queryApplicationAccountDetail(row.id).then(res => {
    formData.value = { ...res.data, type: res.data.type === 0 ? null : res.data.type, password: '', updatePassword: false }
    dialogData.operate = 'UPDATE'
    dialogData.visible = true;
  }).finally(() => {
    loading.value = false
  })
}

const handleDelete = (index: number, row: AccountListData) => {
  ElMessageBox.confirm('确认删除该账号吗？', '删除账号', { type: 'warning' }).then(() => deleteApplicationAccount(row.id)).then(res => {
    searchPage()
  }).catch(() => { /* Cancellation or request errors leave the list intact. */ }).finally(() => {
    loading.value = false
  })
}

const cancelDialog = () => {
  dialogData.visible = false;
  initFormData();
}

const handleDialogConfirm = async (formEl: FormInstance | undefined) => {
  if (!formEl || saving.value) return
  const data = { ...formData.value, type: formData.value.type ?? null }
  if (![data.name, data.address, data.account].some(value => String(value || '').trim())) {
    ElMessage.warning('应用名称、应用地址、账号至少填写一项')
    return
  }
  saving.value = true
  try {
    if (dialogData.operate === 'ADD') await addApplicationAccount(data)
    else {
      if (!data.updatePassword) delete data.password
      await updateApplicationAccount(data)
    }
    cancelDialog()
    searchPage()
  } finally { saving.value = false }
}

const initFormData = () => {
  formData.value = {
    id: undefined,
    name: '',
    address: '',
    account: '',
    password: '',
    remark: '',
    updatePassword: false
  }
}

const handleSizeChange = (val: number) => {
  page.dto.currentPage = 1
  page.dto.pageSize = val
  searchPage()
}

const handleCurrentChange = (val: number) => {
  page.dto.currentPage = val
  searchPage()
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
