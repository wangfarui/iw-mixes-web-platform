import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { DocumentCopy, MagicStick, Operation } from '@element-plus/icons-vue'

type ToolRouteComponent = NonNullable<RouteRecordRaw['component']>

export interface ToolCatalogItem {
    path: string
    routePath: string
    routeName: string
    title: string
    menuTitle: string
    description: string
    tags: string[]
    icon: Component
    component: ToolRouteComponent
}

export const toolCatalog: ToolCatalogItem[] = [
    {
        path: 'text-diff',
        routePath: '/tools/text-diff',
        routeName: '文本比对',
        title: '文本比对 / Diff 工具',
        menuTitle: '文本比对',
        description: '对比文本或文件内容差异，支持预处理、分屏查看和本地历史。',
        tags: ['本地处理', '不上传'],
        icon: DocumentCopy,
        component: () => import('@/views/text-diff/TextDiffTool.vue')
    },
    {
        path: 'number-generator',
        routePath: '/tools/number-generator',
        routeName: '编号生成器',
        title: '编号生成器',
        menuTitle: '编号生成器',
        description: '生成自定义编号、测试编号和身份证校验类测试数据。',
        tags: ['本地生成', '不上传'],
        icon: Operation,
        component: () => import('@/views/number-generator/NumberGeneratorTool.vue')
    },
    {
        path: 'formatter',
        routePath: '/tools/formatter',
        routeName: '格式化工具',
        title: '格式化工具',
        menuTitle: '格式化工具',
        description: '格式化、压缩、校验和转换 JSON、XML、SQL、Properties、YAML、HTML、CSS、JavaScript、Markdown。',
        tags: ['本地处理', '不上传'],
        icon: MagicStick,
        component: () => import('@/views/formatter/FormatterTool.vue')
    }
]
