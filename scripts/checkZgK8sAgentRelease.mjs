import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const manifestPath = resolve(root, 'public/downloads/zg-k8s-agent/latest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

if (manifest.agentName !== 'zg-k8s-agent' || !manifest.version || typeof manifest.platforms !== 'object') {
  throw new Error('zg-k8s-agent latest.json 缺少必要字段')
}

const entries = Object.entries(manifest.platforms)
for (const [platform, release] of entries) {
  if (!release || typeof release.url !== 'string' || !release.sha256) {
    throw new Error(`zg-k8s-agent ${platform} 发布项缺少 url 或 sha256`)
  }
  for (const asset of [release.url, release.downloadUrl].filter(Boolean)) {
    if (/^https?:\/\//.test(asset)) continue
    const assetPath = resolve(root, 'public/downloads/zg-k8s-agent', asset)
    if (!existsSync(assetPath)) throw new Error(`zg-k8s-agent ${platform} 文件不存在: ${asset}`)
  }
}

if (!entries.length) console.warn('zg-k8s-agent 当前只有版本清单，发布二进制后请运行 zg-k8s-agent/scripts/build-release.sh')
else console.log(`zg-k8s-agent ${manifest.version}: ${entries.length} 个平台发布文件已就绪`)
