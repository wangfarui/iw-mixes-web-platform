import type { RouteRecordRaw } from 'vue-router'

export const toolRoutes: RouteRecordRaw = {
    path: '/tools',
    name: '工具箱',
    component: () => import('@/views/tools/ToolsLayout.vue'),
    redirect: '/tools/text-diff',
    meta: {
        public: true,
        toolRoot: true
    },
    children: [
        {
            path: 'text-diff',
            name: '文本比对',
            component: () => import('@/views/text-diff/TextDiffTool.vue'),
            meta: {
                public: true,
                tool: true,
                title: '文本比对 / Diff 工具'
            }
        }
    ]
}

export default toolRoutes
