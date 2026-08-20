import assert from 'node:assert/strict'
import {mkdir, rm} from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'esbuild'

const root = process.cwd()
const tempDir = path.join(root, 'node_modules/.cache/auth-session-tests')
await rm(tempDir, {recursive: true, force: true})
await mkdir(tempDir, {recursive: true})

const outfile = path.join(tempDir, 'auth-session-core.mjs')
await build({
  entryPoints: [path.join(root, 'src/services/authSessionCore.ts')],
  outfile,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  logLevel: 'silent'
})

const {createAuthSession} = await import(pathToFileURL(outfile).href)

class MemoryStorage {
  values = new Map()

  getItem(key) {
    return this.values.get(key) ?? null
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }

  removeItem(key) {
    this.values.delete(key)
  }
}

const sharedStorage = new MemoryStorage()
const firstTabStorage = new MemoryStorage()
const secondTabStorage = new MemoryStorage()
const firstTab = createAuthSession({sharedStorage, tabStorage: firstTabStorage})
const secondTab = createAuthSession({sharedStorage, tabStorage: secondTabStorage})

firstTab.saveLoginSession({token: ' token-a ', userName: ' User A '})
assert.equal(firstTab.getToken(), 'token-a')
assert.equal(secondTab.getToken(), 'token-a', '登录信息应在 Tab 之间共享')
assert.equal(secondTab.getUserName(), 'User A')

firstTab.rememberReturnPath('/bookkeeping?page=2#records')
secondTab.rememberReturnPath('/dict/edit/15?source=list')
assert.equal(firstTab.takeReturnPath(), '/bookkeeping?page=2#records')
assert.equal(firstTab.takeReturnPath(), null, '返回地址使用后应被消费')
assert.equal(secondTab.takeReturnPath(), '/dict/edit/15?source=list', '每个 Tab 应保留自己的返回地址')

firstTab.rememberReturnPath('https://example.com/steal')
assert.equal(firstTab.takeReturnPath(), null, '不应接受站外返回地址')
firstTab.rememberReturnPath('//example.com/steal')
assert.equal(firstTab.takeReturnPath(), null, '不应接受协议相对的站外返回地址')
firstTab.rememberReturnPath('/login')
assert.equal(firstTab.takeReturnPath(), null, '登录页不能成为登录后的返回地址')

firstTab.rememberReturnPath('/task/list')
firstTab.clearLoginSession()
assert.equal(secondTab.getToken(), null, '退出登录应清除所有 Tab 的共享登录信息')
assert.equal(firstTab.takeReturnPath(), '/task/list', '清理登录信息不应误删待恢复页面')

const legacySharedStorage = new MemoryStorage()
const legacyTabStorage = new MemoryStorage()
legacyTabStorage.setItem('iwtoken', 'legacy-token')
legacyTabStorage.setItem('name', 'Legacy User')
const legacyTab = createAuthSession({sharedStorage: legacySharedStorage, tabStorage: legacyTabStorage})

assert.equal(legacyTab.getToken(), 'legacy-token')
assert.equal(legacyTab.getUserName(), 'Legacy User')
assert.equal(legacySharedStorage.getItem('iw.auth.token'), 'legacy-token', '旧 token 应迁移到共享存储')
assert.equal(legacySharedStorage.getItem('iw.auth.userName'), 'Legacy User')
assert.equal(legacyTabStorage.getItem('iwtoken'), null)
assert.equal(legacyTabStorage.getItem('name'), null)

const staleLegacyTabStorage = new MemoryStorage()
staleLegacyTabStorage.setItem('iwtoken', 'stale-legacy-token')
const staleLegacyTab = createAuthSession({
  sharedStorage: legacySharedStorage,
  tabStorage: staleLegacyTabStorage
})
legacyTab.clearLoginSession()
assert.equal(staleLegacyTab.getToken(), null, '退出后其他旧 Tab 不能重新迁入旧 token')
assert.equal(staleLegacyTabStorage.getItem('iwtoken'), null)

globalThis.window = {
  localStorage: sharedStorage,
  sessionStorage: firstTabStorage
}

const authRoutingOutfile = path.join(tempDir, 'auth-routing.mjs')
await build({
  entryPoints: [path.join(root, 'src/router/auth.ts')],
  outfile: authRoutingOutfile,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  alias: {
    '@': path.join(root, 'src')
  },
  logLevel: 'silent'
})

const {createMemoryHistory, createRouter} = await import('vue-router')
const {takePostLoginTarget} = await import(pathToFileURL(authRoutingOutfile).href)
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {path: '/', component: {}},
    {path: '/login', component: {}},
    {path: '/dict/edit/:id', component: {}},
    {path: '/tools', component: {}, meta: {public: true}}
  ]
})

firstTab.rememberReturnPath('/dict/edit/15?source=list#form')
assert.deepEqual(takePostLoginTarget(router), {
  path: '/dict/edit/15',
  query: {source: 'list'},
  hash: '#form'
})

firstTab.rememberReturnPath('/missing')
assert.deepEqual(takePostLoginTarget(router), {path: '/'}, '未知路由应回退到首页')
firstTab.rememberReturnPath('/tools')
assert.deepEqual(takePostLoginTarget(router), {path: '/'}, '公开页面不应作为登录后的恢复目标')

console.log('auth session tests passed')
