declare module 'mammoth' {
  export interface MammothMessage {
    type: 'warning' | 'error' | string
    message: string
  }

  export interface MammothResult {
    value: string
    messages: MammothMessage[]
  }

  export interface MammothInput {
    arrayBuffer: ArrayBuffer
  }

  export function convertToHtml(input: MammothInput, options?: Record<string, unknown>): Promise<MammothResult>
  export function extractRawText(input: MammothInput, options?: Record<string, unknown>): Promise<MammothResult>
}
