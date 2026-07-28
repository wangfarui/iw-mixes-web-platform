const SECRET_BYTES = 32
const BASE64_URL = /^[A-Za-z0-9_-]+$/

export interface RemoteShareMaterial {
  roomId: string
  accessToken: string
  contentKey: CryptoKey
}

const toBase64Url = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

const cryptoApi = () => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('当前浏览器不支持 Web Crypto，无法建立端到端加密会话')
  }
  return globalThis.crypto
}

export const createSessionSecret = () => {
  const bytes = new Uint8Array(SECRET_BYTES)
  cryptoApi().getRandomValues(bytes)
  return toBase64Url(bytes)
}

export const readSessionSecret = (hash: string) => {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get('s')
  if (!value || !BASE64_URL.test(value)) {
    return null
  }
  try {
    return fromBase64Url(value).byteLength === SECRET_BYTES ? value : null
  } catch {
    return null
  }
}

export const shareLink = (origin: string, secret: string) => `${origin}/tools/remote-share#s=${secret}`

export const deriveSessionMaterial = async (secret: string): Promise<RemoteShareMaterial> => {
  const bytes = fromBase64Url(secret)
  if (bytes.byteLength !== SECRET_BYTES) {
    throw new Error('会话秘密无效')
  }
  const crypto = cryptoApi()
  const baseKey = await crypto.subtle.importKey('raw', bytes, 'HKDF', false, ['deriveBits', 'deriveKey'])
  const salt = new TextEncoder().encode('iw-remote-share-v1')
  const deriveBits = (info: string) => crypto.subtle.deriveBits({
    name: 'HKDF',
    hash: 'SHA-256',
    salt,
    info: new TextEncoder().encode(info)
  }, baseKey, 256)
  const [roomIdBits, accessTokenBits, contentKey] = await Promise.all([
    deriveBits('room-id'),
    deriveBits('access-token'),
    crypto.subtle.deriveKey({
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: new TextEncoder().encode('content-key')
    }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  ])
  return {
    roomId: toBase64Url(new Uint8Array(roomIdBits)),
    accessToken: toBase64Url(new Uint8Array(accessTokenBits)),
    contentKey
  }
}

export const encryptText = async (contentKey: CryptoKey, text: string) => {
  const crypto = cryptoApi()
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)
  const plaintext = new TextEncoder().encode(text)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, contentKey, plaintext)
  const payload = new Uint8Array(iv.byteLength + encrypted.byteLength)
  payload.set(iv)
  payload.set(new Uint8Array(encrypted), iv.byteLength)
  return toBase64Url(payload)
}

export const decryptText = async (contentKey: CryptoKey, ciphertext: string) => {
  const payload = fromBase64Url(ciphertext)
  if (payload.byteLength <= 12) {
    throw new Error('密文不完整')
  }
  const plaintext = await cryptoApi().subtle.decrypt({ name: 'AES-GCM', iv: payload.slice(0, 12) }, contentKey, payload.slice(12))
  return new TextDecoder().decode(plaintext)
}

export const encryptBytes = async (contentKey: CryptoKey, bytes: Uint8Array) => {
  const crypto = cryptoApi()
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, contentKey, bytes)
  const payload = new Uint8Array(iv.byteLength + encrypted.byteLength)
  payload.set(iv)
  payload.set(new Uint8Array(encrypted), iv.byteLength)
  return payload
}

export const decryptBytes = async (contentKey: CryptoKey, payload: Uint8Array) => {
  if (payload.byteLength <= 12) {
    throw new Error('密文不完整')
  }
  return new Uint8Array(await cryptoApi().subtle.decrypt({ name: 'AES-GCM', iv: payload.slice(0, 12) }, contentKey, payload.slice(12)))
}

export const utf8ByteLength = (value: string) => new TextEncoder().encode(value).byteLength
export const MAX_DIRECT_FILE_BYTES = 10 * 1024 * 1024
export const SMALL_TEXT_BYTES = 64 * 1024
