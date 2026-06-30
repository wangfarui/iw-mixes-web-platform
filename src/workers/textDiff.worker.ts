import type { DiffWorkerRequest, DiffWorkerResponse } from '../types/textDiff'
import { computeTextDiff } from '../utils/textDiff/diffEngine'

self.onmessage = (event: MessageEvent<DiffWorkerRequest>) => {
  const request = event.data

  try {
    const result = computeTextDiff(request.oldText, request.newText, request.options)
    const response: DiffWorkerResponse = {
      id: request.id,
      ok: true,
      result
    }
    self.postMessage(response)
  } catch (error: any) {
    const response: DiffWorkerResponse = {
      id: request.id,
      ok: false,
      error: error?.message || 'Diff 计算失败'
    }
    self.postMessage(response)
  }
}
