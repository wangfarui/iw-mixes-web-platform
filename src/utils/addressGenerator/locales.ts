import type { Faker } from '@faker-js/faker'
import type { AddressLocaleCode } from '@/types/addressGenerator'

type FakerLocaleModule = {
    faker: Faker
}

const addressFakerLoaders: Record<AddressLocaleCode, () => Promise<FakerLocaleModule>> = {
    cs_CZ: () => import('@faker-js/faker/locale/cs_CZ'),
    da: () => import('@faker-js/faker/locale/da'),
    de: () => import('@faker-js/faker/locale/de'),
    de_AT: () => import('@faker-js/faker/locale/de_AT'),
    de_CH: () => import('@faker-js/faker/locale/de_CH'),
    en_AU: () => import('@faker-js/faker/locale/en_AU'),
    en_CA: () => import('@faker-js/faker/locale/en_CA'),
    en_GB: () => import('@faker-js/faker/locale/en_GB'),
    en_GH: () => import('@faker-js/faker/locale/en_GH'),
    en_HK: () => import('@faker-js/faker/locale/en_HK'),
    en_IN: () => import('@faker-js/faker/locale/en_IN'),
    en_NG: () => import('@faker-js/faker/locale/en_NG'),
    en_US: () => import('@faker-js/faker/locale/en_US'),
    en_ZA: () => import('@faker-js/faker/locale/en_ZA'),
    es: () => import('@faker-js/faker/locale/es'),
    es_MX: () => import('@faker-js/faker/locale/es_MX'),
    fi: () => import('@faker-js/faker/locale/fi'),
    fr: () => import('@faker-js/faker/locale/fr'),
    fr_BE: () => import('@faker-js/faker/locale/fr_BE'),
    fr_CA: () => import('@faker-js/faker/locale/fr_CA'),
    id_ID: () => import('@faker-js/faker/locale/id_ID'),
    it: () => import('@faker-js/faker/locale/it'),
    ja: () => import('@faker-js/faker/locale/ja'),
    ko: () => import('@faker-js/faker/locale/ko'),
    nb_NO: () => import('@faker-js/faker/locale/nb_NO'),
    nl: () => import('@faker-js/faker/locale/nl'),
    nl_BE: () => import('@faker-js/faker/locale/nl_BE'),
    pl: () => import('@faker-js/faker/locale/pl'),
    pt_BR: () => import('@faker-js/faker/locale/pt_BR'),
    pt_PT: () => import('@faker-js/faker/locale/pt_PT'),
    ro: () => import('@faker-js/faker/locale/ro'),
    ru: () => import('@faker-js/faker/locale/ru'),
    sv: () => import('@faker-js/faker/locale/sv'),
    th: () => import('@faker-js/faker/locale/th'),
    tr: () => import('@faker-js/faker/locale/tr'),
    uk: () => import('@faker-js/faker/locale/uk'),
    vi: () => import('@faker-js/faker/locale/vi'),
    zh_CN: () => import('@faker-js/faker/locale/zh_CN'),
    zh_TW: () => import('@faker-js/faker/locale/zh_TW')
}

const fakerCache: Partial<Record<AddressLocaleCode, Faker>> = {}

export const getAddressFaker = async (localeCode: AddressLocaleCode): Promise<Faker> => {
    const cachedFaker = fakerCache[localeCode]

    if (cachedFaker) {
        return cachedFaker
    }

    const loader = addressFakerLoaders[localeCode] || addressFakerLoaders.en_US
    const module = await loader()
    fakerCache[localeCode] = module.faker

    return module.faker
}
