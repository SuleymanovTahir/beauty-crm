import { useState } from "react";
import { Calendar, Clock, User, Phone, Mail, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface BookingSectionProps {
  services?: any[];
}

export function BookingSection({ services = [] }: BookingSectionProps) {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    date: "",
    time: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: `New Booking Request:
          Phone: ${formData.phone}
          Service: ${formData.service}
          Date: ${formData.date}
          Time: ${formData.time}`
        })
      });

      if (response.ok) {
        toast.success(t('messageSent', { defaultValue: 'Message sent successfully!' }));
        setFormData({
          name: "",
          phone: "",
          email: "",
          service: "",
          date: "",
          time: ""
        });
      } else {
        toast.error(t('errorMessage', { defaultValue: 'Failed to send message.' }));
      }
    } catch (error) {
      console.error('Error sending booking request:', error);
      toast.error(t('errorMessage', { defaultValue: 'Failed to send message.' }));
    } finally {
      setLoading(false);
    }
  };

  // Use services from database or fallback to default list
  const servicesList = services.length > 0 ? services.map(s => s.name) : [
    t('serviceManicure', { defaultValue: 'Manicure' }),
    t('servicePedicure', { defaultValue: 'Pedicure' }),
    t('serviceHaircut', { defaultValue: 'Haircut' }),
    t('serviceColoring', { defaultValue: 'Coloring' }),
    t('serviceStyling', { defaultValue: 'Styling' }),
    t('serviceMassage', { defaultValue: 'Massage' }),
    t('serviceSpa', { defaultValue: 'Spa' })
  ];

  return (
    <section id="booking-section" className="py-24 px-6 lg:px-12 bg-[#e8e5df]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#b8a574] uppercase tracking-wider mb-4">{t('bookingTag')}</p>
            <h2 className="text-4xl lg:text-5xl text-[#2d2d2d] mb-6">
              {t('bookingTitle')}
            </h2>
            <p className="text-[#6b6b6b] mb-8 text-lg">
              {t('bookingDesc')}
            </p>

            <div className="relative h-[400px] rounded-3xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1759142235060-3191ee596c81?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiZWF1dHklMjBzYWxvbiUyMGludGVyaW9yfGVufDF8fHx8MTc2NDE2MjcxN3ww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Salon"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm text-[#6b6b6b] mb-2">
                  <User className="w-4 h-4" />
                  {t('yourName')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f3f0] rounded-lg border-2 border-transparent focus:border-[#b8a574] focus:outline-none transition-colors"
                  placeholder={t('enterName')}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-[#6b6b6b] mb-2">
                  <Phone className="w-4 h-4" />
                  {t('phone', { defaultValue: 'Phone' })}
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f3f0] rounded-lg border-2 border-transparent focus:border-[#b8a574] focus:outline-none transition-colors"
                  placeholder={t('enterPhone')}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-[#6b6b6b] mb-2">
                  <Mail className="w-4 h-4" />
                  {t('email', { defaultValue: 'Email' })}
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f3f0] rounded-lg border-2 border-transparent focus:border-[#b8a574] focus:outline-none transition-colors"
                  placeholder={t('enterEmail')}
                />
              </div>

              <div>
                <label className="text-sm text-[#6b6b6b] mb-2 block">
                  {t('selectService')}
                </label>
                <select
                  required
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f3f0] rounded-lg border-2 border-transparent focus:border-[#b8a574] focus:outline-none transition-colors"
                >
                  <option value="">{t('chooseService')}</option>
                  {servicesList.map((service, index) => (
                    <option key={index} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm text-[#6b6b6b] mb-2">
                    <Calendar className="w-4 h-4" />
                    {t('date', { defaultValue: 'Date' })}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f3f0] rounded-lg border-2 border-transparent focus:border-[#b8a574] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm text-[#6b6b6b] mb-2">
                    <Clock className="w-4 h-4" />
                    {t('time', { defaultValue: 'Time' })}
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f3f0] rounded-lg border-2 border-transparent focus:border-[#b8a574] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#2d2d2d] text-white rounded-full hover:bg-[#1a1a1a] transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('submit')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}