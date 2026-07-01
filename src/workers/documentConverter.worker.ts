import type {
  DocumentWorkerRequest,
  DocumentWorkerResponse
} from '@/types/documentConverter'
import { convertDocuments } from '@/utils/document-converter/converters'

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<DocumentWorkerRequest>) => void) | null
  postMessage: (message: DocumentWorkerResponse, transfer?: Transferable[]) => void
}

ctx.onmessage = async (event: MessageEvent<DocumentWorkerRequest>) => {
  const request = event.data

  try {
    const result = await convertDocuments(request.files, request.settings)
    const transfers = result.items
      .map((item) => item.data)
      .filter((data): data is ArrayBuffer => Boolean(data))

    ctx.postMessage({
      id: request.id,
      ok: true,
      result
    }, transfers)
  } catch (error: any) {
    ctx.postMessage({
      id: request.id,
      ok: false,
      error: error?.message || '文档处理失败'
    })
  }
}
