import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { Brush, ChatDotRound, Connection, DataAnalysis, DataLine, DocumentCopy, Location, MagicStick, MapLocation, Memo, Operation, Picture, Switch, TrendCharts } from '@element-plus/icons-vue'

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
    toolKey: string
    routePath: string
    routeName: string
    title: string
    menuTitle: string
    description: string
    category: ToolCategoryKey
    releasedAt: string
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
        path: 'bmi-calculator',
        toolKey: 'bmi-calculator',
        routePath: '/tools/bmi-calculator',
        routeName: 'BMI 计算器',
        title: 'BMI 计算器',
        menuTitle: 'BMI 计算器',
        description: '输入身高和体重，即时计算中国成人 BMI、体重分类和健康体重参考区间。',
        category: 'life',
        releasedAt: '2026-07-24',
        scenarios: ['体重自我评估', '健康体重参考'],
        tags: ['本地计算', '不上传', '成人参考'],
        keywords: ['bmi', '体质指数', '身高', '体重', '健康体重', '肥胖', '超重'],
        icon: DataAnalysis,
        component: () => import('@/views/bmi-calculator/BmiCalculatorTool.vue')
    },
    {
        path: 'text-diff',
        toolKey: 'text-diff',
        routePath: '/tools/text-diff',
        routeName: '文本比对',
        title: '文本比对 / Diff 工具',
        menuTitle: '文本比对',
        description: '对比文本或文件内容差异，支持预处理、分屏查看和本地历史。',
        category: 'work',
        releasedAt: '2026-06-30',
        scenarios: ['代码审查', '文档修订', '日志比对', '配置差异检查'],
        tags: ['本地处理', '不上传'],
        keywords: ['diff', 'compare', 'difference', '文本差异', '文件比对', '日志比对'],
        icon: DocumentCopy,
        component: () => import('@/views/text-diff/TextDiffTool.vue')
    },
    {
        path: 'number-generator',
        toolKey: 'number-generator',
        routePath: '/tools/number-generator',
        routeName: '编号生成器',
        title: '编号生成器',
        menuTitle: '编号生成器',
        description: '生成自定义编号、测试编号和身份证校验类测试数据。',
        category: 'work',
        releasedAt: '2026-06-30',
        scenarios: ['测试数据准备', '业务编号生成', '批量编号整理'],
        tags: ['本地生成', '不上传'],
        keywords: ['number', 'id', 'uuid', 'mock', '测试数据', '身份证', '序列号'],
        icon: Operation,
        component: () => import('@/views/number-generator/NumberGeneratorTool.vue')
    },
    {
        path: 'address-generator',
        toolKey: 'address-generator',
        routePath: '/tools/address-generator',
        routeName: '地址生成器',
        title: '地址生成器',
        menuTitle: '地址生成器',
        description: '生成一条全球用户测试资料和地址信息，支持复制、导出和浏览器本地保存。',
        category: 'work',
        releasedAt: '2026-07-06',
        scenarios: ['接口联调', '表单测试', '导入模板准备', 'Demo 用户资料'],
        tags: ['本地生成', '本地保存', '不上传'],
        keywords: ['address', 'profile', 'faker', 'mock', 'user', 'global', '地址', '用户资料', '测试资料', '本地保存'],
        icon: MapLocation,
        component: () => import('@/views/address-generator/AddressGeneratorTool.vue')
    },
    {
        path: 'calculator',
        toolKey: 'calculator',
        routePath: '/tools/calculator',
        routeName: '全能计算器',
        title: '全能计算器',
        menuTitle: '全能计算器',
        description: '计算表达式、贷款月供、年终奖个税、单位和汇率换算。',
        category: 'life',
        releasedAt: '2026-07-01',
        scenarios: ['日常计算', '贷款估算', '个税估算', '单位换算', '汇率换算'],
        tags: ['本地计算', '不上传'],
        keywords: ['calculator', 'loan', 'tax', 'currency', 'unit', '表达式', '房贷', '车贷', '个税', '汇率'],
        icon: DataLine,
        component: () => import('@/views/calculator/CalculatorTool.vue')
    },
    {
        path: 'stock-tracker',
        toolKey: 'stock-tracker',
        routePath: '/tools/stock-tracker',
        routeName: '股票跟踪',
        title: '股票跟踪',
        menuTitle: '股票跟踪',
        description: '跟踪沪深A股自选列表，查看最新行情、K线、成交量和均线。',
        category: 'life',
        releasedAt: '2026-07-02',
        scenarios: ['自选股查看', 'A股行情跟踪', 'K线观察', '本地收藏股票'],
        tags: ['公开行情', '本地自选'],
        keywords: ['stock', 'kline', 'quote', '股票', 'A股', '行情', 'K线', '自选股'],
        icon: TrendCharts,
        component: () => import('@/views/stock-tracker/StockTrackerTool.vue')
    },
    {
        path: 'formatter',
        toolKey: 'formatter',
        routePath: '/tools/formatter',
        routeName: '格式化工具',
        title: '格式化工具',
        menuTitle: '格式化工具',
        description: '格式化、压缩、校验和转换 JSON、XML、SQL、Properties、YAML、HTML、CSS、JavaScript、Markdown。',
        category: 'work',
        releasedAt: '2026-07-01',
        scenarios: ['接口调试', '配置整理', '代码片段格式化', '数据格式转换'],
        tags: ['本地处理', '不上传'],
        keywords: ['format', 'formatter', 'json', 'xml', 'sql', 'yaml', 'html', 'css', 'javascript', 'markdown', '压缩', '校验', '转换'],
        icon: MagicStick,
        component: () => import('@/views/formatter/FormatterTool.vue')
    },
    {
        path: 'encoding-converter',
        toolKey: 'encoding-converter',
        routePath: '/tools/encoding-converter',
        routeName: '编码转换工具',
        title: '编码转换工具',
        menuTitle: '编码转换',
        description: '本地完成 URL、Base64、Unicode、HTML、Hex 和 Hash 转换，支持自动识别推荐。',
        category: 'work',
        releasedAt: '2026-07-01',
        scenarios: ['接口调试', '日志排查', '参数解码', '摘要校验', '编码异常分析'],
        tags: ['本地处理', '不上传', 'MD5'],
        keywords: ['encode', 'decode', 'url', 'base64', 'unicode', 'html', 'hex', 'hash', 'md5', 'sha', '编码', '解码'],
        icon: Switch,
        component: () => import('@/views/encoding-converter/EncodingConverterTool.vue')
    },
    {
        path: 'image-processor',
        toolKey: 'image-processor',
        routePath: '/tools/image-processor',
        routeName: '图片处理工具',
        title: '图片处理工具',
        menuTitle: '图片处理',
        description: '本地完成图片压缩、ASCII 字符画、证件照换底色和像素风生成。',
        category: 'creative',
        releasedAt: '2026-07-17',
        scenarios: ['图片压缩', '字符画生成', '证件照底色处理', '像素风头像'],
        tags: ['本地处理', '不上传', 'Canvas'],
        keywords: ['image', 'compress', 'ascii', 'photo', 'pixel', '图片', '压缩', '证件照', '换底色', '像素风'],
        icon: Picture,
        component: () => import('@/views/image-processor/ImageProcessorTool.vue')
    },
    {
        path: 'document-converter',
        toolKey: 'document-converter',
        routePath: '/tools/document-converter',
        routeName: '文档转换工具',
        title: '文档转换工具',
        menuTitle: '文档转换',
        description: '本地处理 Word、Excel、PPT、PDF、文本和图片，支持提取、转换、拆分、合并和打包下载。',
        category: 'work',
        releasedAt: '2026-07-01',
        scenarios: ['文档转文本', '表格转 JSON/CSV', 'PDF 拆分合并', 'PPT 大纲提取', '图片转 PDF'],
        tags: ['本地处理', '不上传', 'Worker'],
        keywords: ['document', 'converter', 'word', 'excel', 'ppt', 'pdf', 'docx', 'xlsx', 'pptx', 'csv', '文档', '转换', '拆分', '合并'],
        icon: Memo,
        component: () => import('@/views/document-converter/DocumentConverterTool.vue')
    },
    {
        path: 'color-picker',
        toolKey: 'color-picker',
        routePath: '/tools/color-picker',
        routeName: '颜色选择工具',
        title: '颜色选择工具',
        menuTitle: '颜色选择',
        description: '选择、解析和转换颜色，支持 CSS 色值、可读性检查和本地图片像素取色。',
        category: 'creative',
        releasedAt: '2026-07-01',
        scenarios: ['UI 配色', 'CSS 调试', '图片取色', '设计稿还原', '颜色格式转换'],
        tags: ['本地处理', '不上传', 'Canvas'],
        keywords: ['color', 'picker', 'hex', 'rgb', 'rgba', 'hsl', 'cmyk', 'css', 'pixel', '颜色', '取色', '像素'],
        icon: Brush,
        component: () => import('@/views/color-picker/ColorPickerTool.vue')
    },
    {
        path: 'text-playground',
        toolKey: 'text-playground',
        routePath: '/tools/text-playground',
        routeName: '文字游戏工坊',
        title: '文字游戏工坊',
        menuTitle: '文字游戏',
        description: '生成藏头诗、随机语录、火星文/反犬文转换和弹幕滚动屏。',
        category: 'creative',
        releasedAt: '2026-07-01',
        scenarios: ['藏头诗', '彩虹屁', '毒鸡汤', '火星文', '弹幕投屏'],
        tags: ['本地生成', '不上传'],
        keywords: ['text', 'playground', 'poem', 'quote', 'mars', 'danmaku', '藏头诗', '彩虹屁', '毒鸡汤', '火星文', '反犬文', '弹幕'],
        icon: ChatDotRound,
        component: () => import('@/views/text-playground/TextPlaygroundTool.vue')
    },
    {
        path: 'remote-share',
        toolKey: 'remote-share',
        routePath: '/tools/remote-share',
        routeName: '远程共享',
        title: '远程共享',
        menuTitle: '远程共享',
        description: '在两台设备之间端到端加密共享文本、图片和文件；同一 Wi-Fi 优先直连。',
        category: 'work',
        releasedAt: '2026-07-28',
        scenarios: ['远程剪贴板', '图片传递', '文件临时共享'],
        tags: ['端到端加密', '两台设备', '临时存储'],
        keywords: ['remote', 'share', 'clipboard', 'file', 'image', '远程共享', '剪贴板', '文件传输', '图片传输'],
        icon: Connection,
        component: () => import('@/views/remote-share/RemoteShareTool.vue')
    },
    {
        path: 'ip-lookup',
        toolKey: 'ip-lookup',
        routePath: '/tools/ip-lookup',
        routeName: 'IP地址解析',
        title: 'IP 地址解析',
        menuTitle: 'IP 地址解析',
        description: '查询当前公网 IP，或解析公网 IP、域名、URL Host 的 DNS 与定位信息。',
        category: 'work',
        releasedAt: '2026-07-01',
        scenarios: ['网络排查', '域名解析', '公网地址确认', '接口联调'],
        tags: ['公开接口', '本地历史'],
        keywords: ['ip', 'dns', 'domain', 'host', '公网', '域名', '定位', '网络'],
        icon: Location,
        component: () => import('@/views/ip-lookup/IpLookupTool.vue')
    },
    {
        path: 'network-diagnostics',
        toolKey: 'network-diagnostics',
        routePath: '/tools/network-diagnostics',
        routeName: '网络诊断',
        title: '网络诊断',
        menuTitle: '网络诊断',
        description: '从 IW 外部服务视角检查公网目标的延迟、DNS记录和HTTP响应头。',
        category: 'work',
        releasedAt: '2026-07-01',
        scenarios: ['网络排查', '域名解析', '响应头检查', '接口联调', '连通性测试'],
        tags: ['公开接口', '限流保护', '不保存历史'],
        keywords: ['network', 'ping', 'dns', 'header', 'http', 'latency', '网络诊断', '延迟', '响应头', '连通性'],
        icon: Connection,
        component: () => import('@/views/network-diagnostics/NetworkDiagnosticsTool.vue')
    }
]
