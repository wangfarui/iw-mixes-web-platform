import type {
    AddressCountryOption,
    AddressGeneratorSettings,
    AddressLocaleOption
} from '@/types/addressGenerator'

export const RANDOM_COUNTRY_VALUE = 'random'
export const AUTO_LOCALE_VALUE = 'auto'
export const ADDRESS_HISTORY_STORAGE_KEY = 'iw:address-generator:history-records'
export const MAX_ADDRESS_HISTORY_RECORDS = 50

export const ADDRESS_COUNTRY_OPTIONS: AddressCountryOption[] = [
    {code: 'US', name: 'United States', localName: '美国', region: '北美', localeCode: 'en_US'},
    {code: 'CA', name: 'Canada', localName: '加拿大', region: '北美', localeCode: 'en_CA'},
    {code: 'GB', name: 'United Kingdom', localName: '英国', region: '欧洲', localeCode: 'en_GB'},
    {code: 'AU', name: 'Australia', localName: '澳大利亚', region: '大洋洲', localeCode: 'en_AU'},
    {code: 'CN', name: 'China', localName: '中国', region: '亚洲', localeCode: 'zh_CN'},
    {code: 'HK', name: 'Hong Kong', localName: '中国香港', region: '亚洲', localeCode: 'en_HK'},
    {code: 'TW', name: 'Taiwan', localName: '中国台湾', region: '亚洲', localeCode: 'zh_TW'},
    {code: 'JP', name: 'Japan', localName: '日本', region: '亚洲', localeCode: 'ja'},
    {code: 'KR', name: 'South Korea', localName: '韩国', region: '亚洲', localeCode: 'ko'},
    {code: 'IN', name: 'India', localName: '印度', region: '亚洲', localeCode: 'en_IN'},
    {code: 'ID', name: 'Indonesia', localName: '印度尼西亚', region: '亚洲', localeCode: 'id_ID'},
    {code: 'TH', name: 'Thailand', localName: '泰国', region: '亚洲', localeCode: 'th'},
    {code: 'VN', name: 'Vietnam', localName: '越南', region: '亚洲', localeCode: 'vi'},
    {code: 'DE', name: 'Germany', localName: '德国', region: '欧洲', localeCode: 'de'},
    {code: 'AT', name: 'Austria', localName: '奥地利', region: '欧洲', localeCode: 'de_AT'},
    {code: 'CH', name: 'Switzerland', localName: '瑞士', region: '欧洲', localeCode: 'de_CH'},
    {code: 'FR', name: 'France', localName: '法国', region: '欧洲', localeCode: 'fr'},
    {code: 'BE', name: 'Belgium', localName: '比利时', region: '欧洲', localeCode: 'fr_BE'},
    {code: 'IT', name: 'Italy', localName: '意大利', region: '欧洲', localeCode: 'it'},
    {code: 'ES', name: 'Spain', localName: '西班牙', region: '欧洲', localeCode: 'es'},
    {code: 'NL', name: 'Netherlands', localName: '荷兰', region: '欧洲', localeCode: 'nl'},
    {code: 'NO', name: 'Norway', localName: '挪威', region: '欧洲', localeCode: 'nb_NO'},
    {code: 'SE', name: 'Sweden', localName: '瑞典', region: '欧洲', localeCode: 'sv'},
    {code: 'DK', name: 'Denmark', localName: '丹麦', region: '欧洲', localeCode: 'da'},
    {code: 'FI', name: 'Finland', localName: '芬兰', region: '欧洲', localeCode: 'fi'},
    {code: 'PL', name: 'Poland', localName: '波兰', region: '欧洲', localeCode: 'pl'},
    {code: 'CZ', name: 'Czech Republic', localName: '捷克', region: '欧洲', localeCode: 'cs_CZ'},
    {code: 'RO', name: 'Romania', localName: '罗马尼亚', region: '欧洲', localeCode: 'ro'},
    {code: 'RU', name: 'Russia', localName: '俄罗斯', region: '欧洲', localeCode: 'ru'},
    {code: 'UA', name: 'Ukraine', localName: '乌克兰', region: '欧洲', localeCode: 'uk'},
    {code: 'TR', name: 'Turkey', localName: '土耳其', region: '欧洲/亚洲', localeCode: 'tr'},
    {code: 'MX', name: 'Mexico', localName: '墨西哥', region: '拉美', localeCode: 'es_MX'},
    {code: 'BR', name: 'Brazil', localName: '巴西', region: '拉美', localeCode: 'pt_BR'},
    {code: 'PT', name: 'Portugal', localName: '葡萄牙', region: '欧洲', localeCode: 'pt_PT'},
    {code: 'ZA', name: 'South Africa', localName: '南非', region: '非洲', localeCode: 'en_ZA'},
    {code: 'NG', name: 'Nigeria', localName: '尼日利亚', region: '非洲', localeCode: 'en_NG'},
    {code: 'GH', name: 'Ghana', localName: '加纳', region: '非洲', localeCode: 'en_GH'}
]

