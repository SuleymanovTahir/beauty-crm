import { ArrowLeft, X, Globe, Scissors, User, Calendar, ChevronRight, Edit2 } from 'lucide-react';
import { useCurrency } from '../../../../src/hooks/useSalonSettings';

interface BookingSummaryProps {
  service: any;
  master: any;
  time: string | null;
  onNext: () => void;
  onBack: () => void;
}

export function BookingSummary({ service, master, time, onNext, onBack }: BookingSummaryProps) {
  const { formatCurrency } = useCurrency();
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
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

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Salon Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center text-white">
              <Scissors size={24} />
            </div>
            <div>
              <h2 className="font-bold text-sm">M.Le Diamant Beauty Lounge</h2>
              <p className="text-xs text-gray-500">Shop 13, Amwaj 3 Plaza Level, JBR, Dubai</p>
            </div>
          </div>
          <button className="text-xs text-gray-500 hover:text-gray-700 uppercase tracking-wide">
            Reset all
          </button>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Service Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white">
                <Scissors size={18} />
              </div>
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <h3 className="font-semibold text-sm mb-1">Services</h3>
            <p className="text-xs text-gray-600 mb-3">{service.name}</p>
            <div className="flex items-center justify-between">
              <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded">Complete</span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>

          {/* Professional Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white">
                <User size={18} />
              </div>
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <h3 className="font-semibold text-sm mb-1">Professional</h3>
            <p className="text-xs text-gray-600 mb-3">{master.name}</p>
            <div className="flex items-center justify-between">
              <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded">Complete</span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>

          {/* Date & Time Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white">
                <Calendar size={18} />
              </div>
              <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-sm mb-1">Date & Time</h3>
            <p className="text-xs text-gray-600 mb-3">Pick time slot</p>
            <div className="flex items-center justify-between">
              <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">Select</span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Order Summary</h2>
            <div className="flex gap-2">
              <button className="p-1.5 hover:bg-gray-100 rounded">
                <Edit2 size={16} className="text-gray-500" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-3 pb-4 border-b border-gray-100">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-medium">{service.name}</p>
              </div>
              <div className="text-right ml-4">
                {service.duration && (
                  <p className="text-xs text-gray-500 mb-1">min</p>
                )}
                <p className="text-sm font-bold">{formatCurrency(service.price)}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <div>
              <p className="text-sm font-bold mb-0.5">Total</p>
              {service.duration && (
                <p className="text-xs text-gray-500">{service.duration} min</p>
              )}
            </div>
            <p className="text-2xl font-bold">{formatCurrency(service.price)}</p>
          </div>
        </div>
      </div>

      {/* Next Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={onNext}
            className="w-full bg-gray-900 text-white py-3.5 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Continue to Date & Time
          </button>
        </div>
      </div>
    </div>
  );
}