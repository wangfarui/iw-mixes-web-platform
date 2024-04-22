<template>
  <div class="main-layout">
    <el-container>
      <!-- 顶栏容器 -->
      <el-header class="header">
        <div class="left">
          <span class="logo">IW Project</span>
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
                <el-dropdown-item><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-container>
        <!-- 侧边容器 -->
        <el-aside width="150px">
          <el-menu router>
            <el-menu-item index="/"><el-icon><House /></el-icon>首页</el-menu-item>
            <el-menu-item index="/meal"><el-icon><Food /></el-icon>点餐</el-menu-item>
            <el-menu-item index="/dishes"><el-icon><KnifeFork /></el-icon>菜品</el-menu-item>
          </el-menu>
        </el-aside>

        <!-- 主容器 -->
        <el-main>
          <div v-if="proxy!.$router.currentRoute.value.path=='/'" style="font-size: 20px;font-family: 华文行楷;color: black;text-align: center">欢迎来到IW点餐系统！</div>
          <RouterView/>
        </el-main>
      </el-container>

      <el-footer class="footer">
        <div class="footer-content">
          <a href="https://beian.miit.gov.cn/"><span>鄂ICP备2024050235号-1</span></a>&nbsp;&nbsp;
          <a href="https://beian.mps.gov.cn/#/query/webSearch?code=42018502007471" rel="noreferrer" target="_blank">
            <el-image src="https://itwray-bucket.oss-cn-wuhan-lr.aliyuncs.com/img/beian.png" style="width: 20px; height: 20px" fit='contain' />
            <span>鄂公网安备42018502007471</span>
          </a>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import {RouterView} from 'vue-router'
import { getCurrentInstance } from "vue";
import {Edit, SwitchButton, KnifeFork, Food, House} from '@element-plus/icons-vue'

const { proxy } = getCurrentInstance()!;

const user = reactive({
  name: "Admin",
  avatar: "https://itwray-bucket.oss-cn-wuhan-lr.aliyuncs.com/img/touxiang.jpeg"
})

// 默认选中的菜单项
const menuActive = ref("/")


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