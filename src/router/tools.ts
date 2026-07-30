import type { RouteRecordRaw } from 'vue-router'
import { toolCatalog } from '@/router/toolCatalog'

export const toolRoutes: RouteRecordRaw = {
    path: '/tools',
    name: '工具箱',
    component: () => import('@/views/tools/ToolsLayout.vue'),
    redirect: '/tools/home',
    meta: {
        public: true,
        toolRoot: true
    },
    children: [
        {
            path: 'home',
            name: '工具箱首页',
            component: () => import('@/views/tools/ToolsHome.vue'),
            meta: {
                public: true,
                title: '首页'
            }
        },
        ...toolCatalog.map((tool): RouteRecordRaw => ({
            path: tool.path,
            name: tool.routeName,
            component: tool.component,
            meta: {
                public: true,
                tool: true,
                toolKey: tool.toolKey,
                title: tool.title
            }
        }))
    ]
}

export default toolRoutes
