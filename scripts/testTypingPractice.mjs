import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/typing-practice-tests')

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

const bundleModule = async (entry, outfileName) => {
  const outfile = path.join(tempDir, outfileName)
  await build({
    entryPoints: [path.join(root, entry)],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2020',
    logLevel: 'silent',
    alias: { '@': path.join(root, 'src') }
  })
  return import(pathToFileURL(outfile).href)
}

const session = await bundleModule('src/utils/typing-practice/session.ts', 'session.mjs')
const generator = await bundleModule('src/utils/typing-practice/generator.ts', 'generator.mjs')
const history = await bundleModule('src/utils/typing-practice/history.ts', 'history.mjs')
const exporters = await bundleModule('src/utils/typing-practice/exporters.ts', 'exporters.mjs')

const createClock = () => {
  let current = 0
  return {
    clock: { now: () => current },
    set: (value) => { current = value }
  }
}

const createEngine = ({
  contentKind = 'english',
  codeLanguage,
  mode = 'fixed',
  targetLength = 20,
  seed = 'typing-test-seed'
} = {}, clock) => session.createTypingEngine({
  title: '随机测试',
  contentKind,
  mode,
  seed,
  generator: generator.createTypingTextGenerator({ contentKind, codeLanguage, seed }),
  targetLength: mode === 'fixed' ? targetLength : undefined
}, clock)

const expectedText = (snapshot) => snapshot.characters.map((item) => item.expected).join('')

{
  for (const contentKind of ['chinese', 'english', 'numbers']) {
    const config = { contentKind, seed: 'same-seed' }
    const first = generator.createTypingTextGenerator(config).next(240)
    const second = generator.createTypingTextGenerator(config).next(240)
    assert.equal(first, second)
    assert.ok(Array.from(first).length >= 240)
    assert.equal(Array.from(generator.generateFixedTypingText(config, 100)).length, 100)
  }

  const different = generator.createTypingTextGenerator({ contentKind: 'english', seed: 'other-seed' }).next(240)
  const original = generator.createTypingTextGenerator({ contentKind: 'english', seed: 'same-seed' }).next(240)
  assert.notEqual(different, original)

  for (const codeLanguage of ['javascript', 'typescript', 'java', 'sql']) {
    const code = generator.generateFixedTypingText({ contentKind: 'code', codeLanguage, seed: 'code-seed' }, 100)
    assert.ok(Array.from(code).length >= 100)
    assert.match(code, /\n/)
  }
}

{
  const time = createClock()
  const engine = createEngine({ targetLength: 10 }, time.clock)
  const target = expectedText(engine.snapshot())
  assert.equal(target.length, 10)
  engine.send({ type: 'commit', text: target[0] })
  time.set(60_000)
  const result = engine.send({ type: 'commit', text: target.slice(1) })
  assert.equal(result.status, 'completed')
  assert.equal(result.completionReason, 'length-complete')
  assert.equal(result.correctCharacters, 10)
  assert.equal(result.accuracy, 100)
  assert.equal(result.cpm, 10)
  assert.equal(result.wpm, 2)
  assert.equal(result.progress, 100)
  assert.equal(result.longestCorrectStreak, 10)
}

{
  const time = createClock()
  const engine = createEngine({ targetLength: 10 }, time.clock)
  const first = engine.snapshot().characters[0].expected
  engine.send({ type: 'commit', text: first === 'x' ? 'y' : 'x' })
  time.set(1_000)
  engine.send({ type: 'backspace' })
  const result = engine.send({ type: 'commit', text: first })
  assert.equal(result.typedLength, 1)
  assert.equal(result.mistakeAttempts, 1)
  assert.equal(result.correctionCount, 1)
  assert.equal(result.accuracy, 50)
  assert.equal(result.mistakes[0].expected, first)
}

{
  assert.equal(session.segmentPracticeText('A👍🏽e\u0301').length, 3)
}

{
  const time = createClock()
  const engine = createEngine({ targetLength: 10 }, time.clock)
  const target = expectedText(engine.snapshot())
  engine.send({ type: 'commit', text: target[0] })
  time.set(10_000)
  engine.send({ type: 'pause' })
  time.set(50_000)
  engine.send({ type: 'resume' })
  time.set(60_000)
  const result = engine.send({ type: 'commit', text: target[1] })
  assert.equal(result.elapsedMs, 20_000)
  assert.equal(result.status, 'running')
}

{
  const time = createClock()
  const engine = createEngine({ mode: 'infinite' }, time.clock)
  let snapshot = engine.snapshot()
  assert.equal(snapshot.targetLength, undefined)
  assert.equal(snapshot.progress, undefined)

  for (let index = 0; index < 800; index += 1) {
    const current = snapshot.characters.find((item) => item.status === 'current')
    assert.ok(current)
    snapshot = engine.send({ type: 'commit', text: current.expected })
  }

  assert.equal(snapshot.status, 'running')
  assert.equal(snapshot.typedLength, 800)
  assert.equal(snapshot.correctCharacters, 800)
  assert.equal(snapshot.longestCorrectStreak, 800)
  assert.ok(snapshot.generatedLength > snapshot.typedLength)
  assert.ok(snapshot.characters.length < 700, '无限模式应保持有界渲染窗口')
  time.set(60_000)
  const result = engine.send({ type: 'finish' })
  assert.equal(result.status, 'completed')
  assert.equal(result.completionReason, 'manual')
  assert.equal(result.cpm, 800)
}

{
  const time = createClock()
  const engine = createEngine({ targetLength: 20 }, time.clock)
  const first = engine.snapshot().characters[0].expected
  engine.send({ type: 'commit', text: first })
  time.set(5_000)
  const result = engine.send({ type: 'finish' })
  const record = history.createTypingHistoryRecord(result, 'fixed-id')
  const serialized = history.serializeTypingHistoryRecords([record])
  assert.ok(!serialized.includes(expectedText(engine.snapshot())))
  assert.equal(JSON.parse(serialized).version, 2)
  assert.equal(JSON.parse(serialized).records[0].seed, 'typing-test-seed')
  assert.equal(history.parseTypingHistoryRecords(serialized).length, 1)
  assert.match(exporters.formatTypingResult(result, 'csv'), /^title,contentKind,mode,seed,/)
  assert.match(exporters.formatTypingResultText(result), /随机种子：/)
}

console.log('typing practice tests passed')
