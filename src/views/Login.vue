<template>
  <div class="login-page">
    <el-card
        v-loading="loading"
        element-loading-text="拼命登录中..."
        :element-loading-spinner="svg"
        element-loading-svg-view-box="-10, -10, 50, 50"
        element-loading-background="rgba(122, 122, 122, 0.8)"
        class="box-card login-card">
      <el-tabs>
        <el-tab-pane label="账号密码登录">
          <div>
            <el-row align="middle">
              <el-col :span="4">账号：</el-col>
              <el-col :span="20">
                <el-input v-model="userInfo.account" placeholder="请输入用户名或手机号" clearable @keyup.enter="loginByPassword"/>
              </el-col>
            </el-row>
            <el-row align="middle" style="margin-top: 5px">
              <el-col :span="4">密码：</el-col>
              <el-col :span="20">
                <el-input
                    v-model="userInfo.password"
                    type="password"
                    placeholder="请输入用户密码"
                    show-password
                    @keyup.enter="loginByPassword"
                />
              </el-col>
            </el-row>
            <el-row style="margin-top: 15px">
              <el-button type="primary" @click="loginByPassword" style="width: 100%">登录</el-button>
            </el-row>
          </div>
        </el-tab-pane>
        <el-tab-pane label="手机号登录" v-loading="verificationCodeLoading">
          <el-row align="middle">
            <el-col :span="5">手机号：</el-col>
            <el-col :span="19">
              <el-input v-model="userInfo.phoneNumber" maxlength="11" placeholder="请输入手机号" clearable @keyup.enter="loginByVerificationCode"/>
            </el-col>
          </el-row>
          <el-row align="middle" style="margin-top: 5px">
            <el-col :span="5">验证码：</el-col>
            <el-col :span="12">
              <el-input v-model="userInfo.verificationCode" maxlength="6" placeholder="请输入验证码" @keyup.enter="loginByVerificationCode" />
            </el-col>
            <el-col :span="7" style="text-align: end">
              <el-button :disabled="isCountingDown" @click="getVerificationCode()">{{ isCountingDown ? `${count}s重试` : "获取验证码" }}</el-button>
            </el-col>
          </el-row>
          <el-row style="margin-top: 15px">
            <el-button type="primary" @click="loginByVerificationCode" style="width: 100%">登录</el-button>
          </el-row>
        </el-tab-pane>
      </el-tabs>
      <el-row align="middle" style="font-size: 12px; color: #606266; margin-top: 10px">
        <el-col :span="4" @click="registerAccount()" style="cursor: pointer">注册账号</el-col>
        <el-col :span="16"></el-col>
        <el-col :span="4" @click="forgetPassword()" style="cursor: pointer; text-align: end">找回密码</el-col>
      </el-row>
      <div class="public-entry-section">
        <div class="public-entry-divider"><span>无需登录，直接访问</span></div>
        <div class="public-entry-grid">
          <button type="button" class="public-entry-card" aria-label="进入工具箱" @click="goToPublicPage('/tools')">
            <span class="public-entry-icon public-entry-icon--tools"><el-icon><Tools /></el-icon></span>
            <span class="public-entry-copy">
              <strong>工具箱</strong>
              <small>本地优先的实用工具</small>
            </span>
            <el-icon class="public-entry-arrow"><ArrowRight /></el-icon>
          </button>
          <button type="button" class="public-entry-card" aria-label="进入找钢工作台" @click="goToPublicPage('/zhaogang')">
            <span class="public-entry-icon public-entry-icon--zhaogang"><el-icon><Briefcase /></el-icon></span>
            <span class="public-entry-copy">
              <strong>找钢工作台</strong>
              <small>发布、迭代与工时协作</small>
            </span>
            <el-icon class="public-entry-arrow"><ArrowRight /></el-icon>
          </button>
        </div>
      </div>
    </el-card>
    <div class="login-footer">
      <a href="https://beian.miit.gov.cn/"><span>鄂ICP备2024050235号-1</span></a>&nbsp;&nbsp;
      <a href="https://beian.mps.gov.cn/#/query/webSearch?code=42018502007471" rel="noreferrer" target="_blank">
        <span>鄂公网安备42018502007471</span>
      </a>
    </div>
    <el-dialog
        v-model="inviteDialogVisible"
        title="新用户注册"
        width="360"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
    >
      <el-form label-width="76px" @submit.prevent>
        <el-form-item label="邀请码">
          <el-input
              v-model="inviteForm.inviteCode"
              maxlength="6"
              placeholder="请输入邀请码"
              clearable
              @input="formatInviteCode"
              @keyup.enter="submitInviteCode"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelInviteDialog">取消</el-button>
        <el-button type="primary" :loading="inviteSubmitting" @click="submitInviteCode">完成注册</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import {reactive, toRefs, ref} from "vue";
