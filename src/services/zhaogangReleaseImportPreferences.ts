export const DEFAULT_RELEASE_IMPORT_PROJECT_COLUMN = '系统所属OPS'
export const DEFAULT_RELEASE_IMPORT_PLAN_COLUMN = '系统名字'
export const RELEASE_IMPORT_COLUMN_NAMES_KEY = 'zhaogang:release-import-column-names'

export interface ZhaogangReleaseImportColumnNames {
  projectColumnName: string
  planColumnName: string
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

const normalizeColumnName = (value: unknown, fallback: string) => {
  const text = typeof value === 'string' ? value.trim().slice(0, 50) : ''
  return text || fallback
}

export const normalizeReleaseImportColumnNames = (
  value?: Partial<ZhaogangReleaseImportColumnNames> | null,
): ZhaogangReleaseImportColumnNames => ({
  projectColumnName: normalizeColumnName(value?.projectColumnName, DEFAULT_RELEASE_IMPORT_PROJECT_COLUMN),
  planColumnName: normalizeColumnName(value?.planColumnName, DEFAULT_RELEASE_IMPORT_PLAN_COLUMN),
})

export const loadReleaseImportColumnNames = (storage: StorageLike = localStorage) => {
  try {
    return normalizeReleaseImportColumnNames(JSON.parse(storage.getItem(RELEASE_IMPORT_COLUMN_NAMES_KEY) || '{}'))
  } catch {
    return normalizeReleaseImportColumnNames()
  }
}

export const saveReleaseImportColumnNames = (
  value: Partial<ZhaogangReleaseImportColumnNames>,
  storage: StorageLike = localStorage,
) => {
  const normalized = normalizeReleaseImportColumnNames(value)
  storage.setItem(RELEASE_IMPORT_COLUMN_NAMES_KEY, JSON.stringify(normalized))
  return normalized
}
