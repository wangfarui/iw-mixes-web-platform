import type { ZgWorkbenchAgentState, ZgWorkbenchAgentUpdateInfo } from '@/services/zgWorkbenchAgentClient'

type AgentUpdateState = Pick<ZgWorkbenchAgentState, 'running'>
type AgentUpdateInfo = Pick<ZgWorkbenchAgentUpdateInfo, 'updateAvailable'>

export const shouldCheckZgWorkbenchAgentUpdate = (state: AgentUpdateState) => state.running

export const canStartZgWorkbenchAgentUpdate = (
  state: AgentUpdateState | null,
  updateInfo: AgentUpdateInfo | null
) => Boolean(state?.running && updateInfo?.updateAvailable)
