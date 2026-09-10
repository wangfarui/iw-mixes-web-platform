export type ZhaogangReleaseImportStatus =
  | 'READY'
  | 'PROJECT_AMBIGUOUS'
  | 'PLAN_AMBIGUOUS'
  | 'UNMATCHED'
  | 'DUPLICATE_IN_IMAGE'
  | 'ALREADY_ADDED'
  | 'UNBUILDABLE'
  | 'CATALOG_UNAVAILABLE'

export interface ZhaogangReleaseRecognizedRow {
  requirement: string
  ops: string
  systemName: string
  projectHint: string
  planHint: string
}

export interface ZhaogangReleaseCandidate {
  projectId: number
  projectName: string
  projectDisplayName: string
  planId: number
  planName: string
  quickBuildSupported: boolean
}

export interface ZhaogangReleaseImportRow {
  rowNo: number
  recognized: ZhaogangReleaseRecognizedRow
  status: ZhaogangReleaseImportStatus
  projectId?: number | null
  projectName?: string | null
  planId?: number | null
  planName?: string | null
  candidates: ZhaogangReleaseCandidate[]
  message?: string
}

export interface ZhaogangReleaseImportPreview {
  items: ZhaogangReleaseImportRow[]
}

export interface ZhaogangReleaseBatchAddResult {
  successCount: number
  failureCount: number
  failures: Array<{ rowNo: number; projectId: number; planId: number; reason: string }>
}
