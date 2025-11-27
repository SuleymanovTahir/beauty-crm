import { useState } from "react";
import { Calendar, Clock, User, Phone, Mail } from "lucide-react";
import { useLanguage } from "./LanguageContext";

export function BookingSection() {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    date: "",
    time: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(language === 'ru' ? "Спасибо за вашу заявку! Мы свяжемся с вами в ближайшее время." : language === 'ar' ? "شكرا لطلبك! سنتصل بك قريبا." : "Thank you for your request! We will contact you soon.");
  };

  const services = [
    t.serviceManicure,
    t.servicePedicure,
    t.serviceHaircut,
    t.serviceColoring,
    t.serviceStyling,
    t.serviceMassage,
    t.serviceSpa
  ];

  return (
    <section id="booking" className="py-24 px-6 lg:px-12 bg-[#f5f3ef]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#b8a574] uppercase tracking-[0.2em] mb-4">{t.bookingTag}</p>
            <h2 className="text-[#2d2d2d] mb-6">
              {t.bookingTitle}
            </h2>
            <p className="text-[#6b6b6b] mb-8 text-lg leading-relaxed">
              {t.bookingDesc}
            </p>
            
            <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-xl">
              <img 
                src="https://images.unsplash.com/photo-1759142235060-3191ee596c81?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBzYWxvbiUyMGludGVyaW9yJTIwbHV4dXJ5fGVufDF8fHx8MTc2NDIxODIzNnww&ixlib=rb-4.1.0&q=80&w=1080"
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
                  {t.yourName}
                </label>
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-[#f5f3f0] rounded-lg border-2 border-transparent focus:border-[#b8a574] focus:outline-none transition-colors"
                  placeholder={t.enterName}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-[#6b6b6b] mb-2">
                  <Phone className="w-4 h-4" />
                  {t.phone}
                </label>
                <input 
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-[#f5f3f0] rounded-lg border-2 border-transparent focus:border-[#b8a574] focus:outline-none transition-colors"
                  placeholder={t.enterPhone}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-[#6b6b6b] mb-2">
                  <Mail className="w-4 h-4" />
                  {t.email}
                </label>
                <input 
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-[#f5f3f0] rounded-lg border-2 border-transparent focus:border-[#b8a574] focus:outline-none transition-colors"
                  placeholder={t.enterEmail}
                />
              </div>

              <div>
                <label className="text-sm text-[#6b6b6b] mb-2 block">
                  {t.selectService}
                </label>
                <select 
                  required
                  value={formData.service}
                  onChange={(e) => setFormData({...formData, service: e.target.value})}
                  className="w-full px-4 py-3 bg-[#f5f3f0] rounded-lg border-2 border-transparent focus:border-[#b8a574] focus:outline-none transition-colors"
                >
                  <option value="">{t.chooseService}</option>
                  {services.map((service, index) => (
                    <option key={index} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm text-[#6b6b6b] mb-2">
                    <Calendar className="w-4 h-4" />
                    {t.date}
                  </label>
                  <input 
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-3 bg-[#f5f3f0] rounded-lg border-2 border-transparent focus:border-[#b8a574] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm text-[#6b6b6b] mb-2">
                    <Clock className="w-4 h-4" />
                    {t.time}
                  </label>
                  <input 
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full px-4 py-3 bg-[#f5f3f0] rounded-lg border-2 border-transparent focus:border-[#b8a574] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-[#2d2d2d] text-white rounded-full hover:bg-[#1a1a1a] transition-colors"
              >
                {t.submit}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}