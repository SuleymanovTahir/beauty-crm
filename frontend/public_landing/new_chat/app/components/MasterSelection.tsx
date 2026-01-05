import { ArrowLeft, X, Globe, Star, Clock, Sparkles } from 'lucide-react';
import { useCurrency } from '../../../../src/hooks/useSalonSettings';
import { useState } from 'react';

interface MasterSelectionProps {
  service: any;
  onNext: (master: any, time: string) => void;
  onBack: () => void;
}

export function MasterSelection({ service, onNext, onBack }: MasterSelectionProps) {
  const { formatCurrency } = useCurrency();
  const [selectedMaster, setSelectedMaster] = useState<any>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const masters = [
    {
      id: 1,
      name: 'Amandurdyyeva Mestan',
      role: 'Stylist-Hairdresser',
      rating: 5.0,
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
      availableToday: true,
      times: ['10:30', '11:00', '11:30', '12:00']
    },
    {
      id: 2,
      name: 'Kasymova Gulchere',
      role: 'Nails/Waxing',
      rating: 5.0,
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop',
      availableToday: true,
      times: ['10:30', '11:00', '11:30', '12:00']
    },
    {
      id: 3,
      name: 'Kozhabay Lyazat',
      role: 'Nail Service Master',
      rating: 5.0,
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
      availableToday: false,
      times: []
    },
    {
      id: 4,
      name: 'Mokhamed Sabri',
      role: 'Stylist-Hairdresser',
      rating: 5.0,
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      availableToday: true,
      times: ['14:00', '15:00', '16:00']
    },
  ];

  const handleMasterSelect = (master: any, time?: string) => {
    setSelectedMaster(master);
    if (time) {
      setSelectedTime(time);
    }
  };

  const handleNext = () => {
    if (selectedMaster && selectedTime) {
      onNext(selectedMaster, selectedTime);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Title */}
        <h2 className="text-2xl font-bold mb-6">Choose Master</h2>

        {/* Flexible Match */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 hover:border-gray-300 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Flexible Match</h3>
              <p className="text-sm text-gray-600">We'll match you with the best available professional</p>
            </div>
          </div>
        </div>

        {/* Masters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {masters.map((master) => (
            <div
              key={master.id}
              className={`bg-white rounded-xl border-2 p-5 transition-all ${selectedMaster?.id === master.id
                  ? 'border-gray-900 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              {/* Master Info */}
              <div className="flex items-start gap-3 mb-4">
                <img
                  src={master.image}
                  alt={master.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-0.5">{master.name}</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{master.role}</p>
                  <div className="flex items-center gap-1">
                    <Star className="text-amber-400 fill-amber-400" size={14} />
                    <span className="text-sm font-medium">{master.rating}</span>
                  </div>
                </div>
              </div>

              {/* Availability */}
              {master.availableToday ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="text-green-600" size={14} />
                    <span className="text-xs text-green-600 font-medium uppercase tracking-wide">Available Today</span>
                  </div>

                  {/* Time Slots */}
                  <div className="grid grid-cols-4 gap-2">
                    {master.times.map((time) => (
                      <button
                        key={time}
                        onClick={() => handleMasterSelect(master, time)}
                        className={`py-2 rounded-lg text-sm font-medium transition-colors ${selectedMaster?.id === master.id && selectedTime === time
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 py-3">
                  <Clock className="text-gray-400" size={14} />
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Not Available Today</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      {selectedMaster && selectedTime && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{service.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{selectedMaster.name}</span>
                <span className="text-xs text-gray-300">•</span>
                <span className="text-xs text-gray-500">{selectedTime}</span>
                <span className="text-xs text-gray-300">•</span>
                {service.duration && (
                  <>
                    <span className="text-xs text-gray-500">{service.duration} MIN</span>
                    <span className="text-xs text-gray-300">•</span>
                  </>
                )}
                <span className="text-xs text-gray-500">{formatCurrency(service.price)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
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
