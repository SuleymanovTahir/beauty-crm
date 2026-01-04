import { ArrowLeft, X, Globe, Calendar, Clock, Phone, CheckCircle } from 'lucide-react';

interface BookingConfirmationProps {
  service: any;
  master: any;
  time: string | null;
  onBack: () => void;
  onConfirm: () => void;
}

export function BookingConfirmation({ service, master, time, onBack, onConfirm }: BookingConfirmationProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
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

      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* Service Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="font-bold text-lg mb-4">{service.name}</h2>
          
          <div className="space-y-4">
            {/* Master */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Master</p>
              <p className="font-semibold">{master.name}</p>
            </div>

            {/* Date & Time */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Date & Time</p>
                <button className="text-xs text-gray-900 hover:text-gray-700 uppercase tracking-wide font-medium">
                  Reschedule
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-gray-500" />
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Date</span>
                  </div>
                  <p className="font-semibold">Wednesday, Feb 4</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-gray-500" />
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Time</span>
                  </div>
                  <p className="font-semibold">{time}</p>
                </div>
              </div>
            </div>

            {/* Total Amount */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Total Amount</span>
                <div className="text-right">
                  <span className="text-3xl font-bold">{service.price}</span>
                  <span className="text-lg text-gray-500 ml-1">AED</span>
                </div>
              </div>
            </div>

            {/* Phone */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Contact Number</p>
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <Phone size={16} className="text-gray-500" />
                <span className="font-medium">+77056054309</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <CheckCircle size={18} className="text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Booking Confirmation</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                You will receive a confirmation message after booking. Please arrive 5-10 minutes before your appointment time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onConfirm}
            className="w-full bg-gray-900 text-white py-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Confirm Appointment
          </button>
        </div>
      </div>
    </div>
  );
}