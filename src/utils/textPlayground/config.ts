import type {
    AcrosticSettings,
    AcrosticStyle,
    DanmakuColorMode,
    DanmakuSettings,
    DanmakuSpeed,
    QuoteKind,
    QuoteSettings,
    QuoteTone,
    TextOption,
    TransformOperation,
    TransformSettings
} from '@/types/textPlayground'

export const MAX_ACROSTIC_HEADS = 16
export const MAX_ACROSTIC_COUNT = 8
export const MAX_QUOTE_COUNT = 80
export const MAX_DANMAKU_LINES = 120

export const ACROSTIC_STYLE_OPTIONS: Array<TextOption<AcrosticStyle>> = [
    {label: '古风', value: 'classical', description: '偏诗意、祝词和意象'},
    {label: '祝福', value: 'blessing', description: '生日、节日和仪式感'},
    {label: '彩虹屁', value: 'rainbow', description: '高密度夸夸语气'},
    {label: '毒鸡汤', value: 'dark', description: '轻微丧感和自嘲'},
    {label: '摸鱼', value: 'workday', description: '职场玩梗和松弛感'}
]

export const QUOTE_KIND_OPTIONS: Array<TextOption<QuoteKind>> = [
    {label: '彩虹屁', value: 'rainbow', description: '夸人、夸事、夸状态'},
    {label: '毒鸡汤', value: 'dark', description: '清醒、丧感、反内卷'},
    {label: '废话文学', value: 'nonsense', description: '听起来很有道理'},
    {label: '摸鱼宣言', value: 'workday', description: '上班、加班、工位文学'},
    {label: '朋友圈文案', value: 'social', description: '适合分行和签名'},
    {label: '社死文案', value: 'awkward', description: '尴尬但好笑'}
]

export const QUOTE_TONE_OPTIONS: Array<TextOption<QuoteTone>> = [
    {label: '轻一点', value: 'soft'},
    {label: '正常', value: 'normal'},
    {label: '拉满', value: 'strong'}
]

export const TRANSFORM_OPERATION_OPTIONS: Array<TextOption<TransformOperation>> = [
    {label: '火星文', value: 'mars', description: '异体字、符号和混排效果'},
    {label: '反犬文', value: 'anti-dog', description: '倒序 + 抽象异体替换'},
    {label: '整段倒序', value: 'reverse-chars', description: '按字符反转整段文本'},
    {label: '行序倒置', value: 'reverse-lines', description: '保留每行内容，倒置行顺序'},
    {label: '词序倒置', value: 'reverse-words', description: '按空白分词后反转'},
    {label: '字间留白', value: 'spaced', description: '朋友圈/弹幕式拉开字距'}
]

export const DANMAKU_SPEED_OPTIONS: Array<TextOption<DanmakuSpeed>> = [
    {label: '慢速', value: 'slow'},
    {label: '正常', value: 'normal'},
    {label: '快速', value: 'fast'}
]

export const DANMAKU_COLOR_OPTIONS: Array<TextOption<DanmakuColorMode>> = [
    {label: '经典白字', value: 'classic'},
    {label: '彩色轮换', value: 'rainbow'},
    {label: '高对比', value: 'contrast'}
]

export const createDefaultAcrosticSettings = (): AcrosticSettings => ({
    heads: '',
    topic: '快乐生活',
    style: 'classical',
    lineLength: 7,
    count: 3,
    rhyme: true
})

export const createDefaultQuoteSettings = (): QuoteSettings => ({
    kind: 'rainbow',
    tone: 'normal',
    count: 12,
    emoji: true,
    rhyme: false
})

export const createDefaultTransformSettings = (): TransformSettings => ({
    operation: 'mars',
    symbolLevel: 2,
    keepLineBreaks: true
})

export const createDefaultDanmakuSettings = (): DanmakuSettings => ({
    sourceText: [
        '欢迎来到文字游戏工坊',
        '这条弹幕在本地浏览器里飞',
        '输入多行文本就能变成滚动屏',
        '适合投屏、整活和活动暖场'
    ].join('\n'),
    speed: 'normal',
    fontSize: 26,
    density: 6,
    colorMode: 'rainbow',
    shuffle: false,
    loop: true
})
