import type {
    AddressHistoryRecord,
    GeneratedAddressProfile
} from '@/types/addressGenerator'
import {
    ADDRESS_HISTORY_STORAGE_KEY,
    MAX_ADDRESS_HISTORY_RECORDS
} from './config'

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

export const createAddressHistoryRecord = (
    profile: GeneratedAddressProfile
): AddressHistoryRecord => ({
    id: `address-history-${Date.now()}-${profile.id}`,
    createdAt: new Date().toISOString(),
    title: profile.user.fullName,
    summary: `${profile.address.countryLocalName} / ${profile.address.city || profile.address.country}`,
    profile
})

export const listAddressHistoryRecords = (): AddressHistoryRecord[] => {
    return readStorage<AddressHistoryRecord[]>(ADDRESS_HISTORY_STORAGE_KEY, [])
}

export const saveAddressHistoryRecord = (record: AddressHistoryRecord) => {
    const records = listAddressHistoryRecords()
        .filter((item) => item.id !== record.id && item.profile.id !== record.profile.id)

    records.unshift(record)
    writeStorage(ADDRESS_HISTORY_STORAGE_KEY, records.slice(0, MAX_ADDRESS_HISTORY_RECORDS))
}

export const deleteAddressHistoryRecord = (id: string) => {
    writeStorage(
        ADDRESS_HISTORY_STORAGE_KEY,
        listAddressHistoryRecords().filter((record) => record.id !== id)
    )
}

export const clearAddressHistoryRecords = () => {
    writeStorage(ADDRESS_HISTORY_STORAGE_KEY, [])
}

export const serializeAddressHistoryRecords = (
    records: AddressHistoryRecord[]
): string => {
    return JSON.stringify({
        exportedAt: new Date().toISOString(),
        source: 'iw-mixes-web-platform:address-generator',
        records
    }, null, 2)
}

export const exportAddressHistoryRecords = (): string => {
    return serializeAddressHistoryRecords(listAddressHistoryRecords())
}
