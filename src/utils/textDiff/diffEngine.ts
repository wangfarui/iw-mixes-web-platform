import {
  createTwoFilesPatch,
  diffChars,
  diffLines,
  diffWordsWithSpace,
  type Change
} from 'diff'
import type {
  DiffComputeOptions,
  DiffContextSize,
  DiffGranularity,
  DiffResult,
  DiffRow,
  InlineSegment
} from '../../types/textDiff'
import { DIFF_LIMITS } from './config'
import { applyIgnoreOptions } from './preprocess'
import { calculateTextMetrics, splitDiffValueToLines } from './textMetrics'

const createEmptySegments = (text: string): InlineSegment[] => text ? [{ text, type: 'equal' }] : []

const buildInlineSegments = (
  oldText: string,
  newText: string,
  granularity: DiffGranularity
) => {
  const changes = granularity === 'char'
    ? diffChars(oldText, newText, { timeout: DIFF_LIMITS.diffTimeoutMs })
    : diffWordsWithSpace(oldText, newText, { timeout: DIFF_LIMITS.diffTimeoutMs })

  if (!changes) {
    return {
      oldSegments: createEmptySegments(oldText),
      newSegments: createEmptySegments(newText)
    }
  }

  const oldSegments: InlineSegment[] = []
  const newSegments: InlineSegment[] = []

  changes.forEach((change) => {
    if (change.added) {
      newSegments.push({ text: change.value, type: 'added' })
      return
    }

    if (change.removed) {
      oldSegments.push({ text: change.value, type: 'removed' })
      return
    }

    oldSegments.push({ text: change.value, type: 'equal' })
    newSegments.push({ text: change.value, type: 'equal' })
  })

  return { oldSegments, newSegments }
}

const makeRowId = (rows: DiffRow[]) => `diff-row-${rows.length + 1}`

const appendContextRows = (
  rows: DiffRow[],
  lines: string[],
  oldLineNumberRef: { value: number },
  newLineNumberRef: { value: number }
) => {
  lines.forEach((line) => {
    rows.push({
      id: makeRowId(rows),
      type: 'context',
      oldLineNumber: oldLineNumberRef.value,
      newLineNumber: newLineNumberRef.value,
      oldText: line,
      newText: line,
      oldSegments: createEmptySegments(line),
      newSegments: createEmptySegments(line)
    })
    oldLineNumberRef.value += 1
    newLineNumberRef.value += 1
  })
}

const appendAddedRows = (
  rows: DiffRow[],
  lines: string[],
  newLineNumberRef: { value: number }
) => {
  lines.forEach((line) => {
    rows.push({
      id: makeRowId(rows),
      type: 'added',
      newLineNumber: newLineNumberRef.value,
      oldText: '',
      newText: line,
      oldSegments: [],
      newSegments: [{ text: line, type: 'added' }]
    })
    newLineNumberRef.value += 1
  })
}

const appendRemovedRows = (
  rows: DiffRow[],
  lines: string[],
  oldLineNumberRef: { value: number }
) => {
  lines.forEach((line) => {
    rows.push({
      id: makeRowId(rows),
      type: 'removed',
      oldLineNumber: oldLineNumberRef.value,
      oldText: line,
      newText: '',
      oldSegments: [{ text: line, type: 'removed' }],
      newSegments: []
    })
    oldLineNumberRef.value += 1
  })
}

const appendModifiedRows = (
  rows: DiffRow[],
  removedLines: string[],
  addedLines: string[],
  oldLineNumberRef: { value: number },
  newLineNumberRef: { value: number },
  granularity: DiffGranularity
) => {
  const maxLength = Math.max(removedLines.length, addedLines.length)

  for (let index = 0; index < maxLength; index += 1) {
    const oldText = removedLines[index]
    const newText = addedLines[index]

    if (oldText !== undefined && newText !== undefined) {
      const { oldSegments, newSegments } = buildInlineSegments(oldText, newText, granularity)
      rows.push({
        id: makeRowId(rows),
        type: 'modified',
        oldLineNumber: oldLineNumberRef.value,
        newLineNumber: newLineNumberRef.value,
        oldText,
        newText,
        oldSegments,
        newSegments
      })
      oldLineNumberRef.value += 1
      newLineNumberRef.value += 1
      continue
    }

    if (oldText !== undefined) {
      appendRemovedRows(rows, [oldText], oldLineNumberRef)
      continue
    }

    if (newText !== undefined) {
      appendAddedRows(rows, [newText], newLineNumberRef)
    }
  }
}

const buildRows = (changes: Change[], granularity: DiffGranularity) => {
  const rows: DiffRow[] = []
  const oldLineNumberRef = { value: 1 }
  const newLineNumberRef = { value: 1 }

  for (let index = 0; index < changes.length; index += 1) {
    const change = changes[index]
    const nextChange = changes[index + 1]

    if (change.removed && nextChange?.added) {
      appendModifiedRows(
        rows,
        splitDiffValueToLines(change.value),
        splitDiffValueToLines(nextChange.value),
        oldLineNumberRef,
        newLineNumberRef,
        granularity
      )
      index += 1
      continue
    }

    if (change.added) {
      appendAddedRows(rows, splitDiffValueToLines(change.value), newLineNumberRef)
      continue
    }

    if (change.removed) {
      appendRemovedRows(rows, splitDiffValueToLines(change.value), oldLineNumberRef)
      continue
    }

    appendContextRows(
      rows,
      splitDiffValueToLines(change.value),
      oldLineNumberRef,
      newLineNumberRef
    )
  }

  let blockIndex = 0
  let inBlock = false

  rows.forEach((row) => {
    if (row.type === 'context') {
      inBlock = false
      return
    }

    if (!inBlock) {
      blockIndex += 1
      inBlock = true
    }
    row.blockIndex = blockIndex
  })

  return rows
}

