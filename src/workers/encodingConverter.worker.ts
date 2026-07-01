import type { EncodingWorkerRequest, EncodingWorkerResponse } from '@/types/encodingConverter'
import { convertEncodingText } from '@/utils/encodingConverter/converters'

self.onmessage = async (event: MessageEvent<EncodingWorkerRequest>) => {
  const { id, input, settings } = event.data

  try {
    const result = await convertEncodingText(input, settings)
    const response: EncodingWorkerResponse = {
      id,
      ok: true,
      result
    }
    self.postMessage(response)
  } catch (error: any) {
    const response: EncodingWorkerResponse = {
      id,
      ok: false,
      error: error?.message || '编码转换失败'
    }
    self.postMessage(response)
  }
}
