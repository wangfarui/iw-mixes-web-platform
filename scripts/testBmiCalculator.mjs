import assert from 'node:assert/strict'
import {mkdir, rm} from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/bmi-calculator-tests')

await rm(tempDir, {recursive: true, force: true})
await mkdir(tempDir, {recursive: true})

const outfile = path.join(tempDir, 'bmi-calculator.mjs')
await build({
    entryPoints: [path.join(root, 'src/utils/bmi-calculator/index.ts')],
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

const bmi = await import(pathToFileURL(outfile).href)

const chinaNormal = bmi.calculateBmi({heightCm: 170, weightKg: 65})
assert.equal(chinaNormal.bmi, 22.5)
assert.equal(chinaNormal.category.key, 'normal')
assert.equal(bmi.formatReferenceWeightRange(chinaNormal), '53.5–69.3 kg')

assert.equal(bmi.calculateBmi({heightCm: 170, weightKg: 53.465}).category.key, 'normal')
assert.equal(bmi.calculateBmi({heightCm: 170, weightKg: 69.36}).category.key, 'overweight')
assert.equal(bmi.calculateBmi({heightCm: 170, weightKg: 80.92}).category.key, 'obesity')

assert.throws(() => bmi.calculateBmi({heightCm: 0, weightKg: 65}), /身高/)
assert.throws(() => bmi.calculateBmi({heightCm: 170, weightKg: 0}), /体重/)

console.log('bmi calculator tests passed')
