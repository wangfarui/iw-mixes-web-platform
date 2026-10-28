export interface SystemCapabilities { manageSystemOptions: boolean; repairSystemOptions: boolean }
export interface FixedOption { code: number; name: string; sort: number }
export interface SystemDefinition { domain: string; type: number; name: string; options: FixedOption[] }
export interface SystemDifference { type: number; name: string; code: number; option: string; addCount: number; correctCount: number }
export interface SystemPreview { definitions: SystemDefinition[]; differences: SystemDifference[]; issues: string[]; scopeVersion: string; userCount: number; addCount: number; correctCount: number }
export interface SystemSyncResult { changedCount: number; cacheRefreshed: boolean }
