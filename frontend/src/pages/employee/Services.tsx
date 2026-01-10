import { useEffect, useState } from 'react';
import { Scissors, Clock, AlertCircle } from 'lucide-react';
import { Skeleton } from '../../components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { api } from '../../services/api';

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
}

export default function EmployeeServices() {
  const { t } = useTranslation(['employee/services', 'common']);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await api.getServices();
      setServices(data.services || []);
    } catch (err: any) {
      console.error('Error loading services:', err);
      setError(err.message || t('common:error_loading'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{t('common:error')}: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <Scissors className="w-8 h-8 text-pink-600" />
          {t('employeeServices:our_services')}
        </h1>
        <p className="text-gray-600">{t('employeeServices:browse_available_services')}</p>
      </div>

      {services.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Scissors className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">{t('employeeServices:no_services')}</h3>
          <p className="text-gray-600">{t('employeeServices:no_services_description')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service: any) => {
            const serviceName = i18n.language === 'ru' ? (service.name_ru || service.name) : (service.name_en || service.name);
            const serviceDesc = i18n.language === 'ru' ? (service.description_ru || service.description) : (service.description_en || service.description);

            return (
              <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{serviceName}</h3>
                    {service.category && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {service.category}
                      </span>
                    )}
                  </div>
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Scissors className="w-6 h-6 text-white" />
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{serviceDesc}</p>

                <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{service.duration} {t('employeeServices:min')}</span>
                  </div>
                  <div className="flex items-center gap-1 font-medium text-pink-600">
                    <span className="text-xs uppercase font-bold">{service.currency || 'USD'}</span>
                    <span>{service.price}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
