import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { DataLine, DocumentCopy, Location, MagicStick, Operation } from '@element-plus/icons-vue'

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
        path: 'calculator',
        routePath: '/tools/calculator',
        routeName: '全能计算器',
        title: '全能计算器',
        menuTitle: '全能计算器',
        description: '计算表达式、贷款月供、年终奖个税、单位和汇率换算。',
        tags: ['本地计算', '不上传'],
        icon: DataLine,
        component: () => import('@/views/calculator/CalculatorTool.vue')
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
    },
    {
        path: 'ip-lookup',
        routePath: '/tools/ip-lookup',
        routeName: 'IP地址解析',
        title: 'IP 地址解析',
        menuTitle: 'IP 地址解析',
        description: '查询当前公网 IP，或解析公网 IP、域名、URL Host 的 DNS 与定位信息。',
        tags: ['公开接口', '本地历史'],
        icon: Location,
        component: () => import('@/views/ip-lookup/IpLookupTool.vue')
    }
]
