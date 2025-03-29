<template>
  <div class="main-layout">
    <el-container>
      <el-container>
        <!-- 侧边容器 -->
        <el-aside :width="isCollapse ? '64px' : '180px'" class="aside-container">
          <!-- 用户信息区域 -->
          <div class="user-info">
            <el-dropdown trigger="click" placement="right-start">
              <div class="user-content" :class="{ 'collapsed': isCollapse }">
                <el-avatar :src="user.avatar" :size="isCollapse ? 40 : 60"/>
                <span v-if="!isCollapse" class="username">{{ user.name }}</span>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="refreshCache">
                    <el-icon><Refresh /></el-icon>
                    <span>刷新缓存</span>
                  </el-dropdown-item>
                  <el-dropdown-item @click="editPassword">
                    <el-icon><Edit/></el-icon>
                    <span>修改密码</span>
                  </el-dropdown-item>
                  <el-dropdown-item @click="logout">
                    <el-icon><SwitchButton/></el-icon>
                    <span>退出登录</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <!-- 折叠按钮 -->
          <div class="collapse-btn" @click="toggleCollapse">
            <el-icon :size="20">
              <Fold v-if="!isCollapse"/>
              <Expand v-else/>
            </el-icon>
          </div>
          <!-- 菜单 -->
          <el-menu 
            router 
            :collapse="isCollapse"
            :collapse-transition="true">
            <el-menu-item index="/">
              <el-icon><HomeFilled /></el-icon>
              <template #title>首页</template>
            </el-menu-item>
            <el-sub-menu index="1">
              <template #title>
                <el-icon><SvgIcon dir="home" name="meal-manage" /></el-icon>
                <span>餐饮管理</span>
              </template>
              <el-menu-item index="/meal">
                <el-icon><SvgIcon dir="home" name="meal-records" /></el-icon>
                <span>点餐记录</span>
              </el-menu-item>
              <el-menu-item index="/dishes">
                <el-icon><SvgIcon dir="home" name="dishes-manage" /></el-icon>
                <span>菜品管理</span>
              </el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="2">
              <template #title>
                <el-icon><SvgIcon dir="home" name="bookkeeping-manage" /></el-icon>
                <span>财务管理</span>
              </template>
              <el-menu-item index="/bookkeeping">
                <el-icon><SvgIcon dir="home" name="bookkeeping-records" /></el-icon>
                <span>记账记录</span>
              </el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="3">
              <template #title>
                <el-icon><SvgIcon dir="home" name="task-manage" /></el-icon>
                <span>任务管理</span>
              </template>
              <el-menu-item index="/task/list">
                <el-icon><SvgIcon dir="home" name="task-list" /></el-icon>
                <span>任务清单</span>
              </el-menu-item> 
              <el-menu-item index="/task/records">
                <el-icon><SvgIcon dir="home" name="task-records" /></el-icon>
                <span>任务记录</span>
              </el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="4">
              <template #title>
                <el-icon><SvgIcon dir="home" name="points-manage" /></el-icon>
                <span>积分管理</span>
              </template>
              <el-menu-item index="/points/records">
                <el-icon><SvgIcon dir="home" name="points-records" /></el-icon>
                <span>积分记录</span>
              </el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="5">
              <template #title>
                <el-icon><SvgIcon dir="home" name="base-setting" /></el-icon>
                <span>基础设置</span>
              </template>
              <el-menu-item index="/dict">
                <el-icon><SvgIcon dir="home" name="dict-manage" /></el-icon>
                <span>字典管理</span>
              </el-menu-item>
              <el-menu-item index="/account">
                <el-icon><SvgIcon dir="home"  name="account-manage" /></el-icon>
                <span>账号管理</span>
              </el-menu-item>
            </el-sub-menu>

          </el-menu>
        </el-aside>

        <!-- 主容器 -->
        <el-main style="padding:0">
          <div v-if="proxy!.$router.currentRoute.value.path=='/'"
               style="font-size: 20px;font-family: 华文行楷;color: black;text-align: center">欢迎来到IW管理平台！
          </div>
          <RouterView/>
        </el-main>
      </el-container>

      <!-- <el-footer class="footer">
        <div class="footer-content">
          <a href="https://beian.miit.gov.cn/"><span>鄂ICP备2024050235号-1</span></a>&nbsp;&nbsp;
          <a href="https://beian.mps.gov.cn/#/query/webSearch?code=42018502007471" rel="noreferrer" target="_blank">
            <el-image src="https://itwray.oss-cn-heyuan.aliyuncs.com/img/beian.png" style="width: 15px; height: 15px"
                      fit='contain'/>
            <span>鄂公网安备42018502007471</span>
          </a>
        </div>
      </el-footer> -->
    </el-container>

    <el-dialog
        v-model="editPasswordDialogVisible"
        title="修改密码"
        width="500"
        center
        :close-on-click-modal="false"
    >
      <el-tabs @tab-click="handleClick" v-model="tabPane">
        <el-form
            ref="formRef"
            style="max-width: 600px"
            :model="numberValidateForm"
            :rules="rules"
            label-width="auto"
        >
          <el-tab-pane label="密码验证" name="password">
            <el-form-item
                label="原密码"
                prop="oldPassword"
                :required="tabPane == 'password'"
            >
              <el-input v-model.number="numberValidateForm.oldPassword" type="password" show-password/>
            </el-form-item>
          </el-tab-pane>
          <el-tab-pane label="短信验证" name="verificationCode">
            <el-form-item
                label="短信验证码"
                prop="verificationCode"
                :required="tabPane == 'verificationCode'"
            >
              <el-input v-model="numberValidateForm.verificationCode" maxlength="6" placeholder="请输入验证码"/>
              <div style="margin-top: 5px">
                <el-button :disabled="isCountingDown" @click="getVerificationCodeByEditPassword()">
                  {{ isCountingDown ? `${count}s重试` : "获取验证码" }}
                </el-button>
              </div>
            </el-form-item>
          </el-tab-pane>
          <el-form-item
              label="新密码"
              prop="newPassword"
              required
          >
            <el-input v-model.number="numberValidateForm.newPassword" type="password" show-password/>
          </el-form-item>
          <el-form-item
              label="再次输入"
              prop="twoPassword"
              required
          >
            <el-input v-model.number="numberValidateForm.twoPassword" type="password" show-password/>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="submitForm(formRef)">确定</el-button>
            <el-button @click="cancelForm(formRef)">取消</el-button>
          </el-form-item>
        </el-form>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {ref, reactive, onMounted} from 'vue'
