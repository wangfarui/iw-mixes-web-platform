export type ZhaogangAiExecutionLocation = 'AUTO' | 'SERVER' | 'LOCAL_AGENT'

export interface ZhaogangAiConfigStatus {
  apiUrl: string
  configured: boolean
  apiKeyMasked: string
  model: string
  executionLocation: ZhaogangAiExecutionLocation
}

export interface ZhaogangAiConfigCommand {
  apiUrl: string
  apiKey?: string
  model: string
  executionLocation: ZhaogangAiExecutionLocation
}

export interface ZhaogangAgentTicket {
  ticket: string
  recognitionTaskId: string
  backendUrl: string
  expiresInSeconds: number
}
