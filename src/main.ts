// import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import SvgIcon from '@/components/SvgIcon.vue'

import App from './App.vue'
import router from './router'
import versionPollingService from '@/services/versionPollingService'
import { refreshDictCache } from '@/api/login'
// @ts-ignore
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, {locale: zhCn})
app.component('SvgIcon', SvgIcon)

app.mount('#app')

router.beforeEach((to, from, next) => {
    if (to.path == '/login') {
        //说明要去登录页面，登录页面可以直接去
        //这个就表示继续去下个页面
        next();
        return;
    }
    if (window.sessionStorage.getItem("iwtoken")) {
        //说明用户已经登录
        // 检查并启动版本号轮询
        if (!versionPollingService.isPollingActive()) {
            versionPollingService.startVersionPolling();
            refreshDictCache();
        }
        next();
    } else {
        //说明用户未登录，去登录
        next({path: '/login'});
    }
})