export const ADDRESS_LOCALE_OPTIONS: AddressLocaleOption[] = [
    {code: 'cs_CZ', label: 'cs_CZ · Čeština'},
    {code: 'da', label: 'da · Dansk'},
    {code: 'de', label: 'de · Deutsch'},
    {code: 'de_AT', label: 'de_AT · Deutsch (Österreich)'},
    {code: 'de_CH', label: 'de_CH · Deutsch (Schweiz)'},
    {code: 'en_AU', label: 'en_AU · English (Australia)'},
    {code: 'en_CA', label: 'en_CA · English (Canada)'},
    {code: 'en_GB', label: 'en_GB · English (United Kingdom)'},
    {code: 'en_GH', label: 'en_GH · English (Ghana)'},
    {code: 'en_HK', label: 'en_HK · English (Hong Kong)'},
    {code: 'en_IN', label: 'en_IN · English (India)'},
    {code: 'en_NG', label: 'en_NG · English (Nigeria)'},
    {code: 'en_US', label: 'en_US · English (United States)'},
    {code: 'en_ZA', label: 'en_ZA · English (South Africa)'},
    {code: 'es', label: 'es · Español'},
    {code: 'es_MX', label: 'es_MX · Español (México)'},
    {code: 'fi', label: 'fi · Suomi'},
    {code: 'fr', label: 'fr · Français'},
    {code: 'fr_BE', label: 'fr_BE · Français (Belgique)'},
    {code: 'fr_CA', label: 'fr_CA · Français (Canada)'},
    {code: 'id_ID', label: 'id_ID · Bahasa Indonesia'},
    {code: 'it', label: 'it · Italiano'},
    {code: 'ja', label: 'ja · 日本語'},
    {code: 'ko', label: 'ko · 한국어'},
    {code: 'nb_NO', label: 'nb_NO · Norsk Bokmål'},
    {code: 'pt_BR', label: 'pt_BR · Português (Brasil)'},
    {code: 'pt_PT', label: 'pt_PT · Português (Portugal)'},
    {code: 'nl', label: 'nl · Nederlands'},
    {code: 'nl_BE', label: 'nl_BE · Nederlands (België)'},
    {code: 'pl', label: 'pl · Polski'},
    {code: 'ro', label: 'ro · Română'},
    {code: 'ru', label: 'ru · Русский'},
    {code: 'sv', label: 'sv · Svenska'},
    {code: 'th', label: 'th · ไทย'},
    {code: 'tr', label: 'tr · Türkçe'},
    {code: 'uk', label: 'uk · Українська'},
    {code: 'vi', label: 'vi · Tiếng Việt'},
    {code: 'zh_CN', label: 'zh_CN · 简体中文'},
    {code: 'zh_TW', label: 'zh_TW · 繁體中文'}
]

export const createDefaultAddressGeneratorSettings = (): AddressGeneratorSettings => ({
    countryCode: RANDOM_COUNTRY_VALUE,
    localeCode: AUTO_LOCALE_VALUE,
    fieldNaming: 'camel',
    seed: '',
    includeCoordinates: false
})

export const findAddressCountry = (countryCode: string): AddressCountryOption | undefined => {
    return ADDRESS_COUNTRY_OPTIONS.find((country) => country.code === countryCode)
}
