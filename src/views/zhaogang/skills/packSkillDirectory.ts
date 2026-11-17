import { zipSync, type Zippable } from 'fflate'
import { parseSkillManifest } from '@/utils/skillWorkbench/core'

export const MAX_SKILL_ZIP_BYTES = 8 * 1024 * 1024

function unsafeName(part: string) {
  const lower = part.toLowerCase()
  return !part || part !== part.trim() || part.endsWith('.')
    || /[\\/:*?"<>|\u0000-\u001f\u007f-\u009f]/.test(part)
    || ['.git', '.codex', '.ssh', 'auth.json', 'credentials.json'].includes(lower)
    || (lower.startsWith('.env') && lower !== '.env.example')
    || /\.(pem|key|p12|pfx|jks)$/.test(lower)
    || /^id_(rsa|dsa|ed25519|ecdsa)$/.test(lower)
    || /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/.test(lower)
}

export async function packSkillDirectory(files: readonly File[]): Promise<File> {
  const entries = files.map(file => {
    const [directory, ...parts] = file.webkitRelativePath.split('/')
    return { file, directory, parts, relativePath: parts.join('/') }
  }).filter(({ parts }) => !parts.some(part => ['.DS_Store', 'Thumbs.db', '__MACOSX'].includes(part)))

  const manifest = entries.find(entry => entry.relativePath === 'SKILL.md')
  if (!manifest || entries.some(entry => entry.directory !== manifest.directory)) {
    throw new Error('请选择直接包含 SKILL.md 的单个 Skill 文件夹。')
  }
  if (manifest.file.size > 256 * 1024) throw new Error('SKILL.md 须小于或等于 256 KiB。')
  if (entries.length > 500) throw new Error('Skill 文件夹最多可包含 500 个文件。')
  if (entries.reduce((size, { file }) => size + file.size, 0) > 32 * 1024 * 1024) {
    throw new Error('Skill 文件夹内的文件总大小须小于或等于 32 MiB。')
  }

  let markdown: string
  try {
    markdown = new TextDecoder('utf-8', { fatal: true }).decode(await manifest.file.arrayBuffer())
  } catch {
    throw new Error('无法读取 SKILL.md，请将它保存为 UTF-8 文本后重试。')
  }
  const { name, description, warnings } = parseSkillManifest(markdown, '')
  if (warnings.length || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64 || unsafeName(name) || !description.trim()) {
    throw new Error('请检查 SKILL.md 顶部的 YAML。name 使用小写字母、数字和连字符，description 填写用途。')
  }

  const paths = new Set<string>()
  for (const { parts, relativePath } of entries) {
    const path = relativePath.toLowerCase()
    if (parts.some(unsafeName)) throw new Error(`文件路径无效或可能包含本机凭据，请检查 ${relativePath}。`)
    if (paths.has(path)) throw new Error(`文件名仅大小写不同，请调整 ${relativePath}。`)
    if (name.length + 1 + relativePath.length > 320) throw new Error(`文件路径过长，请缩短 ${relativePath}。`)
    paths.add(path)
  }

  const archive: Zippable = Object.create(null)
  for (const { file, relativePath } of entries) {
    const bytes = relativePath === 'SKILL.md'
      ? new TextEncoder().encode(markdown)
      : new Uint8Array(await file.arrayBuffer())
    // Folder selection does not expose file modes. Keep shebang scripts runnable.
    const executable = relativePath.startsWith('scripts/') && bytes[0] === 35 && bytes[1] === 33
    archive[`${name}/${relativePath}`] = [bytes, { os: 3, attrs: (executable ? 0o100755 : 0o100644) << 16 }]
  }
  const zip = zipSync(archive)
  if (zip.byteLength > MAX_SKILL_ZIP_BYTES) throw new Error('打包后的 ZIP 须小于或等于 8 MiB，请移除不需要的附件。')
  return new File([zip], `${name}.zip`, { type: 'application/zip' })
}
