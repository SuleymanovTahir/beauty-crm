import { MapPin, Phone, Clock } from "lucide-react";
import { useLanguage } from "./LanguageContext";

export function MapSection() {
  const { t } = useLanguage();
  
  return (
    <section className="py-24 px-6 lg:px-12 bg-[#f5f3ef]">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="text-[#b8a574] uppercase tracking-[0.2em] mb-4">{t.galleryTag}</p>
          <h2 className="text-[#2d2d2d] mb-6">
            {t.visitSalon}
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-[#b8a574] rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-[#2d2d2d] mb-3 tracking-wider">Dubai (Main Location)</h3>
                  <p className="text-[#6b6b6b] leading-relaxed">
                    Business Bay, Dubai Marina, Internet City<br />
                    DIFC, Abu Dhabi, Dubai, UAE
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-[#b8a574] rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-[#2d2d2d] mb-3 tracking-wider">Телефон</h3>
                  <a href="tel:+971542478604" className="text-[#b8a574] hover:underline text-lg">
                    +971 54 247 8604
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-[#b8a574] rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-[#2d2d2d] mb-3 tracking-wider">Часы работы</h3>
                  <p className="text-[#6b6b6b] leading-relaxed">
                    Понедельник - Воскресенье<br />
                    9:00 - 21:00
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="flex-1 px-8 py-4 bg-[#2d2d2d] text-white rounded-full hover:bg-[#1a1a1a] transition-colors uppercase tracking-wider">
                {t.getDirections}
              </button>
              <button className="flex-1 px-8 py-4 border-2 border-[#2d2d2d] text-[#2d2d2d] rounded-full hover:bg-[#2d2d2d] hover:text-white transition-colors uppercase tracking-wider">
                {t.callUs}
              </button>
            </div>
          </div>

          <div className="relative h-[600px] rounded-2xl overflow-hidden shadow-xl bg-gray-200">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d231543.89654711885!2d55.04788838369384!3d25.07619619999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f43496ad9c645%3A0xbde66e5084295162!2sDubai%20-%20United%20Arab%20Emirates!5e0!3m2!1sen!2s!4v1234567890123"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="M Le Diamant Location"
            />
          </div>
        </div>
      </div>
    </section>
  );
}