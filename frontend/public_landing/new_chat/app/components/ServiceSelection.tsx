import { useState } from 'react';
import { useCurrency } from '../../../../src/hooks/useSalonSettings';

interface ServiceSelectionProps {
  onNext: (service: any) => void;
  onBack: () => void;
}

export function ServiceSelection({ onNext, onBack }: ServiceSelectionProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedService, setSelectedService] = useState<any>(null);
  const { formatCurrency } = useCurrency();

  const categories = ['All', 'Brows', 'Facial', 'Hair', 'Lashes', 'Massage', 'Nails', 'Permanent Makeup', 'Promo', 'Waxing'];

  const services = [
    {
      id: 1,
      name: 'Lamination of eyebrows and eyelashes',
      description: 'Combo lamination package',
      price: 300,
      duration: null,
    },
    {
      id: 2,
      name: 'Eyebrow tinting',
      description: 'Professional brow tinting',
      price: 40,
      duration: 60,
    },
    {
      id: 3,
      name: 'Eyebrow shaping',
      description: 'Professional brow shaping',
      price: 40,
      duration: 60,
    },
    {
      id: 4,
      name: 'Eyebrow lamination',
      description: 'Brow lamination treatment',
      price: 200,
      duration: null,
    },
  ];

  const handleServiceSelect = (service: any) => {
    setSelectedService(service);
  };

  const handleNext = () => {
    if (selectedService) {
      onNext(selectedService);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold">Reservation</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                <Globe size={16} />
                <span className="text-xs">🇬🇧</span>
                <span>English</span>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search services..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${selectedCategory === category
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {services.map((service) => (
            <div
              key={service.id}
              onClick={() => handleServiceSelect(service)}
              className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${selectedService?.id === service.id
                ? 'border-gray-900 shadow-sm'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">{service.name}</h3>
                  <p className="text-xs text-gray-500">{service.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 ${selectedService?.id === service.id
                  ? 'border-gray-900 bg-gray-900'
                  : 'border-gray-300'
                  }`}>
                  {selectedService?.id === service.id && (
                    <Check size={12} className="text-white" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                {service.duration && (
                  <span className="text-xs text-gray-500">{service.duration} min</span>
                )}
                <span className="text-sm font-bold">{formatCurrency(service.price)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      {selectedService && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{selectedService.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">AMANDURDYYEVA MESTAN</span>
                <span className="text-xs text-gray-300">•</span>
                {selectedService.duration && (
                  <>
                    <span className="text-xs text-gray-500">{selectedService.duration} MIN</span>
                    <span className="text-xs text-gray-300">•</span>
                  </>
                )}
                <span className="text-xs text-gray-500">{formatCurrency(selectedService.price)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2">
                Edit booking
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
