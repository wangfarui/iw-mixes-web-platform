import type { Faker } from '@faker-js/faker'
import type {
    AddressCountryOption,
    AddressGeneratorSettings,
    AddressLocaleCode,
    GeneratedAddressInfo,
    GeneratedAddressProfile,
    GeneratedUserProfile
} from '@/types/addressGenerator'
import {
    ADDRESS_COUNTRY_OPTIONS,
    AUTO_LOCALE_VALUE,
    RANDOM_COUNTRY_VALUE,
    findAddressCountry
} from './config'
import { getAddressFaker } from './locales'

const EAST_ASIAN_LOCALES: AddressLocaleCode[] = ['zh_CN', 'zh_TW', 'ja', 'ko']

const PROFILE_TAGS = [
    'demo-user',
    'form-test',
    'api-mock',
    'local-only',
    'address-test',
    'sample-data'
]

const hashSeedToNumber = (value: string): number => {
    let hash = 2166136261

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index)
        hash = Math.imul(hash, 16777619)
    }

    return hash >>> 0
}

const createSeededRandom = (seedText: string) => {
    let state = hashSeedToNumber(seedText) || 1

    return () => {
        state = Math.imul(state, 1664525) + 1013904223
        return (state >>> 0) / 4294967296
    }
}

const pickCountry = (settings: AddressGeneratorSettings): AddressCountryOption => {
    if (settings.countryCode !== RANDOM_COUNTRY_VALUE) {
        return findAddressCountry(settings.countryCode) || ADDRESS_COUNTRY_OPTIONS[0]
    }

    const random = settings.seed.trim()
        ? createSeededRandom(`country:${settings.seed.trim()}`)()
        : Math.random()
    const index = Math.floor(random * ADDRESS_COUNTRY_OPTIONS.length)

    return ADDRESS_COUNTRY_OPTIONS[Math.min(index, ADDRESS_COUNTRY_OPTIONS.length - 1)]
}

const resolveLocale = (
    settings: AddressGeneratorSettings,
    country: AddressCountryOption
): AddressLocaleCode => {
    return settings.localeCode === AUTO_LOCALE_VALUE ? country.localeCode : settings.localeCode
}

const seedFaker = (
    faker: Faker,
    country: AddressCountryOption,
    localeCode: AddressLocaleCode,
    settings: AddressGeneratorSettings
) => {
    const seedText = settings.seed.trim()
        || `${Date.now()}-${country.code}-${localeCode}-${Math.random()}`

    faker.seed(hashSeedToNumber(`address-generator:${country.code}:${localeCode}:${seedText}`))
}

const safeText = (factory: () => string | number | undefined, fallback = ''): string => {
    try {
        const value = factory()
        return value === undefined || value === null ? fallback : String(value)
    } catch {
        return fallback
    }
}

const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

const calculateAge = (birthday: Date): number => {
    const today = new Date()
    let age = today.getFullYear() - birthday.getFullYear()
    const monthDiff = today.getMonth() - birthday.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
        age -= 1
    }

    return age
}

const createProfileId = (faker: Faker, countryCode: string): string => {
    return `USR-${countryCode}-${faker.string.alphanumeric(8).toUpperCase()}`
}

const createTags = (faker: Faker): string[] => {
    return faker.helpers.shuffle(PROFILE_TAGS).slice(0, 3)
}

const createUserProfile = (faker: Faker, country: AddressCountryOption): GeneratedUserProfile => {
    const gender = safeText(() => faker.person.sexType(), 'male') === 'female' ? 'female' : 'male'
    const birthday = faker.date.birthdate({min: 18, max: 70, mode: 'age'})
    const fullName = safeText(() => faker.person.fullName({sex: gender}), faker.person.fullName())
    const username = safeText(() => faker.internet.username(), faker.string.alphanumeric(10).toLowerCase())

    return {
        userId: createProfileId(faker, country.code),
        username,
        fullName,
        gender,
        genderLabel: gender === 'female' ? 'Female' : 'Male',
        birthday: formatDate(birthday),
        age: calculateAge(birthday),
        email: safeText(() => faker.internet.email()),
        phone: safeText(() => faker.phone.number()),
        company: safeText(() => faker.company.name()),
        jobTitle: safeText(() => faker.person.jobTitle()),
        avatarUrl: safeText(() => faker.image.avatar()),
        tags: createTags(faker)
    }
}

const compactJoin = (values: string[], separator: string): string => {
    return values.map((value) => value.trim()).filter(Boolean).join(separator)
}

const formatFullAddress = (
    address: Omit<GeneratedAddressInfo, 'fullAddress'>,
    localeCode: AddressLocaleCode
): string => {
    if (EAST_ASIAN_LOCALES.includes(localeCode)) {
        return compactJoin([
            address.countryLocalName || address.country,
            address.state,
            address.city,
            address.district,
            address.streetAddress,
            address.postalCode
        ], '')
    }

    return compactJoin([
        address.streetAddress,
        address.district,
        address.city,
        address.state,
        address.postalCode,
        address.country
    ], ', ')
}

const createAddressInfo = (
    faker: Faker,
    country: AddressCountryOption,
    localeCode: AddressLocaleCode,
    includeCoordinates: boolean
): GeneratedAddressInfo => {
    const state = safeText(() => faker.location.state())
    const city = safeText(() => faker.location.city())
    const district = safeText(() => faker.location.county())
    const street = safeText(() => faker.location.street())
    const buildingNumber = safeText(() => faker.location.buildingNumber())
    const streetAddress = safeText(
        () => faker.location.streetAddress(),
        compactJoin([street, buildingNumber], ' ')
    )
    const addressWithoutFullAddress = {
        country: country.name,
        countryLocalName: country.localName,
        countryCode: country.code,
        region: country.region,
        state,
        city,
        district,
        street,
        buildingNumber,
        streetAddress,
        postalCode: safeText(() => faker.location.zipCode())
    }

    return {
        ...addressWithoutFullAddress,
        fullAddress: formatFullAddress(addressWithoutFullAddress, localeCode),
        latitude: includeCoordinates ? safeText(() => faker.location.latitude()) : undefined,
        longitude: includeCoordinates ? safeText(() => faker.location.longitude()) : undefined
    }
}

export const generateAddressProfile = (
    settings: AddressGeneratorSettings
): Promise<GeneratedAddressProfile> => {
    const country = pickCountry(settings)
    const localeCode = resolveLocale(settings, country)
    return getAddressFaker(localeCode).then((faker) => {
        seedFaker(faker, country, localeCode, settings)

        return {
            id: faker.string.uuid(),
            generatedAt: new Date().toISOString(),
            localeCode,
            user: createUserProfile(faker, country),
            address: createAddressInfo(faker, country, localeCode, settings.includeCoordinates)
        }
    })
}
