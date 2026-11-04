import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const source = await readFile(resolve(process.cwd(), 'src/views/zhaogang/settings/ZhaogangAgentSettings.vue'), 'utf8')
const checksum = source.match(/checksum: '([0-9a-f]{64})'/)?.[1]
assert.ok(checksum, 'Agent Skill 安装包必须配置 64 位 SHA-256')
assert.match(source, /const skillPackageDownloadUrl = 'https:\/\/itwray\.oss-cn-heyuan\.aliyuncs\.com\/zg\/pangmaoyun\/agents\/pangmaoyun-workbench-build-v1\.0\.0\.zip'/)
assert.match(source, /available: Boolean\(skillPackageDownloadUrl\)/)
assert.match(source, /:disabled="!skillPackage\.available"/)
assert.match(source, /checksum: '[0-9a-f]{64}'/)
assert.match(source, /writeClipboardText/)
assert.match(source, /目标目录 <工作区>\/\.agents\/skills\/pangmaoyun-workbench-build 已存在时/)
assert.match(source, /python3 -m unittest discover -s tests -p 'test_\*\.py'/)
assert.doesNotMatch(source, /zg_ag_[A-Za-z0-9_-]{20,}/)
console.log('zhaogang agent skill package checks passed')