import {
  loginByPasswordApi,
  refreshDictCache,
  loginByVerificationCodeApi,
  getPhoneVerificationCodeApi,
  getEmailVerificationCodeApi,
  registerByVerificationCodeInviteApi
} from "@/api/login.ts";
import router from '@/router'
import {ElMessage} from "element-plus";
import {ArrowRight, Briefcase, Tools} from '@element-plus/icons-vue'

import {useDictStore} from "@/stores/dict";
import versionPollingService from '@/services/versionPollingService'
import authSession from '@/services/authSession'
import {takePostLoginTarget} from '@/router/auth'

const dictStore = useDictStore();

const isCountingDown = ref(false) // 标记是否处于倒计时状态
const count = ref(60) // 初始倒计时时间
const inviteDialogVisible = ref(false)
const inviteSubmitting = ref(false)
const inviteForm = reactive({
  registerTicket: '',
  inviteCode: ''
})

const data = reactive({
  userInfo: {
    account: '',
    phoneNumber: '',
    password: '',
    verificationCode: ''
  },
  loading: false,
  verificationCodeLoading: false
})

const {userInfo, loading, verificationCodeLoading} = toRefs(data);
const svg = `
        <path class="path" d="
          M 30 15
          L 28 17
          M 25.61 25.61
          A 15 15, 0, 0, 1, 15 30
          A 15 15, 0, 1, 1, 27.99 7.5
          L 15 15
        " style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)"/>
      `

function goToPublicPage(path) {
  void router.push(path)
}

// 密码登录
function loginByPassword() {
  if (userInfo.value.account == '' || userInfo.value.password == '') {
    ElMessage.warning('账号和密码不能为空')
    return
  }

  // 清空验证码登录的数据
  userInfo.value.phoneNumber = ''
  userInfo.value.verificationCode = ''

  loading.value = true;
  loginByPasswordApi(userInfo.value).then(data => {
    loading.value = false;
    loginSuccessAfter(data);
  }).catch(err => {
    loading.value = false;
  })
}

// 验证码登录
function loginByVerificationCode() {
  if (userInfo.value.phoneNumber == '' || userInfo.value.verificationCode == '') {
    ElMessage.warning('手机号和验证码不能为空')
    return
  }
  if (isValidPhoneNumber(userInfo.value.phoneNumber) === false) {
    ElMessage.warning('手机号格式错误')
    return
  }

  // 清空密码登录的数据
  userInfo.value.account = ''
  userInfo.value.password = ''

  userInfo.value.loginWay = 1

  loading.value = true;
  loginByVerificationCodeApi(userInfo.value).then(data => {
    loading.value = false;
    if (data.data && data.data.inviteRequired) {
      openInviteDialog(data.data.registerTicket)
      return
    }
    loginSuccessAfter(data);
  }).catch(err => {
    loading.value = false;
  })
}

function openInviteDialog(registerTicket) {
  inviteForm.registerTicket = registerTicket || ''
  inviteForm.inviteCode = ''
  inviteDialogVisible.value = true
}

function cancelInviteDialog() {
  inviteDialogVisible.value = false
  inviteForm.registerTicket = ''
  inviteForm.inviteCode = ''
}

