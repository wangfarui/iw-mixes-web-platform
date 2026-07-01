import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { Brush, ChatDotRound, Connection, DataLine, DocumentCopy, Location, MagicStick, Memo, Operation, Picture, Switch } from '@element-plus/icons-vue'

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
        path: 'encoding-converter',
        routePath: '/tools/encoding-converter',
        routeName: '编码转换工具',
        title: '编码转换工具',
        menuTitle: '编码转换',
        description: '本地完成 URL、Base64、Unicode、HTML、Hex 和 Hash 转换，支持自动识别推荐。',
        category: 'work',
        scenarios: ['接口调试', '日志排查', '参数解码', '摘要校验', '编码异常分析'],
        tags: ['本地处理', '不上传', 'MD5'],
        keywords: ['encode', 'decode', 'url', 'base64', 'unicode', 'html', 'hex', 'hash', 'md5', 'sha', '编码', '解码'],
        icon: Switch,
        component: () => import('@/views/encoding-converter/EncodingConverterTool.vue')
    },
    {
        path: 'image-processor',
        routePath: '/tools/image-processor',
        routeName: '图片处理工具',
        title: '图片处理工具',
        menuTitle: '图片处理',
        description: '本地完成图片压缩、ASCII 字符画、证件照换底色和像素风生成。',
        category: 'creative',
        scenarios: ['图片压缩', '字符画生成', '证件照底色处理', '像素风头像'],
        tags: ['本地处理', '不上传', 'Canvas'],
        keywords: ['image', 'compress', 'ascii', 'photo', 'pixel', '图片', '压缩', '证件照', '换底色', '像素风'],
        icon: Picture,
        component: () => import('@/views/image-processor/ImageProcessorTool.vue')
    },
    {
        path: 'document-converter',
        routePath: '/tools/document-converter',
        routeName: '文档转换工具',
        title: '文档转换工具',
        menuTitle: '文档转换',
        description: '本地处理 Word、Excel、PPT、PDF、文本和图片，支持提取、转换、拆分、合并和打包下载。',
        category: 'work',
        scenarios: ['文档转文本', '表格转 JSON/CSV', 'PDF 拆分合并', 'PPT 大纲提取', '图片转 PDF'],
        tags: ['本地处理', '不上传', 'Worker'],
        keywords: ['document', 'converter', 'word', 'excel', 'ppt', 'pdf', 'docx', 'xlsx', 'pptx', 'csv', '文档', '转换', '拆分', '合并'],
        icon: Memo,
        component: () => import('@/views/document-converter/DocumentConverterTool.vue')
    },
    {
        path: 'color-picker',
        routePath: '/tools/color-picker',
        routeName: '颜色选择工具',
        title: '颜色选择工具',
        menuTitle: '颜色选择',
        description: '选择、解析和转换颜色，支持 CSS 色值、可读性检查和本地图片像素取色。',
        category: 'creative',
        scenarios: ['UI 配色', 'CSS 调试', '图片取色', '设计稿还原', '颜色格式转换'],
        tags: ['本地处理', '不上传', 'Canvas'],
        keywords: ['color', 'picker', 'hex', 'rgb', 'rgba', 'hsl', 'cmyk', 'css', 'pixel', '颜色', '取色', '像素'],
        icon: Brush,
        component: () => import('@/views/color-picker/ColorPickerTool.vue')
    },
    {
        path: 'text-playground',
        routePath: '/tools/text-playground',
        routeName: '文字游戏工坊',
        title: '文字游戏工坊',
        menuTitle: '文字游戏',
        description: '生成藏头诗、随机语录、火星文/反犬文转换和弹幕滚动屏。',
        category: 'creative',
        scenarios: ['藏头诗', '彩虹屁', '毒鸡汤', '火星文', '弹幕投屏'],
        tags: ['本地生成', '不上传'],
        keywords: ['text', 'playground', 'poem', 'quote', 'mars', 'danmaku', '藏头诗', '彩虹屁', '毒鸡汤', '火星文', '反犬文', '弹幕'],
        icon: ChatDotRound,
        component: () => import('@/views/text-playground/TextPlaygroundTool.vue')
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
    },
    {
        path: 'network-diagnostics',
        routePath: '/tools/network-diagnostics',
        routeName: '网络诊断',
        title: '网络诊断',
        menuTitle: '网络诊断',
        description: '从 IW 外部服务视角检查公网目标的延迟、DNS记录和HTTP响应头。',
        category: 'work',
        scenarios: ['网络排查', '域名解析', '响应头检查', '接口联调', '连通性测试'],
        tags: ['公开接口', '限流保护', '不保存历史'],
        keywords: ['network', 'ping', 'dns', 'header', 'http', 'latency', '网络诊断', '延迟', '响应头', '连通性'],
        icon: Connection,
        component: () => import('@/views/network-diagnostics/NetworkDiagnosticsTool.vue')
    }
]
