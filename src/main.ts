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
import { reportToolUsage } from '@/services/toolUsageReporter'
import authSession from '@/services/authSession'
import {takePostLoginTarget} from '@/router/auth'
// @ts-ignore
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

const app = createApp(App)

router.beforeEach((to, _from, next) => {
    if (to.meta.public === true) {
        // 版本轮询只在需要登录的业务页面运行。
        versionPollingService.stopVersionPolling();
        next();
        return;
    }

    const hasToken = Boolean(authSession.getToken())
    if (to.path === '/login') {
        versionPollingService.stopVersionPolling();
        if (hasToken) {
            next(takePostLoginTarget(router));
        } else {
            next();
        }
        return;
    }

    if (hasToken) {
        //说明用户已经登录
        // 检查并启动版本号轮询
        if (!versionPollingService.isPollingActive()) {
            versionPollingService.startVersionPolling();
            refreshDictCache();
        }
        next();
    } else {
        versionPollingService.stopVersionPolling();
        authSession.rememberReturnPath(to.fullPath)
        next({path: '/login', replace: true});
    }
})

router.afterEach((to, _from, failure) => {
    if (failure) {
        return;
    }

    const pageTitle = typeof to.meta.title === 'string' ? to.meta.title.trim() : ''
    const titleSuffix = to.matched.some((route) => route.meta.toolRoot === true) ? '工具箱' : 'IW'
    document.title = pageTitle ? `${pageTitle} | ${titleSuffix}` : titleSuffix

    const toolKey = to.meta.toolKey
    if (typeof toolKey === 'string') {
        void reportToolUsage(toolKey)
    }
})

app.use(createPinia())
app.use(router)
app.use(ElementPlus, {locale: zhCn})
app.component('SvgIcon', SvgIcon)

app.mount('#app')
