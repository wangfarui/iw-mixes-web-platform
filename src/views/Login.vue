<template>
  <div style="display: flex;justify-content: center">
    <el-card
        v-loading="loading"
        element-loading-text="拼命登录中..."
        :element-loading-spinner="svg"
        element-loading-svg-view-box="-10, -10, 50, 50"
        element-loading-background="rgba(122, 122, 122, 0.8)"
        class="box-card" style="width: 400px;margin-top: 150px">
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
    </el-card>
    <div style="position: fixed; bottom: 20px; width: 100%; text-align: center; font-size: 12px; color: #909399;">
      <a href="https://beian.miit.gov.cn/" style="color: #909399;"><span>鄂ICP备2024050235号-1</span></a>&nbsp;&nbsp;
      <a href="https://beian.mps.gov.cn/#/query/webSearch?code=42018502007471" rel="noreferrer" target="_blank" style="color: #909399;">
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

</style>
