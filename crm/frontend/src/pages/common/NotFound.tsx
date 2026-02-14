import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl font-semibold text-gray-800 mb-2">
          {t('not_found_title', { defaultValue: 'Страница не найдена' })}
        </p>
        <p className="text-gray-600 mb-8">
          {t('not_found_description', { defaultValue: 'Проверьте адрес или вернитесь в CRM.' })}
        </p>
        <Link
          to="/crm/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
        >
          {t('back_to_dashboard', { defaultValue: 'Вернуться в CRM' })}
        </Link>
      </div>
    </div>
  );
}
