import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { supportedLanguages } from '@crm/utils/i18nUtils'

export const languages = supportedLanguages.map((language) => language.code)

const namespaces = [
  'common',
  'crm-components',
  'components',
  'dynamic',
  'crm/bookings',
  'crm/clients',
  'crm/dashboard',
  'crm/funnel',
  'crm/services',
  'crm/settings',
  'crm/tasks',
  'crm/users',
  'telephony',
  'manager/chat',
  'employee/dashboard',
  'employee/profile',
  'employee/services',
  'auth/login',
  'auth/register',
  'auth/forgotpassword',
  'auth/reset_password',
  'auth/verify_email',
  'layouts/mainlayout',
  'components/languageswitcher',
]

const localeFiles = (import.meta as any).glob(
  [
    './locales/*/common.json',
    './locales/*/crm-components.json',
    './locales/*/components.json',
    './locales/*/dynamic.json',
    './locales/*/crm/*.json',
    './locales/*/telephony.json',
    './locales/*/manager/chat.json',
    './locales/*/employee/dashboard.json',
    './locales/*/employee/profile.json',
    './locales/*/employee/services.json',
    './locales/*/auth/*.json',
    './locales/*/layouts/mainlayout.json',
    './locales/*/components/languageswitcher.json',
  ],
  { eager: true },
)

const lowercaseLocaleFiles: Record<string, string> = {}
Object.keys(localeFiles).forEach((key) => {
  lowercaseLocaleFiles[key.toLowerCase()] = key
})

const resources: Record<string, any> = {}

for (const lang of languages) {
  resources[lang] = {}
  for (const namespace of namespaces) {
    const standardKey = `./locales/${lang}/${namespace}.json`
    const lookupKey = lowercaseLocaleFiles[standardKey.toLowerCase()] ?? standardKey
    if (localeFiles[lookupKey]) {
      resources[lang][namespace] = (localeFiles[lookupKey] as any).default || localeFiles[lookupKey]
    } else {
      resources[lang][namespace] = {}
    }
  }

  resources[lang].bookings = resources[lang]['crm/bookings']
  resources[lang].clients = resources[lang]['crm/clients']
  resources[lang].settings = resources[lang]['crm/settings']
  resources[lang].services = resources[lang]['crm/services']
  resources[lang].telephony = resources[lang].telephony
  resources[lang].chat = resources[lang]['manager/chat']
  resources[lang]['employee/Dashboard'] = resources[lang]['employee/dashboard']
  resources[lang]['components/LanguageSwitcher'] = resources[lang]['components/languageswitcher']
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    defaultNS: 'common',
    ns: namespaces,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      caches: ['localStorage'],
    },
  })

export default i18n
