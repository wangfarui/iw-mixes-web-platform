import type {
    HomophoneScene,
    HomophoneSettings,
    SocialCopyMood,
    SocialCopySettings,
    TextPlaygroundRecord,
    ToneRewriteMode,
    ToneRewriteSettings
} from '@/types/textPlayground'
import {
    HOMOPHONE_SCENE_OPTIONS,
    MAX_HOMOPHONE_COUNT,
    MAX_SOCIAL_COPY_COUNT,
    MAX_TONE_REWRITE_COUNT,
    SOCIAL_COPY_LENGTH_OPTIONS,
    SOCIAL_COPY_MOOD_OPTIONS,
    TONE_REWRITE_MODE_OPTIONS
} from './config'
import {
    limitTextLength,
    makeTextId,
    normalizeText,
    pickOne,
    splitChars
} from './random'

const homophoneCharMap: Record<string, string> = {
    爱: '碍',
    安: '按',
    班: '斑',
    财: '才',
    春: '村',
    风: '疯',
    福: '服',
    富: '付',
    工: '公',
    好: '号',
    花: '话',
    欢: '换',
    会: '惠',
    火: '伙',
    家: '加',
    快: '筷',
    乐: '勒',
    美: '没',
    梦: '懵',
    朋: '蓬',
    钱: '前',
    轻: '青',
    秋: '球',
    上: '尚',
    诗: '湿',
    松: '送',
    甜: '填',
    晚: '碗',
    喜: '洗',
    下: '夏',
    笑: '校',
    心: '新',
    星: '新',
    幸: '杏',
    鱼: '余',
    月: '越',
    早: '找'
}

const homophoneSceneLabels: Record<HomophoneScene, string> = {
    daily: '日常聊天',
    workday: '职场摸鱼',
    love: '恋爱暧昧',
    festival: '节日祝福',
    social: '社交配文'
}

const homophoneTemplates: Record<HomophoneScene, Array<(keyword: string, nearSound: string) => string>> = {
    daily: [
        (keyword, nearSound) => `今天主打一个${keyword}，不${nearSound}都不行。`,
        (keyword, nearSound) => `别问为什么${keyword}，问就是${nearSound}在召唤。`,
        (keyword, nearSound) => `${keyword}这件事，我已经${nearSound}定了。`
    ],
    workday: [
        (keyword, nearSound) => `上班可以不${keyword}，但不能不${nearSound}鱼。`,
        (keyword, nearSound) => `工位需要${keyword}，简称${nearSound}位续命。`,
        (keyword, nearSound) => `会议不一定有用，${keyword}一定${nearSound}用。`
    ],
    love: [
        (keyword, nearSound) => `不是突然${keyword}，是对你${nearSound}来已久。`,
        (keyword, nearSound) => `想把${keyword}寄给你，快递名叫${nearSound}递。`,
        (keyword, nearSound) => `你一出现，${keyword}就变成了${nearSound}定。`
    ],
    festival: [
        (keyword, nearSound) => `祝你${keyword}常在，烦恼全部${nearSound}走。`,
        (keyword, nearSound) => `今天送你一份${keyword}，保质期叫${nearSound}远。`,
        (keyword, nearSound) => `节日要有${keyword}，也要有${nearSound}气。`
    ],
    social: [
        (keyword, nearSound) => `把${keyword}拍进今天，滤镜叫${nearSound}好。`,
        (keyword, nearSound) => `${keyword}不止在照片里，也在${nearSound}间里。`,
        (keyword, nearSound) => `今日关键词：${keyword}，今日近音词：${nearSound}。`
    ]
}

const socialMoodLabels: Record<SocialCopyMood, string> = {
    clean: '清爽日常',
    healing: '治愈松弛',
    funny: '轻松好笑',
    emo: '微微 emo',
    workday: '班味文学'
}

const socialLengthLabels = {
    short: '短句',
    medium: '两三句'
}

const socialCopyRecipes: Record<SocialCopyMood, { short: string[]; medium: string[]; emojis: string[] }> = {
    clean: {
        short: ['把{topic}轻轻放进今天。', '{topic}，刚刚好。', '今天的重点，是认真路过{topic}。'],
        medium: ['{topic}。\n不用太满，留一点空白给风。', '把{topic}收进相册。\n日子普通，也有自己的光。'],
        emojis: ['📷', '🍃', '✨']
    },
    healing: {
        short: ['慢慢来，{topic}也会开花。', '{topic}，是今天的小确幸。', '把心放软一点，和{topic}并肩。'],
        medium: ['{topic}。\n今天不赶路，只和自己好好相处。', '愿{topic}被温柔接住。\n也愿疲惫有地方停靠。'],
        emojis: ['🌿', '🫧', '🌙']
    },
    funny: {
        short: ['关于{topic}，我先笑为敬。', '{topic}这事，主打一个离谱但合理。', '今天和{topic}互相放过。'],
        medium: ['{topic}。\n看似平静，其实内心正在加载表情包。', '本来想认真面对{topic}。\n后来发现，先吃点东西更重要。'],
        emojis: ['😎', '🫠', '🤏']
    },
    emo: {
        short: ['{topic}，风一吹就散了一点。', '后来才懂，{topic}也需要沉默。', '{topic}，不说破也没关系。'],
        medium: ['{topic}。\n有些心情不用解释，夜色会替我收好。', '把{topic}留在今天。\n明天醒来，再做一个轻一点的人。'],
        emojis: ['🌧️', '🕯️', '🌌']
    },
    workday: {
        short: ['{topic}，工位限定版。', '今天的{topic}，由咖啡友情赞助。', '等下班的时候，顺便想了想{topic}。'],
        medium: ['{topic}。\n认真工作，也认真等下班。', '关于{topic}，先同步一下：人在工位，心在省电。'],
        emojis: ['☕', '💼', '🗓️']
    }
}

