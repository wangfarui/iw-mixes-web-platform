import type {
    AcrosticSettings,
    AcrosticStyle,
    DanmakuColorMode,
    DanmakuSettings,
    DanmakuSpeed,
    HomophoneScene,
    HomophoneSettings,
    QuoteKind,
    QuoteSettings,
    QuoteTone,
    SocialCopyLength,
    SocialCopyMood,
    SocialCopySettings,
    TextOption,
    ToneRewriteMode,
    ToneRewriteSettings,
    TransformOperation,
    TransformSettings
} from '@/types/textPlayground'

export const MAX_ACROSTIC_HEADS = 16
export const MAX_ACROSTIC_COUNT = 8
export const MAX_QUOTE_COUNT = 80
export const MAX_DANMAKU_LINES = 120
export const MAX_HOMOPHONE_COUNT = 24
export const MAX_SOCIAL_COPY_COUNT = 24
export const MAX_TONE_REWRITE_COUNT = 16

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

export const HOMOPHONE_SCENE_OPTIONS: Array<TextOption<HomophoneScene>> = [
    {label: '日常聊天', value: 'daily', description: '轻松、接话和冷笑话'},
    {label: '职场摸鱼', value: 'workday', description: '会议、工位和下班梗'},
    {label: '恋爱暧昧', value: 'love', description: '甜一点但不油腻'},
    {label: '节日祝福', value: 'festival', description: '生日、节日和仪式感'},
    {label: '社交配文', value: 'social', description: '适合朋友圈和签名'}
]

export const SOCIAL_COPY_MOOD_OPTIONS: Array<TextOption<SocialCopyMood>> = [
    {label: '清爽日常', value: 'clean', description: '干净、短句和留白'},
    {label: '治愈松弛', value: 'healing', description: '温柔、慢下来和小确幸'},
    {label: '轻松好笑', value: 'funny', description: '自嘲、反差和小包袱'},
    {label: '微微 emo', value: 'emo', description: '克制低落，不沉重'},
    {label: '班味文学', value: 'workday', description: '上班、下班和摸鱼'}
]

export const SOCIAL_COPY_LENGTH_OPTIONS: Array<TextOption<SocialCopyLength>> = [
    {label: '短句', value: 'short'},
    {label: '两三句', value: 'medium'}
]

export const TONE_REWRITE_MODE_OPTIONS: Array<TextOption<ToneRewriteMode>> = [
    {label: '夸夸', value: 'praise', description: '真诚、明亮和正反馈'},
    {label: '阴阳怪气', value: 'sarcasm', description: '轻度反讽，不做人身攻击'},
    {label: '先夸后吐槽', value: 'balanced', description: '保留善意，带一点玩梗'}
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

export const createDefaultHomophoneSettings = (): HomophoneSettings => ({
    keyword: '快乐',
    scene: 'daily',
    count: 8
})

export const createDefaultSocialCopySettings = (): SocialCopySettings => ({
    topic: '今天也想好好生活',
    mood: 'clean',
    length: 'short',
    count: 6,
    emoji: true
})

export const createDefaultToneRewriteSettings = (): ToneRewriteSettings => ({
    sourceText: '今天的状态还不错',
    mode: 'praise',
    count: 5
})
