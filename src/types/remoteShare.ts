export interface RemoteShareDevice {
  slot: 'A' | 'B'
  capability: string
  expiresAt: string
}

export interface RemoteShareSessionState {
  slot: 'A' | 'B'
  paired: boolean
  expiresAt: string
}

export interface PendingRemoteShareText {
  id: string
  sender: 'A' | 'B'
  ciphertext: string
  expiresAt: string
}

export interface PendingRemoteShareBinary {
  itemId: string
  totalBytes: number
  chunks: number
  encryptedManifest: string
}
