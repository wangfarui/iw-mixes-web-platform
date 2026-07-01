import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { DataLine, DocumentCopy, Location, MagicStick, Operation } from '@element-plus/icons-vue'

type ToolRouteComponent = NonNullable<RouteRecordRaw['component']>

export type ToolCategoryKey =
    | 'life'
    | 'work'
    | 'creative'
    | 'learning'

export interface ToolCategoryItem {
    key: ToolCategoryKey
    title: string
}

export interface ToolCatalogItem {
    path: string
    routePath: string
    routeName: string
    title: string
    menuTitle: string
    description: string
    category: ToolCategoryKey
    scenarios: string[]
    tags: string[]
    keywords: string[]
    icon: Component
    component: ToolRouteComponent
}

export const toolCategories: ToolCategoryItem[] = [
    {
        key: 'life',
        title: '生活'
    },
    {
        key: 'work',
        title: '工作'
    },
    {
        key: 'creative',
        title: '创意'
    },
    {
        key: 'learning',
        title: '学习'
    }
]

export const toolCatalog: ToolCatalogItem[] = [
    {
        path: 'text-diff',
        routePath: '/tools/text-diff',
        routeName: '文本比对',
        title: '文本比对 / Diff 工具',
        menuTitle: '文本比对',
        description: '对比文本或文件内容差异，支持预处理、分屏查看和本地历史。',
        category: 'work',
        scenarios: ['代码审查', '文档修订', '日志比对', '配置差异检查'],
        tags: ['本地处理', '不上传'],
        keywords: ['diff', 'compare', 'difference', '文本差异', '文件比对', '日志比对'],
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
        category: 'work',
        scenarios: ['测试数据准备', '业务编号生成', '批量编号整理'],
        tags: ['本地生成', '不上传'],
        keywords: ['number', 'id', 'uuid', 'mock', '测试数据', '身份证', '序列号'],
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
        category: 'life',
        scenarios: ['日常计算', '贷款估算', '个税估算', '单位换算', '汇率换算'],
        tags: ['本地计算', '不上传'],
        keywords: ['calculator', 'loan', 'tax', 'currency', 'unit', '表达式', '房贷', '车贷', '个税', '汇率'],
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
        category: 'work',
        scenarios: ['接口调试', '配置整理', '代码片段格式化', '数据格式转换'],
        tags: ['本地处理', '不上传'],
        keywords: ['format', 'formatter', 'json', 'xml', 'sql', 'yaml', 'html', 'css', 'javascript', 'markdown', '压缩', '校验', '转换'],
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
        category: 'work',
        scenarios: ['网络排查', '域名解析', '公网地址确认', '接口联调'],
        tags: ['公开接口', '本地历史'],
        keywords: ['ip', 'dns', 'domain', 'host', '公网', '域名', '定位', '网络'],
        icon: Location,
        component: () => import('@/views/ip-lookup/IpLookupTool.vue')
    }
]
