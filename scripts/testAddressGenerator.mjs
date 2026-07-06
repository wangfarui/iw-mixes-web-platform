import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/address-generator-tests')

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

const config = await bundleModule('src/utils/addressGenerator/config.ts', 'config.mjs')
const generator = await bundleModule('src/utils/addressGenerator/generator.ts', 'generator.mjs')
const exporters = await bundleModule('src/utils/addressGenerator/exporters.ts', 'exporters.mjs')
const history = await bundleModule('src/utils/addressGenerator/history.ts', 'history.mjs')

const makeSettings = () => config.createDefaultAddressGeneratorSettings()

const fixedSettings = makeSettings()
fixedSettings.countryCode = 'US'
fixedSettings.localeCode = 'auto'
fixedSettings.seed = 'iw-address-test'
const first = await generator.generateAddressProfile(fixedSettings)
const second = await generator.generateAddressProfile(fixedSettings)

assert.equal(first.address.countryCode, 'US')
assert.equal(first.localeCode, 'en_US')
assert.equal(first.user.userId, second.user.userId)
assert.equal(first.address.fullAddress, second.address.fullAddress)
assert.match(first.user.email, /@/)
assert.ok(first.user.age >= 18)
assert.ok(first.user.tags.length > 0)

const globalSettings = makeSettings()
globalSettings.seed = 'global-seed'
const globalFirst = await generator.generateAddressProfile(globalSettings)
const globalSecond = await generator.generateAddressProfile(globalSettings)
assert.equal(globalFirst.address.countryCode, globalSecond.address.countryCode)

const chinaSettings = makeSettings()
chinaSettings.countryCode = 'CN'
chinaSettings.includeCoordinates = true
const china = await generator.generateAddressProfile(chinaSettings)
assert.equal(china.localeCode, 'zh_CN')
assert.equal(china.address.countryCode, 'CN')
assert.ok(china.address.latitude)
assert.ok(china.address.longitude)

const json = JSON.parse(exporters.formatAddressProfile(first, 'json', 'camel'))
assert.equal(json.userId, first.user.userId)
assert.equal(json.fullAddress, first.address.fullAddress)

const csv = exporters.formatAddressProfile(first, 'csv', 'snake')
assert.match(csv, /^user_id,username,full_name,/)
assert.ok(csv.includes(first.address.countryCode))

const text = exporters.formatAddressProfile(first, 'txt', 'chinese')
assert.ok(text.includes('用户资料'))
assert.ok(text.includes('完整地址'))

const record = history.createAddressHistoryRecord(first)
assert.equal(record.profile.id, first.id)
assert.ok(record.summary.includes(first.address.countryLocalName))

const exportedHistory = JSON.parse(history.serializeAddressHistoryRecords([record]))
assert.equal(exportedHistory.source, 'iw-mixes-web-platform:address-generator')
assert.equal(exportedHistory.records.length, 1)

console.log('address generator tests passed')