import {RouterView} from 'vue-router'
import router from "@/router";
import {getCurrentInstance} from "vue";
import {
  Refresh,
  Edit,
  SwitchButton,
  Expand,
  Fold,
  HomeFilled
} from '@element-plus/icons-vue'
import {ElMessage, ElLoading, type FormInstance, type TabsPaneContext, type FormRules} from "element-plus";
import {editPasswordApi, getVerificationCodeByActionApi, refreshDictCache} from "@/api/login";
import type {UserPasswordEditDto} from "@/types/types";
import SvgIcon from "@/components/SvgIcon.vue";

const {proxy} = getCurrentInstance()!;

const user: any = reactive({
  name: "Admin",
  avatar: "https://itwray.oss-cn-heyuan.aliyuncs.com/img/touxiang.jpeg"
})

const tabPane: any = ref('password') // 当前标签选项
const isCountingDown = ref(false) // 标记是否处于倒计时状态
const count = ref(60) // 初始倒计时时间

const editPasswordDialogVisible = ref(false)

const numberValidateForm: UserPasswordEditDto = reactive({
  verificationCode: '',
  oldPassword: '',
  newPassword: '',
  twoPassword: ''
})

const formRef = ref<FormInstance>()

const isCollapse = ref(false)

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

onMounted(() => {
  user.name = window.sessionStorage.getItem("name");
})

function editPassword() {
  editPasswordDialogVisible.value = true;
}

function refreshCache() {
  refreshDictCache();
  ElMessage.success("刷新缓存成功")
}

const validateVerificationCode = (rule: any, value: any, callback: any) => {
  if (tabPane.value == 'verificationCode' && value === '') {
    callback(new Error('验证码不能为空'))
  } else {
    callback()
  }
}

const validateOldPassword = (rule: any, value: any, callback: any) => {
  if (tabPane.value == 'password' && value === '') {
    callback(new Error('原密码不能为空'))
  } else {
    callback()
  }
}