const toneRewriteLabels: Record<ToneRewriteMode, string> = {
    praise: '夸夸',
    sarcasm: '阴阳怪气',
    balanced: '先夸后吐槽'
}

const toneRewriteTemplates: Record<ToneRewriteMode, Array<(source: string) => string>> = {
    praise: [
        (source) => `能把「${source}」表达得这么自然，状态真的很在线。`,
        (source) => `「${source}」这句话有一种稳定发光的认真感。`,
        (source) => `我愿称「${source}」为今天很会生活的证据。`
    ],
    sarcasm: [
        (source) => `「${source}」说得真轻巧，连空气都学会配合了。`,
        (source) => `能把「${source}」讲得这么从容，确实很有节目效果。`,
        (source) => `「${source}」这份淡定，建议直接申报非遗。`
    ],
    balanced: [
        (source) => `「${source}」很有态度，就是再稳一点会更像主角。`,
        (source) => `先夸一句「${source}」够真诚，再提醒一句别太上头。`,
        (source) => `「${source}」挺好，唯一的问题是有点好得过于明显。`
    ]
}

const normalizeCount = (count: number, max: number): number => {
    return Math.min(max, Math.max(1, Math.trunc(Number(count) || 1)))
}

const createNearSound = (keyword: string): string => {
    const chars = splitChars(keyword)
    const nearSound = chars.map((item) => homophoneCharMap[item] || item).join('')

    if (nearSound !== keyword) {
        return nearSound
    }

    return `${keyword}音`
}

const interpolateTopic = (template: string, topic: string): string => {
    return template.replace(/\{topic}/g, topic)
}

const createRecord = (
    prefix: string,
    mode: TextPlaygroundRecord['mode'],
    label: string,
    content: string,
    index: number,
    meta: string[]
): TextPlaygroundRecord => ({
    id: makeTextId(prefix, index),
    index,
    mode,
    label,
    title: `${label} ${index}`,
    content,
    meta,
    createdAt: new Date().toISOString()
})

export const getHomophoneSceneLabel = (scene: HomophoneScene): string => {
    return HOMOPHONE_SCENE_OPTIONS.find((item) => item.value === scene)?.label || homophoneSceneLabels[scene] || scene
}

export const getSocialCopyMoodLabel = (mood: SocialCopyMood): string => {
    return SOCIAL_COPY_MOOD_OPTIONS.find((item) => item.value === mood)?.label || socialMoodLabels[mood] || mood
}

export const getSocialCopyLengthLabel = (length: SocialCopySettings['length']): string => {
    return SOCIAL_COPY_LENGTH_OPTIONS.find((item) => item.value === length)?.label || socialLengthLabels[length] || length
}

export const getToneRewriteModeLabel = (mode: ToneRewriteMode): string => {
    return TONE_REWRITE_MODE_OPTIONS.find((item) => item.value === mode)?.label || toneRewriteLabels[mode] || mode
}

export const generateHomophoneRecords = (settings: HomophoneSettings): TextPlaygroundRecord[] => {
    const keyword = limitTextLength(normalizeText(settings.keyword || '快乐'), 12)
    const count = normalizeCount(settings.count, MAX_HOMOPHONE_COUNT)
    const sceneLabel = getHomophoneSceneLabel(settings.scene)
    const nearSound = createNearSound(keyword)
    const templates = homophoneTemplates[settings.scene] || homophoneTemplates.daily

    return Array.from({length: count}, (_, itemIndex) => {
        const index = itemIndex + 1
        const template = templates[itemIndex % templates.length]
        return createRecord(
            'homophone',
            'homophone',
            '谐音梗',
            template(keyword, nearSound),
            index,
            [`关键词：${keyword}`, `近音：${nearSound}`, sceneLabel]
        )
    })
}

export const generateSocialCopyRecords = (settings: SocialCopySettings): TextPlaygroundRecord[] => {
    const topic = limitTextLength(normalizeText(settings.topic || '今天也想好好生活'), 36)
    const count = normalizeCount(settings.count, MAX_SOCIAL_COPY_COUNT)
    const moodLabel = getSocialCopyMoodLabel(settings.mood)
    const lengthLabel = getSocialCopyLengthLabel(settings.length)
    const recipe = socialCopyRecipes[settings.mood] || socialCopyRecipes.clean
    const templates = recipe[settings.length]

    return Array.from({length: count}, (_, itemIndex) => {
        const index = itemIndex + 1
        const text = interpolateTopic(templates[itemIndex % templates.length], topic)
        const emoji = settings.emoji ? ` ${pickOne(recipe.emojis)}` : ''

        return createRecord(
            'social-copy',
            'social-copy',
            '朋友圈文案',
            `${text}${emoji}`,
            index,
            [moodLabel, lengthLabel, settings.emoji ? '带 emoji' : '无 emoji']
        )
    })
}

export const generateToneRewriteRecords = (settings: ToneRewriteSettings): TextPlaygroundRecord[] => {
    const sourceText = limitTextLength(normalizeText(settings.sourceText || '今天的状态还不错'), 30)
    const count = normalizeCount(settings.count, MAX_TONE_REWRITE_COUNT)
    const modeLabel = getToneRewriteModeLabel(settings.mode)
    const templates = toneRewriteTemplates[settings.mode] || toneRewriteTemplates.praise

    return Array.from({length: count}, (_, itemIndex) => {
        const index = itemIndex + 1

        return createRecord(
            'tone-rewrite',
            'tone-rewrite',
            '语气改写',
            templates[itemIndex % templates.length](sourceText),
            index,
            [`原文：${sourceText}`, modeLabel]
        )
    })
}
