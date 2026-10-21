export const prototypeLinkError = (value: string, required = false): string => {
  const url = value.trim()
  if (!url) return required ? '请输入需求原型链接' : ''
  if (url.length > 255) return '需求原型链接不能超过255个字符'
  try {
    const parsed = new URL(url)
    if (!/^https?:\/\//i.test(url) || !parsed.hostname || /[\s\\]/u.test(url)) throw new Error()
    // Match the backend URI parser instead of silently repairing malformed escapes.
    if (/%(?![0-9a-f]{2})/i.test(url)) throw new Error()
  } catch {
    return '请输入完整的 HTTP/HTTPS 需求原型链接'
  }
  return ''
}
