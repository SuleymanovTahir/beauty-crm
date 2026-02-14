import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { supportedLanguages } from '@crm/utils/i18nUtils'

export const languages = supportedLanguages.map((language) => language.code)

const namespaces = [
  'common',
  'account',
  'admin-components',
  'components',
  'booking',
  'dynamic',
  'admin/analytics',
  'admin/audit-log',
  'admin/bookingdetail',
  'admin/bookings',
  'admin/botsettings',
  'admin/broadcasts',
  'admin/calendar',
  'admin/challenges',
  'admin/clientdetail',
  'admin/clients',
  'admin/contracts',
  'admin/createuser',
  'admin/dashboard',
  'admin/funnel',
  'admin/integrations',
  'admin/invoices',
  'admin/menucustomization',
  'admin/pending_registrations',
  'admin/permissionmanagement',
  'admin/plans',
  'admin/products',
  'admin/promocodes',
  'admin/services',
  'admin/settings',
  'admin/specialpackages',
  'admin/tasks',
  'admin/telephony',
  'admin/trash',
  'admin/users',
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
  'layouts/adminpanellayout',
  'components/languageswitcher',
  'public_landing',
  'public_landing/services',
  'adminpanel/loyaltymanagement',
  'adminpanel/referralprogram',
  'adminpanel/challenges',
]

const localeFiles = (import.meta as any).glob(
  [
    './locales/*/common.json',
    './locales/*/account.json',
    './locales/*/admin-components.json',
    './locales/*/components.json',
    './locales/*/booking.json',
    './locales/*/dynamic.json',
    './locales/*/admin/*.json',
    './locales/*/manager/chat.json',
    './locales/*/employee/dashboard.json',
    './locales/*/employee/profile.json',
    './locales/*/employee/services.json',
    './locales/*/auth/*.json',
    './locales/*/layouts/mainlayout.json',
    './locales/*/layouts/adminpanellayout.json',
    './locales/*/components/languageswitcher.json',
    './locales/*/public_landing.json',
    './locales/*/public_landing/services.json',
    './locales/*/adminPanel/LoyaltyManagement.json',
    './locales/*/adminPanel/referralprogram.json',
    './locales/*/adminPanel/challenges.json',
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

  // Alias namespaces used in CRM UI.
  resources[lang].analytics = resources[lang]['admin/analytics']
  resources[lang].bookingDetail = resources[lang]['admin/bookingdetail']
  resources[lang].bookingdetail = resources[lang]['admin/bookingdetail']
  resources[lang].bookings = resources[lang]['admin/bookings']
  resources[lang].calendar = resources[lang]['admin/calendar']
  resources[lang].clients = resources[lang]['admin/clients']
  resources[lang].settings = resources[lang]['admin/settings']
  resources[lang].services = resources[lang]['admin/services']
  resources[lang].telephony = resources[lang]['admin/telephony']
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
