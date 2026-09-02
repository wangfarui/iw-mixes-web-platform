export type ZhaogangReleaseItemType = 'FEATURE' | 'IMPROVEMENT' | 'FIX'

export interface ZhaogangReleaseItem {
  type: ZhaogangReleaseItemType
  text: string
}

export interface ZhaogangRelease {
  id: string
  version: string
  publishedAt: string
  items: ZhaogangReleaseItem[]
}

export interface ZhaogangReleaseManifest {
  schemaVersion: 1
  currentReleaseId: string
  releases: ZhaogangRelease[]
}

export interface ZhaogangReleaseReceipt {
  read: boolean
  readAt: string | null
}

export interface ZhaogangReleaseCheck {
  manifest: ZhaogangReleaseManifest
  currentRelease: ZhaogangRelease
  receipt: ZhaogangReleaseReceipt
  synced: boolean
}
