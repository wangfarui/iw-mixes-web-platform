import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const [settings, directory] = await Promise.all([
  readFile(resolve('src/views/zhaogang/settings/ZhaogangAgentSettings.vue'), 'utf8'),
  readFile(resolve('src/views/zhaogang/skills/ZhaogangSkillsView.vue'), 'utf8')
])

assert.match(settings, /path: '\/zhaogang\/skills', query: \{ q: PANGMAOYUN_WORKBENCH_BUILD_SKILL \}/)
assert.match(settings, /管理 Skills 授权设备/)
assert.doesNotMatch(settings, /下载 Skill 安装包|skillPackageDownloadUrl|copySkillInstallPrompt/)
assert.doesNotMatch(settings, /zg_ag_[A-Za-z0-9_-]{20,}/)
assert.match(directory, /detail\.skill\.machineName === PANGMAOYUN_WORKBENCH_BUILD_SKILL/)
assert.match(directory, /to="\/zhaogang\/settings\?section=agent-auth"/)
assert.match(directory, /skillDownloadUrl\(skillId, row\.version\)/)
assert.match(directory, /copyPrompt\('install', row\)/)
console.log('zhaogang agent skill directory checks passed')
