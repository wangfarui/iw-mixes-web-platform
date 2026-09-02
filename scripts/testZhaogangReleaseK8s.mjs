import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { transform } from 'esbuild'

const source = await readFile(new URL('../src/services/zhaogangReleaseK8sNaming.ts', import.meta.url), 'utf8')
const compiled = await transform(source, { loader: 'ts', format: 'esm', platform: 'node' })
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`
const naming = await import(moduleUrl)

assert.equal(naming.deploymentNameFromPlanName('online.base.service'), 'online-base-service')
assert.equal(naming.deploymentNameFromPlanName('online.user.service.deploy'), 'online-user-service')
assert.equal(naming.deploymentNameFromPlanName('online.user.service-deploy'), 'online-user-service')
assert.equal(naming.deploymentNameFromPlanName('online.admin.ui'), 'online-admin-ui')
assert.equal(naming.deploymentNameFromPlanName('online.admin.deploy'), null)
assert.equal(naming.deploymentNameFromPlanName(''), null)
assert.equal(naming.deploymentNameFromPlanName(null), null)
assert.equal(naming.k8sEnvironmentFromBuild('sit'), 'test')
assert.equal(naming.k8sEnvironmentFromBuild('test'), 'test')
assert.equal(naming.k8sEnvironmentFromBuild(' UAT '), 'uat')
assert.equal(naming.k8sEnvironmentFromBuild('prd'), 'prd')
assert.equal(naming.k8sEnvironmentFromBuild('dev'), null)

console.log('zhaogang release K8s naming tests passed')
