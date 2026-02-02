// /frontend/src/pages/admin/ServiceSelector.tsx
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';

interface Service {
  id: number;
  name: string;
  category: string;
}

export function ServiceSelector({ 
  selectedServices, 
  onServicesChange,
  onSave
}: {
  selectedServices: number[];
  onServicesChange: (ids: number[]) => void;
  onSave: () => void;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await api.getServices(true);
      setServices(data.services || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (serviceId: number) => {
    if (selectedServices.includes(serviceId)) {
      onServicesChange(selectedServices.filter(id => id !== serviceId));
    } else {
      onServicesChange([...selectedServices, serviceId]);
    }
  };

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="space-y-6">
      {Object.entries(groupedServices).map(([category, categoryServices]) => (
        <div key={category} className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">{category}</h3>
          <div className="space-y-2">
            {categoryServices.map(service => (
              <label 
                key={service.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <Checkbox
                  checked={selectedServices.includes(service.id)}
                  onCheckedChange={() => handleToggle(service.id)}
                />
                <span className="text-sm text-gray-700">{service.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      
      <Button onClick={onSave} className="w-full bg-pink-600 hover:bg-pink-700">
        Сохранить специализацию
      </Button>
    </div>
  );
}