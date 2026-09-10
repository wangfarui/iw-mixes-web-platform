import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const manifestPath = resolve(root, 'public/downloads/zg-workbench-agent/latest.json')
const legacyManifestPath = resolve(root, 'public/downloads/zg-k8s-agent/latest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

if (manifest.agentName !== 'zg-workbench-agent' || manifest.protocolVersion !== 2 || !manifest.version || typeof manifest.platforms !== 'object') {
  throw new Error('zg-workbench-agent latest.json 缺少必要字段')
}

const entries = Object.entries(manifest.platforms)
for (const [platform, release] of entries) {
  if (!release || typeof release.url !== 'string' || !release.sha256) {
    throw new Error(`zg-workbench-agent ${platform} 发布项缺少 url 或 sha256`)
  }
  for (const asset of [release.url, release.downloadUrl].filter(Boolean)) {
    if (/^https?:\/\//.test(asset)) continue
    const assetPath = resolve(root, 'public/downloads/zg-workbench-agent', asset)
    if (!existsSync(assetPath)) throw new Error(`zg-workbench-agent ${platform} 文件不存在: ${asset}`)
  }
}

if (!existsSync(legacyManifestPath)) throw new Error('旧版 zg-k8s-agent latest.json 必须保留用于迁移')
const legacy = JSON.parse(readFileSync(legacyManifestPath, 'utf8'))
if (legacy.version !== manifest.version || !legacy.platforms) throw new Error('旧版 Agent 更新清单未指向当前版本')
if (!entries.length) console.warn('zg-workbench-agent 当前只有版本清单，发布二进制后请运行 zg-workbench-agent/scripts/build-release.sh')
else console.log(`zg-workbench-agent ${manifest.version}: ${entries.length} 个平台发布文件已就绪`)
