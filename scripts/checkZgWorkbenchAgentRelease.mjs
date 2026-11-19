import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { unzipSync } from 'fflate'

const root = fileURLToPath(new URL('..', import.meta.url))
const downloadsDir = resolve(root, process.argv[2] || 'public', 'downloads')
const agentDir = resolve(downloadsDir, 'dev-hub-agent')
const manifestPath = resolve(agentDir, 'latest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

if (manifest.agentName !== 'dev-hub-agent' || manifest.protocolVersion !== 2 || !manifest.version || typeof manifest.platforms !== 'object') {
  throw new Error('Dev Hub Agent latest.json 缺少必要字段')
}

const guide = readFileSync(resolve(root, 'src/views/zhaogang/settings/ZhaogangAgentGuideView.vue'), 'utf8')
if (/zg-workbench-agent|zg-k8s-agent/.test(guide)) throw new Error('Agent 教程仍包含历史安装名称')
if (!guide.includes('~/Applications/dev-hub-agent.app') || !guide.includes(String.raw`%LOCALAPPDATA%\dev-hub-agent`)) throw new Error('Agent 教程安装路径未使用 Dev Hub 命名')
const platforms = ['darwin-arm64', 'darwin-amd64', 'windows-amd64', 'windows-arm64']
if (!manifest.platforms || Object.keys(manifest.platforms).length !== platforms.length) {
  throw new Error('Dev Hub Agent 更新清单必须包含四个平台')
}
const entries = platforms.map(platform => [platform, manifest.platforms[platform]])
for (const [platform, release] of entries) {
  if (!release?.url || !release.downloadUrl || !release.sha256 || (platform.startsWith('windows-') && !release.installerUrl)) {
    throw new Error(`Dev Hub Agent ${platform} 发布项缺少下载路径或 SHA-256`)
  }
  for (const asset of [release.url, release.downloadUrl, release.installerUrl].filter(Boolean)) {
    const assetPath = resolve(agentDir, asset)
    if (!existsSync(assetPath)) throw new Error(`Dev Hub Agent ${platform} 文件不存在: ${asset}`)
  }
  const runtime = readFileSync(resolve(agentDir, release.url))
  if (createHash('sha256').update(runtime).digest('hex') !== release.sha256) throw new Error(`Dev Hub Agent ${platform} 运行文件校验失败`)
  if (platform.startsWith('windows-')) {
    const installer = readFileSync(resolve(agentDir, release.installerUrl))
    const marker = Buffer.from('\nDEV_HUB_AGENT_PAYLOAD_V2\n')
    const offset = installer.lastIndexOf(marker)
    if (offset < 0 || !installer.subarray(offset + marker.length).equals(runtime)) throw new Error(`Dev Hub Agent ${platform} 安装载荷与运行文件不一致`)
  }
  if (platform.startsWith('darwin-')) {
    const archive = unzipSync(readFileSync(resolve(agentDir, release.downloadUrl)))
    for (const filename of ['dev-hub-agent', 'install-macos.sh', 'uninstall-macos.sh']) {
      if (!archive[filename]) throw new Error(`Dev Hub Agent ${platform} 安装包缺少 ${filename}`)
    }
    if (archive['zg-workbench-agent']) throw new Error(`Dev Hub Agent ${platform} 安装包残留旧名执行文件`)
    const sha256 = createHash('sha256').update(archive['dev-hub-agent']).digest('hex')
    if (sha256 !== release.sha256) throw new Error(`Dev Hub Agent ${platform} 包内运行文件与更新清单不一致`)
    const chmod = guide.match(/chmod \+x install-macos\.sh ([\w-]+)/)?.[1]
    if (!chmod || !archive[chmod]) throw new Error(`Dev Hub Agent ${platform} 教程 chmod 文件与安装包不一致`)
    for (const script of ['install-macos.sh', 'uninstall-macos.sh']) {
      if (!Buffer.from(archive[script]).equals(readFileSync(resolve(agentDir, script)))) {
        throw new Error(`Dev Hub Agent ${platform} 包内 ${script} 与下载目录不一致`)
      }
    }
  }
}

for (const name of ['zg-k8s-agent', 'zg-workbench-agent']) {
  const path = resolve(downloadsDir, name, 'latest.json')
  if (!existsSync(path)) throw new Error('历史 Agent 更新清单必须保留用于迁移')
  const legacy = JSON.parse(readFileSync(path, 'utf8'))
  if (legacy.version !== manifest.version || legacy.agentName !== manifest.agentName) {
    throw new Error(`${name} 更新清单未指向当前版本`)
  }
  for (const [platform, release] of entries) {
    const historical = legacy.platforms?.[platform]
    if (historical?.sha256 !== release.sha256) throw new Error(`${name} ${platform} 运行文件校验和不一致`)
    for (const field of ['url', 'downloadUrl', 'installerUrl']) {
      if (!release[field]) continue
      const expected = pathToFileURL(resolve(agentDir, release[field])).href
      if (!historical[field] || new URL(historical[field], pathToFileURL(path)).href !== expected) {
        throw new Error(`${name} ${platform} 的 ${field} 未指向当前发布文件`)
      }
    }
  }
}
console.log(`Dev Hub Agent ${manifest.version}：${entries.length} 个平台发布文件已就绪`)
