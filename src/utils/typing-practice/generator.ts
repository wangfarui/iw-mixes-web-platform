import type {
  TypingCodeLanguage,
  TypingGeneratorConfig,
  TypingTextGenerator
} from '@/types/typingPractice'
import { validateTargetLength } from '@/utils/typing-practice/config'

type RandomSource = () => number

const hashSeed = (seed: string): number => {
  let hash = 2166136261
  for (const character of seed) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const createSeededRandom = (seed: string): RandomSource => {
  let state = hashSeed(seed) || 0x6d2b79f5
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T>(items: readonly T[], random: RandomSource): T => (
  items[Math.floor(random() * items.length)] as T
)

const integer = (minimum: number, maximum: number, random: RandomSource): number => (
  Math.floor(random() * (maximum - minimum + 1)) + minimum
)

const CHINESE_SUBJECTS = ['清晨的微光', '专注的练习者', '安静的书房', '窗外的风', '今天的计划', '耐心的节奏', '清晰的目标', '持续的行动']
const CHINESE_ACTIONS = ['提醒我们', '正在帮助我们', '让人逐渐学会', '值得我们认真体会', '总能带来', '会慢慢形成']
const CHINESE_OBJECTS = ['把注意力放回当下', '用稳定代替匆忙', '从一个小步骤开始', '在错误中找到规律', '保持自然的输入节奏', '把复杂问题拆成简单动作']
const CHINESE_ENDINGS = ['准确往往比速度更重要', '微小的进步也值得记录', '每次修正都会留下经验', '稳定练习会带来可靠的提升', '完成比想象更有力量']
const CHINESE_TRANSITIONS = ['随后', '与此同时', '稍作停顿后', '当手指逐渐熟悉键位时', '在下一次练习里']

const generateChineseBlock = (random: RandomSource): string => (
  `${pick(CHINESE_SUBJECTS, random)}${pick(CHINESE_ACTIONS, random)}${pick(CHINESE_OBJECTS, random)}。`
  + `${pick(CHINESE_TRANSITIONS, random)}，${pick(CHINESE_OBJECTS, random)}，因为${pick(CHINESE_ENDINGS, random)}。`
)

const ENGLISH_SUBJECTS = ['A focused learner', 'The quiet morning', 'A steady rhythm', 'Careful practice', 'The next small step', 'A clear routine']
const ENGLISH_VERBS = ['makes it easier to', 'gives us time to', 'helps every beginner', 'reminds the team to', 'allows the mind to']
const ENGLISH_ACTIONS = ['notice each word', 'correct mistakes calmly', 'build a reliable habit', 'keep a comfortable pace', 'finish one useful task']
const ENGLISH_ENDINGS = ['Accuracy grows before speed', 'Small progress becomes dependable skill', 'A calm start improves the whole session', 'Regular practice makes difficult patterns familiar']

const generateEnglishBlock = (random: RandomSource): string => (
  `${pick(ENGLISH_SUBJECTS, random)} ${pick(ENGLISH_VERBS, random)} ${pick(ENGLISH_ACTIONS, random)}. `
  + `${pick(ENGLISH_ENDINGS, random)}, so we can continue without rushing.`
)

const pad = (value: number, length = 2): string => String(value).padStart(length, '0')

const generateNumberBlock = (random: RandomSource): string => {
  const year = integer(2024, 2035, random)
  const month = integer(1, 12, random)
  const day = integer(1, 28, random)
  const hour = integer(0, 23, random)
  const minute = integer(0, 59, random)
  const amount = `${integer(10, 9999, random)}.${pad(integer(0, 99, random))}`
  const percentage = `${integer(1, 99, random)}.${integer(0, 9, random)}%`
  const ip = `${integer(1, 223, random)}.${integer(0, 255, random)}.${integer(0, 255, random)}.${integer(1, 254, random)}:${integer(1024, 9999, random)}`
  const id = `IW-${year}${pad(month)}${pad(day)}-${pad(integer(1, 9999, random), 4)}`
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)} | ${id} | ¥${amount} | ${percentage} | ${ip}`
}

const CODE_NAMES = ['records', 'scores', 'tasks', 'profiles', 'sessions', 'results']
const CODE_FIELDS = ['createdAt', 'accuracy', 'status', 'userId', 'total', 'name']

const generateJavaScriptBlock = (random: RandomSource): string => {
  const name = pick(CODE_NAMES, random)
  const field = pick(CODE_FIELDS, random)
  const limit = integer(3, 20, random)
  return `const ${name} = await loadData()\n\nconst summary = ${name}\n  .filter((item) => item.${field})\n  .slice(0, ${limit})\n  .map((item) => ({ ...item, selected: false }))\n\nconsole.log(summary)\n`
}

const generateTypeScriptBlock = (random: RandomSource): string => {
  const name = pick(CODE_NAMES, random)
  const field = pick(CODE_FIELDS, random)
  return `interface PracticeItem {\n  id: number\n  ${field}: string\n  active: boolean\n}\n\nconst ${name}: PracticeItem[] = []\nconst activeItems = ${name}.filter((item) => item.active)\n`
}

const generateJavaBlock = (random: RandomSource): string => {
  const className = pick(['PracticeService', 'ScoreSummary', 'TaskCollector', 'SessionReport'], random)
  const limit = integer(5, 50, random)
  return `public final class ${className} {\n    public List<String> collect(List<Item> items) {\n        return items.stream()\n            .filter(Item::active)\n            .limit(${limit})\n            .map(Item::name)\n            .toList();\n    }\n}\n`
}

const generateSqlBlock = (random: RandomSource): string => {
  const table = pick(['typing_history', 'practice_session', 'task_record', 'score_summary'], random)
  const field = pick(['accuracy', 'created_at', 'total_count', 'status'], random)
  const limit = integer(10, 100, random)
  return `SELECT user_id, ${field}, COUNT(*) AS total\nFROM ${table}\nWHERE ${field} IS NOT NULL\nGROUP BY user_id, ${field}\nORDER BY total DESC\nLIMIT ${limit};\n`
}

const generateCodeBlock = (language: TypingCodeLanguage, random: RandomSource): string => {
  switch (language) {
    case 'javascript': return generateJavaScriptBlock(random)
    case 'java': return generateJavaBlock(random)
    case 'sql': return generateSqlBlock(random)
    default: return generateTypeScriptBlock(random)
  }
}

export const createTypingSeed = (): string => {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(2)
    globalThis.crypto.getRandomValues(values)
    return `${values[0].toString(36)}-${values[1].toString(36)}`
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const createTypingTextGenerator = (config: TypingGeneratorConfig): TypingTextGenerator => {
  const random = createSeededRandom(config.seed)
  const separator = config.contentKind === 'code' ? '\n' : ' '
  const generateBlock = (): string => {
    switch (config.contentKind) {
      case 'chinese': return generateChineseBlock(random)
      case 'english': return generateEnglishBlock(random)
      case 'numbers': return generateNumberBlock(random)
      case 'code': return generateCodeBlock(config.codeLanguage ?? 'typescript', random)
    }
  }

  return {
    seed: config.seed,
    next: (minimumLength: number): string => {
      const chunks: string[] = []
      let length = 0
      while (length < Math.max(1, minimumLength)) {
        const block = generateBlock()
        chunks.push(block)
        length += Array.from(block).length + (chunks.length > 1 ? Array.from(separator).length : 0)
      }
      return chunks.join(separator)
    }
  }
}

export const generateFixedTypingText = (
  config: TypingGeneratorConfig,
  targetLength: number
): string => {
  const validLength = validateTargetLength(targetLength)
  const generated = createTypingTextGenerator(config).next(validLength)
  if (config.contentKind === 'code') {
    return generated.trimEnd()
  }
  return Array.from(generated).slice(0, validLength).join('')
}
