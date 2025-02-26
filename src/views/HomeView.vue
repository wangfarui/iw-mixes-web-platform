<template>
  <div class="main-layout">
    <el-container>
      <!-- 顶栏容器 -->
      <el-header class="header">
        <div class="left">
          <span class="logo">IW管理平台</span>
        </div>
        <div class="right">
          <el-dropdown trigger="hover">
          <span class="user">
            <el-avatar :src="user.avatar" :size="40"/>
            &nbsp;&nbsp;<span class="username">{{ user.name }}</span>
          </span>
            <template #dropdown>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item @click="editPassword">
                  <el-icon>
                    <Edit/>
                  </el-icon>
                  修改密码
                </el-dropdown-item>
                <el-dropdown-item @click="logout">
                  <el-icon>
                    <SwitchButton/>
                  </el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-container>
        <!-- 侧边容器 -->
        <el-aside width="250px">
          <el-menu router>
            <el-menu-item index="/">
              <SvgIcon name="home" />首页
            </el-menu-item>
            <el-sub-menu index="1">
              <template #title>
                <SvgIcon name="meal-manage" />
                <span>餐饮管理</span>
              </template>
              <el-menu-item index="/meal">
                <SvgIcon name="meal-records" />
                点餐记录
              </el-menu-item>
              <el-menu-item index="/dishes">
                <SvgIcon name="dishes-manage" />
                菜品管理
              </el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="2">
              <template #title>
                <SvgIcon name="bookkeeping-manage" />
                <span>财务管理</span>
              </template>
              <el-menu-item index="/bookkeeping">
                <SvgIcon name="bookkeeping-records" />记账记录
              </el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="3">
              <template #title>
                <SvgIcon name="task-manage" />
                <span>任务管理</span>
              </template>
              <el-menu-item index="/task/list">
                <SvgIcon name="task-list" />任务列表
              </el-menu-item>
              <el-menu-item index="/task/records">
                <SvgIcon name="task-records" />任务记录
              </el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="4">
              <template #title>
                <SvgIcon name="points-manage" />
                <span>积分管理</span>
              </template>
              <el-menu-item index="/points/records">
                <SvgIcon name="points-records" />积分记录
              </el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="5">
              <template #title>
                <SvgIcon name="base-setting" />
                <span>基础设置</span>
              </template>
              <el-menu-item index="/dict">
                <SvgIcon name="dict-manage" />
                字典管理
              </el-menu-item>
            </el-sub-menu>

          </el-menu>
        </el-aside>

        <!-- 主容器 -->
        <el-main>
          <div v-if="proxy!.$router.currentRoute.value.path=='/'"
               style="font-size: 20px;font-family: 华文行楷;color: black;text-align: center">欢迎来到IW管理平台！
          </div>
          <RouterView/>
        </el-main>
      </el-container>

      <el-footer class="footer">
        <div class="footer-content">
          <a href="https://beian.miit.gov.cn/"><span>鄂ICP备2024050235号-1</span></a>&nbsp;&nbsp;
          <a href="https://beian.mps.gov.cn/#/query/webSearch?code=42018502007471" rel="noreferrer" target="_blank">
            <el-image src="https://itwray.oss-cn-heyuan.aliyuncs.com/img/beian.png" style="width: 15px; height: 15px"
                      fit='contain'/>
            <span>鄂公网安备42018502007471</span>
          </a>
        </div>
      </el-footer>
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
  Edit,
  SwitchButton
} from '@element-plus/icons-vue'
import {ElMessage, ElLoading, type FormInstance, type TabsPaneContext, type FormRules} from "element-plus";
import {editPasswordApi, getVerificationCodeByActionApi} from "@/api/login.ts";
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

onMounted(() => {
  user.name = window.sessionStorage.getItem("name");
})

function editPassword() {
  editPasswordDialogVisible.value = true;
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
</style>