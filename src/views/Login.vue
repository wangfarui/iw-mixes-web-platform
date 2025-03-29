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
                <el-input v-model="userInfo.account" placeholder="请输入用户名或手机号" clearable/>
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
              <el-input v-model="userInfo.phoneNumber" maxlength="11" placeholder="请输入手机号" clearable/>
            </el-col>
          </el-row>
          <el-row align="middle" style="margin-top: 5px">
            <el-col :span="5">验证码：</el-col>
            <el-col :span="12">
              <el-input v-model="userInfo.verificationCode" maxlength="6" placeholder="请输入验证码" />
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
  </div>
</template>

<script setup>
import {reactive, toRefs, ref} from "vue";
import {loginByPasswordApi, getDictTypeList, getAllDictList, loginByVerificationCodeApi, getVerificationCodeApi} from "@/api/login.ts";
import router from '@/router'
import {ElMessage} from "element-plus";

import {useDictStore} from "@/stores/dict";

const dictStore = useDictStore();

const isCountingDown = ref(false) // 标记是否处于倒计时状态
const count = ref(60) // 初始倒计时时间

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

  loading.value = true;
  loginByVerificationCodeApi(userInfo.value).then(data => {
    loading.value = false;
    loginSuccessAfter(data);
  }).catch(err => {
    loading.value = false;
  })
}

// 登录成功后的操作
function loginSuccessAfter(data) {
  //1. 先把用户信息保存起来，后面用
  //这里保存的数据格式是 key-value 形式的，value 只能是字符串，不能是 JSON 对象
  window.sessionStorage.setItem("name", data.data.name);
  window.sessionStorage.setItem("iwtoken", data.data.tokenValue);
  //2. 跳转
  router.push({path: '/'})

  // 3. 加载字典类型
  getDictTypeList().then(data => {
    dictStore.setDictTypeArray(data.data)
  })

  // 4. 加载所有数据字典
  getAllDictList().then(data => {
    dictStore.setDictDataArrayMap(data.data)
  })
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
  getVerificationCodeApi(userInfo.value.phoneNumber).then(data => {
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
