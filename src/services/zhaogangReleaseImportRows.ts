import type { ZhaogangReleaseImportRow, ZhaogangReleaseImportStatus } from '@/types/zhaogangReleaseImport'

const COLLAPSIBLE_STATUSES = new Set<ZhaogangReleaseImportStatus>([
  'ALREADY_ADDED',
  'DUPLICATE_IN_IMAGE',
])

export interface ZhaogangReleaseImportCollapsedSummary {
  total: number
  alreadyAdded: number
  duplicateInImage: number
}

export const summarizeCollapsedReleaseImportRows = (
  rows: ZhaogangReleaseImportRow[],
): ZhaogangReleaseImportCollapsedSummary => {
  let alreadyAdded = 0
  let duplicateInImage = 0
  for (const row of rows) {
    if (row.status === 'ALREADY_ADDED') alreadyAdded += 1
    if (row.status === 'DUPLICATE_IN_IMAGE') duplicateInImage += 1
  }
  return {
    total: alreadyAdded + duplicateInImage,
    alreadyAdded,
    duplicateInImage,
  }
}

export const visibleReleaseImportRows = (
  rows: ZhaogangReleaseImportRow[],
  expanded: boolean,
) => expanded ? rows : rows.filter(row => !COLLAPSIBLE_STATUSES.has(row.status))
