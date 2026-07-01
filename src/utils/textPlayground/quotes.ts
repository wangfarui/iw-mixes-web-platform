import type {
    QuoteKind,
    QuoteSettings,
    QuoteTone,
    TextPlaygroundRecord
} from '@/types/textPlayground'
import {
    MAX_QUOTE_COUNT,
    QUOTE_KIND_OPTIONS,
    QUOTE_TONE_OPTIONS
} from './config'
import {
    makeTextId,
    pickOne
} from './random'

interface QuoteRecipe {
    subjects: string[]
    verbs: string[]
    endings: string[]
    emojis: string[]
}

const quoteRecipes: Record<QuoteKind, QuoteRecipe> = {
    rainbow: {
        subjects: ['你', '今天的你', '这个想法', '这份状态', '你的执行力', '你的审美'],
        verbs: ['像开了柔光一样', '正在稳定发光', '值得被认真偏爱', '已经赢在气质里', '把普通日子变高级', '让空气都变明亮'],
        endings: ['不用证明，存在本身就很有说服力', '路过的人都该停下来夸一句', '连沉默都像精心排版过', '这不是优秀，是优秀本身'],
        emojis: ['✨', '🌈', '💫', '⭐', '👏']
    },
    dark: {
        subjects: ['生活', '成年人', '今天', '努力', '计划', '清醒'],
        verbs: ['偶尔会假装看不见你', '不是没有答案，只是答案也在加班', '像一杯忘了放糖的咖啡', '能解决问题，也能制造问题', '很贵，尤其是情绪稳定', '是一种体力活'],
        endings: ['但至少你还会笑出声', '先别慌，慌也要排队', '没关系，崩溃也算一种刷新', '能躺平的时候不要浪费天赋'],
        emojis: ['🫠', '☕', '🧊', '🕳️', '🙃']
    },
    nonsense: {
        subjects: ['众所周知', '从某种意义上讲', '如果事情没有结束', '当你开始思考', '问题的关键', '真正重要的事情'],
        verbs: ['它就还没有结束', '往往说明你正在思考', '其实就是问题本身', '通常出现在它出现的时候', '不在于重要，而在于它是事情', '需要被认真地不认真对待'],
        endings: ['所以这句话说完了', '这就是语言的魅力', '你看，逻辑已经闭环', '听懂的人都懂'],
        emojis: ['📌', '🌀', '🧠', '📝', '🤔']
    },
    workday: {
        subjects: ['工位', '键盘', '会议', '咖啡', '摸鱼', '下班'],
        verbs: ['见证了太多沉默的努力', '正在替我保持生产力', '如果能短一点就更有价值', '是今日续航的核心资产', '不是偷懒，是系统降温', '是一种可持续愿景'],
        endings: ['先把状态调到省电模式', '认真工作，也认真等下班', '今日目标：优雅地完成必要动作', '别问，问就是在构思'],
        emojis: ['💼', '⌨️', '☕', '🕶️', '🗓️']
    },
    social: {
        subjects: ['风', '日落', '今天', '心情', '城市', '晚霞'],
        verbs: ['把普通瞬间吹成了故事', '很会替人整理情绪', '适合慢慢发生', '需要一点留白', '藏着刚刚好的光', '没有答案也很漂亮'],
        endings: ['把日子过成自己喜欢的版本', '不用太满，刚好就好', '愿所有赶路都有风景', '轻轻记录一下'],
        emojis: ['🌙', '🌆', '🍃', '📷', '🫧']
    },
    awkward: {
        subjects: ['我', '社交场合', '沉默', '尴尬', '眼神交流', '自我介绍'],
        verbs: ['总能精准踩中空气里的暂停键', '像突然断网的智能设备', '正在努力假装自己很自然', '已经开始自动播放回忆杀', '短暂上线，然后立刻下线', '让脚趾拥有了建筑梦想'],
        endings: ['没事，至少气氛很有记忆点', '只要我不尴尬，尴尬就会加倍', '今天也是社交技能冷却中', '笑一下，系统正在重启'],
        emojis: ['😳', '🫥', '🧍', '🫣', '🙈']
    }
}

const tonePrefixMap: Record<QuoteTone, string[]> = {
    soft: ['轻轻说一句：', '小声但认真地说：', '不夸张地讲：'],
    normal: ['', '讲真的，', '此处应该认真宣布：'],
    strong: ['必须大声宣布：', '全场注意：', '这不是演习：']
}

const toneSuffixMap: Record<QuoteTone, string[]> = {
    soft: ['。', '，刚刚好。', '，不用太用力。'],
    normal: ['。', '，这很合理。', '，确实如此。'],
    strong: ['！', '，我说完了！', '，请立刻鼓掌！']
}

const rhymeTails = ['呀', '啦', '吧', '哇']

const normalizeCount = (count: number): number => {
    return Math.min(MAX_QUOTE_COUNT, Math.max(1, Math.trunc(Number(count) || 1)))
}

export const getQuoteKindLabel = (kind: QuoteKind): string => {
    return QUOTE_KIND_OPTIONS.find((item) => item.value === kind)?.label || kind
}

export const getQuoteToneLabel = (tone: QuoteTone): string => {
    return QUOTE_TONE_OPTIONS.find((item) => item.value === tone)?.label || tone
}

const buildQuote = (settings: QuoteSettings, index: number): string => {
    const recipe = quoteRecipes[settings.kind]
    const prefix = pickOne(tonePrefixMap[settings.tone])
    const subject = pickOne(recipe.subjects)
    const verb = pickOne(recipe.verbs)
    const ending = pickOne(recipe.endings)
    const suffix = settings.rhyme ? rhymeTails[index % rhymeTails.length] : pickOne(toneSuffixMap[settings.tone])
    const emoji = settings.emoji ? ` ${pickOne(recipe.emojis)}` : ''

    return `${prefix}${subject}${verb}，${ending}${suffix}${emoji}`.replace(/^，/, '')
}

export const generateQuoteRecords = (settings: QuoteSettings): TextPlaygroundRecord[] => {
    const count = normalizeCount(settings.count)
    const kindLabel = getQuoteKindLabel(settings.kind)
    const toneLabel = getQuoteToneLabel(settings.tone)
    const createdAt = new Date().toISOString()

    return Array.from({length: count}, (_, index) => ({
        id: makeTextId('quote', index + 1),
        index: index + 1,
        mode: 'quote',
        label: kindLabel,
        title: `${kindLabel} ${index + 1}`,
        content: buildQuote(settings, index),
        meta: [
            toneLabel,
            settings.emoji ? '带 emoji' : '无 emoji',
            settings.rhyme ? '语气尾韵' : '自然句尾'
        ],
        createdAt
    }))
}
