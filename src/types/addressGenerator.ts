export type AddressLocaleCode =
    | 'cs_CZ'
    | 'da'
    | 'de'
    | 'de_AT'
    | 'de_CH'
    | 'en_AU'
    | 'en_CA'
    | 'en_GB'
    | 'en_GH'
    | 'en_HK'
    | 'en_IN'
    | 'en_NG'
    | 'en_US'
    | 'en_ZA'
    | 'es'
    | 'es_MX'
    | 'fi'
    | 'fr'
    | 'fr_BE'
    | 'fr_CA'
    | 'id_ID'
    | 'it'
    | 'ja'
    | 'ko'
    | 'nb_NO'
    | 'nl'
    | 'nl_BE'
    | 'pl'
    | 'pt_BR'
    | 'pt_PT'
    | 'ro'
    | 'ru'
    | 'sv'
    | 'th'
    | 'tr'
    | 'uk'
    | 'vi'
    | 'zh_CN'
    | 'zh_TW'

export type AddressCountrySelection = 'random' | string
export type AddressLocaleSelection = 'auto' | AddressLocaleCode
export type AddressFieldNaming = 'camel' | 'snake' | 'chinese'
export type AddressExportFormat = 'json' | 'csv' | 'txt'

export interface AddressCountryOption {
    code: string
    name: string
    localName: string
    region: string
    localeCode: AddressLocaleCode
}

export interface AddressLocaleOption {
    code: AddressLocaleCode
    label: string
}

export interface AddressGeneratorSettings {
    countryCode: AddressCountrySelection
    localeCode: AddressLocaleSelection
    fieldNaming: AddressFieldNaming
    seed: string
    includeCoordinates: boolean
}

export interface GeneratedUserProfile {
    userId: string
    username: string
    fullName: string
    gender: 'male' | 'female'
    genderLabel: string
    birthday: string
    age: number
    email: string
    phone: string
    company: string
    jobTitle: string
    avatarUrl: string
    tags: string[]
}

export interface GeneratedAddressInfo {
    country: string
    countryLocalName: string
    countryCode: string
    region: string
    state: string
    city: string
    district: string
    street: string
    buildingNumber: string
    streetAddress: string
    postalCode: string
    fullAddress: string
    latitude?: string
    longitude?: string
}

export interface GeneratedAddressProfile {
    id: string
    generatedAt: string
    localeCode: AddressLocaleCode
    user: GeneratedUserProfile
    address: GeneratedAddressInfo
}

export interface AddressHistoryRecord {
    id: string
    createdAt: string
    title: string
    summary: string
    profile: GeneratedAddressProfile
}
