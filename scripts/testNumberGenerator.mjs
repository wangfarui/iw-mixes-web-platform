import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/number-generator-tests')

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
    alias: {
      '@': path.join(root, 'src')
    }
  })
  return import(pathToFileURL(outfile).href)
}

const config = await bundleModule('src/utils/numberGenerator/config.ts', 'config.mjs')
const generators = await bundleModule('src/utils/numberGenerator/generators.ts', 'generators.mjs')
const checksum = await bundleModule('src/utils/numberGenerator/checksum.ts', 'checksum.mjs')
const idCard = await bundleModule('src/utils/numberGenerator/idCard.ts', 'id-card.mjs')
const exporters = await bundleModule('src/utils/numberGenerator/exporters.ts', 'exporters.mjs')

const makeSettings = () => config.createDefaultNumberGeneratorSettings()
const generateOne = (kind, patch = {}) => {
  const settings = makeSettings()
  settings.kind = kind
  Object.assign(settings, patch)
  settings.count = 5
  return generators.generateNumberRecords(settings)
}

const custom = generateOne('custom')
assert.equal(custom.records.length, 5)
assert.match(custom.records[0].value, /^IW-\d{8}-0001$/)
assert.equal(custom.duplicateCount, 0)

const timeSequence = generateOne('time-sequence')
assert.match(timeSequence.records[0].value, /^\d{17}-0001$/)

const uuid = generateOne('uuid')
assert.match(uuid.records[0].value, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)

const ulid = generateOne('ulid')
assert.match(ulid.records[0].value, /^[0-9A-HJKMNP-TV-Z]{26}$/)
assert.ok(ulid.records[1].value > ulid.records[0].value)

const snowflake = generateOne('snowflake')
assert.match(snowflake.records[0].value, /^\d+$/)
assert.ok(snowflake.warnings.some((warning) => warning.includes('Snowflake')))

const business = generateOne('business')
assert.match(business.records[0].value, /^BK\d{8}0001$/)

const batch = generateOne('batch')
assert.match(batch.records[0].value, /^BATCH-\d{8}-001$/)

const shortCode = generateOne('short-code')
assert.equal(shortCode.records[0].value.length, 6)
assert.match(shortCode.records[0].value, /^[A-Z2-9]+$/)

const numeric = generateOne('numeric-code')
assert.match(numeric.records[0].value, /^\d{6}$/)

const traceId = generateOne('trace-id')
assert.match(traceId.records[0].value, /^[0-9a-f]{32}$/)

const checksumSettings = makeSettings()
checksumSettings.kind = 'checksum'
checksumSettings.count = 1
const checksumResult = generators.generateNumberRecords(checksumSettings)
const checksumValue = checksumResult.records[0].value
const checksumBody = checksumValue.slice(2, -1)
assert.equal(checksumValue.slice(-1), checksum.calculateLuhnCheckDigit(checksumBody))

checksumSettings.checksum.algorithm = 'mod11'
const mod11Value = generators.generateNumberRecords(checksumSettings).records[0].value
const mod11Body = mod11Value.slice(2, -1)
assert.equal(mod11Value.slice(-1), checksum.calculateMod11CheckDigit(mod11Body))

const validId = idCard.generateValidIdCardNumber(makeSettings().idCard, 0)
assert.match(validId, /^\d{17}[\dX]$/)
assert.equal(checksum.isValidIdCardChecksum(validId), true)

const invalidChecksumId = idCard.generateInvalidChecksumIdCardNumber(makeSettings().idCard, 0)
assert.equal(checksum.isValidIdCardChecksum(invalidChecksumId), false)

const invalidDateId = idCard.generateInvalidDateIdCardNumber(makeSettings().idCard, 0)
assert.match(invalidDateId.slice(6, 14), /^(19990230|20001301|20190229|19800010|20260431)$/)
assert.equal(checksum.isValidIdCardChecksum(invalidDateId), true)

const lowercaseXId = idCard.generateLowercaseXIdCardNumber(makeSettings().idCard, 0)
assert.match(lowercaseXId, /^\d{17}x$/)
assert.equal(checksum.isValidIdCardChecksum(lowercaseXId), true)

const idCardSettings = makeSettings()
idCardSettings.kind = 'id-card'
idCardSettings.count = 10
idCardSettings.idCard.sampleMode = 'mixed'
const idCardResult = generators.generateNumberRecords(idCardSettings)
assert.equal(idCardResult.records.length, 10)
assert.ok(idCardResult.records.some((record) => record.status === 'error'))
assert.ok(idCardResult.records.some((record) => record.status === 'warning'))
assert.ok(idCardResult.warnings.some((warning) => warning.includes('身份证')))

const txt = exporters.formatGeneratedNumbers(custom.records.slice(0, 2), 'txt')
assert.equal(txt.split('\n').length, 2)
const csv = exporters.formatGeneratedNumbers(custom.records.slice(0, 1), 'csv')
assert.match(csv, /^index,value,type,status,description\n/)
const json = JSON.parse(exporters.formatGeneratedNumbers(custom.records.slice(0, 1), 'json'))
assert.equal(json.records.length, 1)

const cappedSettings = makeSettings()
cappedSettings.count = config.MAX_GENERATE_COUNT + 10
const capped = generators.generateNumberRecords(cappedSettings)
assert.equal(capped.records.length, config.MAX_GENERATE_COUNT)
assert.ok(capped.warnings.some((warning) => warning.includes(String(config.MAX_GENERATE_COUNT))))

console.log('number generator tests passed')
