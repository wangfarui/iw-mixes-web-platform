export interface LocalSessionDraftOptions {
  limit?: number
}

export interface LocalSessionDraft {
  id: number
  titleHint: string
  toolType: string
  modelName: string
  sessionKey: string
  resumeCommand: string
  cwd: string
  gitBranch: string
  transcriptPath: string
  currentSummary: string
  nextAction: string
  lastActiveAt: string
  createdAt: string
}

export function readLocalCodexSessionDrafts(options?: LocalSessionDraftOptions): Promise<LocalSessionDraft[]>
