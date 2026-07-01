import type { FormatterWorkerRequest, FormatterWorkerResponse } from '@/types/formatter'
import { formatText } from '@/utils/formatter/formatters'

self.onmessage = (event: MessageEvent<FormatterWorkerRequest>) => {
  const { id, input, fileName, settings } = event.data

  try {
    const result = formatText(input, settings, fileName)
    const response: FormatterWorkerResponse = {
      id,
      ok: true,
      result
    }
    self.postMessage(response)
  } catch (error: any) {
    const response: FormatterWorkerResponse = {
      id,
      ok: false,
      error: error?.message || '格式化失败'
    }
    self.postMessage(response)
  }
}