function formatInviteCode(value) {
  inviteForm.inviteCode = String(value || '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6)
}

function submitInviteCode() {
  if (inviteSubmitting.value) return
  if (!inviteForm.registerTicket) {
    ElMessage.warning('注册状态已失效，请重新获取验证码')
    cancelInviteDialog()
    return
  }
  if (!/^[0-9A-Z]{6}$/.test(inviteForm.inviteCode)) {
    ElMessage.warning('请输入6位邀请码')
    return
  }

  inviteSubmitting.value = true
  registerByVerificationCodeInviteApi(inviteForm).then(data => {
    inviteDialogVisible.value = false
    loginSuccessAfter(data)
  }).finally(() => {
    inviteSubmitting.value = false
  })
}

// 登录成功后的操作
function loginSuccessAfter(data) {
  authSession.saveLoginSession({
    token: data.data.tokenValue,
    userName: data.data.name
  })
  void router.replace(takePostLoginTarget(router))

  // 加载字典缓存
  refreshDictCache();

  // 启动全局版本号轮询机制
  versionPollingService.startVersionPolling();
}

// 获取验证码
function getVerificationCode() {
  if (userInfo.value.phoneNumber == '') {
    ElMessage.warning('请先输入手机号')
    return
  }
  if (isValidPhoneNumber(userInfo.value.phoneNumber) === false) {
    ElMessage.warning('手机号格式错误')
    return
  }
  verificationCodeLoading.value = true;
  getPhoneVerificationCodeApi(userInfo.value.phoneNumber).then(data => {
    ElMessage.success("验证码已发送")
    startCountdown();
  }).finally(() => {
    verificationCodeLoading.value = false;
  })
}

function isValidPhoneNumber(phone) {
  const regex = /^1[3-9]\d{9}$/;
  return regex.test(phone);
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

// 注册账号
function registerAccount() {
  console.log("registerAccount")
}

// 忘记密码
function forgetPassword() {
  console.log("forgetPassword")
}

</script>

<style scoped>
.login-page {
  display: flex;
  box-sizing: border-box;
  min-height: 100vh;
  justify-content: center;
  padding: 120px 20px 92px;
  background: linear-gradient(145deg, #f8faff 0%, #f4f7fc 52%, #eef3fb 100%);
}

.login-card {
  width: min(440px, 100%);
  height: fit-content;
  border-color: #e3e8f1;
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(44, 65, 101, .08);
}

.public-entry-section {
  margin-top: 22px;
}

.public-entry-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #9099a8;
  font-size: 12px;
  white-space: nowrap;
}

.public-entry-divider::before,
.public-entry-divider::after {
  height: 1px;
  flex: 1;
  background: #e8ebf1;
  content: '';
}

.public-entry-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.public-entry-card {
  display: grid;
  min-width: 0;
  grid-template-columns: 34px minmax(0, 1fr) 14px;
  align-items: center;
  gap: 9px;
  padding: 12px 10px;
  color: #334158;
  text-align: left;
  background: #fafbfe;
  border: 1px solid #e6eaf1;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}

.public-entry-card:hover,
.public-entry-card:focus-visible {
  border-color: #9fbcf2;
  box-shadow: 0 7px 18px rgba(52, 96, 174, .1);
  outline: none;
  transform: translateY(-1px);
}

.public-entry-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  font-size: 17px;
}

.public-entry-icon--tools {
  color: #376fdd;
  background: #eaf1ff;
}

.public-entry-icon--zhaogang {
  color: #a96713;
  background: #fff2dc;
}

.public-entry-copy {
  min-width: 0;
}

.public-entry-copy strong,
.public-entry-copy small {
  display: block;
}

.public-entry-copy strong {
  font-size: 13px;
  line-height: 1.3;
}

.public-entry-copy small {
  margin-top: 3px;
  overflow: hidden;
  color: #8a94a4;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-entry-arrow {
  color: #a5adba;
  font-size: 13px;
}

.login-footer {
  position: fixed;
  bottom: 20px;
  width: 100%;
  color: #909399;
  font-size: 12px;
  text-align: center;
}

.login-footer a {
  color: #909399;
}

@media (max-width: 480px) {
  .login-page {
    align-items: center;
    padding-top: 30px;
  }

  .public-entry-grid {
    grid-template-columns: 1fr;
  }
}
</style>