export const getChangedRowIndexes = (rows: DiffRow[]) => {
  return rows
    .map((row, index) => row.type !== 'context' && row.type !== 'fold' ? index : -1)
    .filter((index) => index >= 0)
}

export const buildDisplayRows = (
  rows: DiffRow[],
  collapseUnchanged: boolean,
  contextSize: DiffContextSize
) => {
  if (!collapseUnchanged || contextSize === 'all') {
    return rows
  }

  const context = contextSize
  const displayRows: DiffRow[] = []
  let index = 0

  const pushFoldRow = (hiddenCount: number, sourceIndex: number) => {
    if (hiddenCount <= 0) {
      return
    }

    displayRows.push({
      id: `fold-${sourceIndex}-${hiddenCount}`,
      type: 'fold',
      oldText: '',
      newText: '',
      oldSegments: [],
      newSegments: [],
      hiddenCount
    })
  }

  while (index < rows.length) {
    if (rows[index].type !== 'context') {
      displayRows.push(rows[index])
      index += 1
      continue
    }

    const start = index
    while (index < rows.length && rows[index].type === 'context') {
      index += 1
    }
    const run = rows.slice(start, index)
    const hasPreviousChange = start > 0
    const hasNextChange = index < rows.length

    if (!hasPreviousChange && hasNextChange && run.length > context) {
      pushFoldRow(run.length - context, start)
      displayRows.push(...run.slice(-context))
      continue
    }

    if (hasPreviousChange && !hasNextChange && run.length > context) {
      displayRows.push(...run.slice(0, context))
      pushFoldRow(run.length - context, start + context)
      continue
    }

    if (hasPreviousChange && hasNextChange && run.length > context * 2) {
      displayRows.push(...run.slice(0, context))
      pushFoldRow(run.length - context * 2, start + context)
      displayRows.push(...run.slice(-context))
      continue
    }

    displayRows.push(...run)
  }

  return displayRows
}

export const computeTextDiff = (
  oldText: string,
  newText: string,
  options: DiffComputeOptions
): DiffResult => {
  const startedAt = performance.now()
  const oldProcessed = applyIgnoreOptions(oldText, options.ignoreOptions)
  const newProcessed = applyIgnoreOptions(newText, options.ignoreOptions)
  const warnings = [...oldProcessed.warnings, ...newProcessed.warnings]
  const totalCharacters = oldProcessed.text.length + newProcessed.text.length
  const totalLines = oldProcessed.text.split('\n').length + newProcessed.text.split('\n').length

  if (totalCharacters > DIFF_LIMITS.largeTextCharacters || totalLines > DIFF_LIMITS.largeTextLines) {
    warnings.push('当前文本较大，已在 Web Worker 中计算；如结果很慢，建议切换为行级 diff。')
  }

  if (totalCharacters > DIFF_LIMITS.hugeTextCharacters || totalLines > DIFF_LIMITS.hugeTextLines) {
    warnings.push('文本已达到超大规模，建议优先使用行级 diff 并折叠未变更内容。')
  }

  const lineChanges = diffLines(oldProcessed.text, newProcessed.text, {
    stripTrailingCr: options.ignoreOptions.ignoreLineEndings,
    ignoreNewlineAtEof: options.ignoreOptions.ignoreTrailingNewline,
    timeout: DIFF_LIMITS.diffTimeoutMs
  })

  if (!lineChanges) {
    throw new Error('Diff 计算超时，请改用行级 diff、减少文本规模或开启忽略规则后重试。')
  }

  const rows = buildRows(lineChanges, options.granularity)
  const changedRows = rows.filter((row) => row.type !== 'context' && row.type !== 'fold')
  const blocks = changedRows.reduce((max, row) => Math.max(max, row.blockIndex || 0), 0)
  const oldFileName = options.oldFileName || 'old.txt'
  const newFileName = options.newFileName || 'new.txt'
  const unifiedDiff = createTwoFilesPatch(
    oldFileName,
    newFileName,
    oldProcessed.text,
    newProcessed.text,
    'Old',
    'New',
    {
      context: 3,
      stripTrailingCr: options.ignoreOptions.ignoreLineEndings
    }
  )

  const durationMs = Math.round(performance.now() - startedAt)

  return {
    rows,
    stats: {
      added: rows.filter((row) => row.type === 'added').length,
      deleted: rows.filter((row) => row.type === 'removed').length,
      modified: rows.filter((row) => row.type === 'modified').length,
      unchanged: rows.filter((row) => row.type === 'context').length,
      blocks,
      oldMetrics: calculateTextMetrics(oldText),
      newMetrics: calculateTextMetrics(newText),
      processedOldCharacters: oldProcessed.text.length,
      processedNewCharacters: newProcessed.text.length,
      durationMs
    },
    unifiedDiff,
    activeIgnoreRules: Array.from(new Set([
      ...oldProcessed.activeRules,
      ...newProcessed.activeRules
    ])),
    warnings,
    comparedAt: new Date().toISOString(),
    oldFileName,
    newFileName,
    processedOldText: oldProcessed.text,
    processedNewText: newProcessed.text
  }
}
