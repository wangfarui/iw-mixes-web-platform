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
            <el-avatar :src="user.avatar" :size="40" />
            &nbsp;&nbsp;<span class="username">{{user.name}}</span>
          </span>
            <template #dropdown>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item><el-icon><Edit /></el-icon>修改资料</el-dropdown-item>
                <el-dropdown-item @click="logout"><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-container>
        <!-- 侧边容器 -->
        <el-aside width="250px">
          <el-menu router>
            <el-menu-item index="/"><el-icon><House /></el-icon>首页</el-menu-item>
            <el-sub-menu index="1">
              <template #title>
                <el-icon><Dish /></el-icon>
                <span>餐饮管理</span>
              </template>
              <el-menu-item index="/meal"><el-icon><Food /></el-icon>点餐记录</el-menu-item>
              <el-menu-item index="/dishes"><el-icon><KnifeFork /></el-icon>菜品管理</el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="2">
              <template #title>
                <el-icon><Wallet /></el-icon>
                <span>财务管理</span>
              </template>
              <el-menu-item index="/bookkeeping"><el-icon><ShoppingCart /></el-icon>记账记录</el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="3">
              <template #title>
                <el-icon><Wallet /></el-icon>
                <span>积分管理</span>
              </template>
              <el-menu-item index="/points/task"><el-icon><Tickets /></el-icon>积分任务</el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="4">
              <template #title>
                <el-icon><Setting /></el-icon>
                <span>基础设置</span>
              </template>
              <el-menu-item index="/dict"><el-icon><Memo /></el-icon>字典列表</el-menu-item>
            </el-sub-menu>

          </el-menu>
        </el-aside>

        <!-- 主容器 -->
        <el-main>
          <div v-if="proxy!.$router.currentRoute.value.path=='/'" style="font-size: 20px;font-family: 华文行楷;color: black;text-align: center">欢迎来到IW管理平台！</div>
          <RouterView/>
        </el-main>
      </el-container>

      <el-footer class="footer">
        <div class="footer-content">
          <a href="https://beian.miit.gov.cn/"><span>鄂ICP备2024050235号-1</span></a>&nbsp;&nbsp;
          <a href="https://beian.mps.gov.cn/#/query/webSearch?code=42018502007471" rel="noreferrer" target="_blank">
            <el-image src="https://itwray.oss-cn-heyuan.aliyuncs.com/img/beian.png" style="width: 15px; height: 15px" fit='contain' />
            <span>鄂公网安备42018502007471</span>
          </a>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import {ref, reactive, onMounted} from 'vue'
import {RouterView} from 'vue-router'
import router from "@/router";
import { getCurrentInstance } from "vue";
import {Edit, SwitchButton, KnifeFork, Dish, Food, House, Wallet, ShoppingCart, Setting, Memo, Tickets} from '@element-plus/icons-vue'

const { proxy } = getCurrentInstance()!;

const user: any = reactive({
  name: "Admin",
  avatar: "https://itwray.oss-cn-heyuan.aliyuncs.com/img/touxiang.jpeg"
})

// 默认选中的菜单项
const menuActive = ref("/")

onMounted(() => {
  user.name = window.sessionStorage.getItem("name");
})

function logout() {
  window.sessionStorage.removeItem("iwtoken");
  router.push({path: '/login'})
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

.footer-content>a {
  color: #000000;
}
</style>