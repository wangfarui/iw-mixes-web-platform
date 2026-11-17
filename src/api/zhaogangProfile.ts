import { zhaogangRequest } from './zhaogang'

export interface WorkbenchMobilePreference { mobile: string | null }
export const getWorkbenchMobile = () => zhaogangRequest<WorkbenchMobilePreference>('/profile/mobile')
export const updateWorkbenchMobile = (mobile: string) => zhaogangRequest<WorkbenchMobilePreference>(
  '/profile/mobile', { method: 'PUT', body: JSON.stringify({ mobile }) }
)