const validateNewPassword = (rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('新密码不能为空'))
  } else {
    callback()
  }
}

const validateTwoPassword = (rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('二次确认密码不能为空'))
  } else {
    callback()
  }
}

const rules = reactive<FormRules<typeof numberValidateForm>>({
  verificationCode: [{validator: validateVerificationCode, trigger: 'blur'}],
  oldPassword: [{validator: validateOldPassword, trigger: 'blur'}],
  newPassword: [{validator: validateNewPassword, trigger: 'blur'}],
  twoPassword: [{validator: validateTwoPassword, trigger: 'blur'}]
})

const handleClick = (tab: TabsPaneContext, event: Event) => {
  tabPane.value = tab.props.name
}

const submitForm = (formEl: FormInstance | undefined) => {

  console.log(formEl)
  if (!formEl) {
    console.log("123")
    return
  }
  formEl.validate((valid) => {
    console.log("2222")
    console.log(valid)
    if (valid) {
      if (numberValidateForm.newPassword !== numberValidateForm.twoPassword) {
        ElMessage.warning('两次输入的密码不一致，请重新输入')
        return
      }
      const loading = ElLoading.service({
        lock: true,
        text: 'Loading',
        background: 'rgba(0, 0, 0, 0.7)',
      })
      editPasswordApi(numberValidateForm).then(data => {
        editPasswordDialogVisible.value = false;
        // 修改成功之后走退出登录逻辑
        logout()
      }).finally(() => {
        loading.close()
      })
    }
  })
}

const cancelForm = (formEl: FormInstance | undefined) => {
  if (!formEl) return
  editPasswordDialogVisible.value = false;
  formEl.resetFields()
  numberValidateForm.verificationCode = ''
}

function logout() {
  window.sessionStorage.removeItem("iwtoken");
  router.push({path: '/login'})
}

// 修改密码时获取验证码
function getVerificationCodeByEditPassword() {
  getVerificationCodeByActionApi(1).then(data => {
    ElMessage.success("验证码已发送")
    startCountdown();
  })
}


function startCountdown() {
  if (isCountingDown.value) return; // 如果已经在倒计时中，直接返回
  isCountingDown.value = true; // 标记开始倒计时

  // 倒计时逻辑
  const timer = setInterval(() => {
    count.value -= 1;
    if (count.value <= 0) {
      clearInterval(timer); // 清除定时器
      isCountingDown.value = false; // 恢复按钮状态
      count.value = 60; // 重置倒计时时间
    }
  }, 1000); // 每隔1秒执行一次
}

</script>

<style>
.main-layout {
  height: 100vh; /* 设置高度为视口高度，使布局充满整个浏览器窗口 */
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  background-color: #f0f0f0;
}

.left {
  display: flex;
  align-items: center;
}

.right {
  display: flex;
  align-items: center;
}

.logo {
  font-size: 18px;
  font-weight: bold;
}

.user {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.username {
  font-size: 14px;
}

.el-header {
  background-color: #409eff;
  color: #fff;
  padding: 0 20px;
}

.footer {
  height: 40px; /* 调整高度 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-content {
  vertical-align: middle;
}

.footer-content > a {
  color: #000000;
}

.aside-container {
  transition: width 0.3s;
  background-color: #fff;
  border-right: 1px solid #e6e6e6;
}

.collapse-btn {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-bottom: 1px solid #e6e6e6;
}

.collapse-btn:hover {
  background-color: #f5f7fa;
}

.user-info {
  padding: 16px 0;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: center;
}

.user-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 0 10px;
}

.user-content.collapsed {
  padding: 0;
}

.user-content .username {
  margin-top: 8px;
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* 下拉菜单样式优化 */
:deep(.el-dropdown-menu) {
  padding: 5px 0;
  min-width: 120px;
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  font-size: 14px;
  line-height: 1.5;
}

:deep(.el-dropdown-menu__item .el-icon) {
  margin-right: 8px;
  font-size: 16px;
}

:deep(.el-menu) {
  border-right: none;
}

:deep(.el-menu--collapse) {
  width: 64px;
}

:deep(.el-menu-item), :deep(.el-sub-menu__title) {
  height: 50px;
  line-height: 50px;
}

/* 移除不需要的样式 */
.header,
.left,
.right,
.logo {
  display: none;
}
</style>