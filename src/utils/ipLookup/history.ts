import type { IpLookupHistoryRecord } from '@/types/ipLookup'

const IP_LOOKUP_HISTORY_STORAGE_KEY = 'iw:ip-lookup:history-records'

const MAX_IP_LOOKUP_HISTORY_RECORDS = 50

const readStorage = <T>(key: string, fallback: T): T => {
    try {
        const value = localStorage.getItem(key)
        return value ? JSON.parse(value) as T : fallback
    } catch {
        return fallback
    }
}

const writeStorage = (key: string, value: unknown) => {
    localStorage.setItem(key, JSON.stringify(value))
}

const historyRecordKey = (record: IpLookupHistoryRecord): string => {
    return [
        record.result.targetType,
        record.result.normalizedInput,
        record.result.queryPerspective
    ].join('|')
}

export const listIpLookupHistoryRecords = (): IpLookupHistoryRecord[] => {
    return readStorage<IpLookupHistoryRecord[]>(IP_LOOKUP_HISTORY_STORAGE_KEY, [])
}

export const saveIpLookupHistoryRecord = (record: IpLookupHistoryRecord) => {
    const incomingKey = historyRecordKey(record)
    const records = listIpLookupHistoryRecords()
        .filter((item) => item.id !== record.id && historyRecordKey(item) !== incomingKey)

    records.unshift(record)
    writeStorage(IP_LOOKUP_HISTORY_STORAGE_KEY, records.slice(0, MAX_IP_LOOKUP_HISTORY_RECORDS))
}

export const deleteIpLookupHistoryRecord = (id: string) => {
    writeStorage(
        IP_LOOKUP_HISTORY_STORAGE_KEY,
        listIpLookupHistoryRecords().filter((record) => record.id !== id)
    )
}

export const clearIpLookupHistoryRecords = () => {
    writeStorage(IP_LOOKUP_HISTORY_STORAGE_KEY, [])
}
