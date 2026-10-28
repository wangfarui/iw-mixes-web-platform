import request from '@/api/request'
import type { SystemCapabilities, SystemPreview, SystemSyncResult } from '@/types/systemOptions'
const base = '/auth-service/business-settings'
export const systemCapabilities = async (): Promise<SystemCapabilities> => (await request.get(`${base}/capabilities`, { silent: true })).data
export const systemPreview = async (domain: string, type: number): Promise<SystemPreview> => (await request.get(`${base}/${domain}/preview`, { params: { type } })).data
export const syncSystemOptions = async (domain: string, type: number, scopeVersion: string): Promise<SystemSyncResult> => (await request.post(`${base}/${domain}/sync`, { scopeVersion }, { params: { type } })).data
export const refreshSystemOptionsCache = async (domain: string): Promise<boolean> => (await request.post(`${base}/${domain}/refresh-cache`)).data
export const legacySystemType = async (id: string): Promise<number | null> => (await request.get(`${base}/legacy-type`, { params: { id } })).data
