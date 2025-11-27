import { useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { Dialog, DialogContent } from "./ui/dialog";

export function ServicesSection() {
  const { t, language } = useLanguage();
  const [selectedService, setSelectedService] = useState<number | null>(null);

  const services = [
    {
      title: t.service1Title,
      shortDesc: t.service1Desc,
      fullTitle: t.service1FullTitle,
      fullDesc: t.service1FullDesc,
      features: t.service1Features,
      featuresList: [
        t.service1Feature1,
        t.service1Feature2,
        t.service1Feature3,
        t.service1Feature4,
        t.service1Feature5,
      ],
      image: "https://images.unsplash.com/photo-1727199433272-70fdb94c8430?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW5pY3VyZSUyMG5haWxzfGVufDF8fHx8MTc2NDE2Mzg0M3ww&ixlib=rb-4.1.0&q=80&w=1080",
      bgColor: "bg-[#f4d4e0]"
    },
    {
      title: t.service2Title,
      shortDesc: t.service2Desc,
      fullTitle: t.service2FullTitle,
      fullDesc: t.service2FullDesc,
      features: t.service2Features,
      featuresList: [
        t.service2Feature1,
        t.service2Feature2,
        t.service2Feature3,
        t.service2Feature4,
        t.service2Feature5,
      ],
      image: "https://images.unsplash.com/photo-1760038548850-bfc356d88b12?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoYWlyJTIwc2Fsb24lMjBiZWF1dHl8ZW58MXx8fHwxNzY0MjE4MjM1fDA&ixlib=rb-4.1.0&q=80&w=1080",
      bgColor: "bg-[#c7b8a8]"
    },
    {
      title: t.service3Title,
      shortDesc: t.service3Desc,
      fullTitle: t.service3FullTitle,
      fullDesc: t.service3FullDesc,
      features: t.service3Features,
      featuresList: [
        t.service3Feature1,
        t.service3Feature2,
        t.service3Feature3,
        t.service3Feature4,
        t.service3Feature5,
      ],
      image: "https://images.unsplash.com/photo-1527632911563-ee5b6d53465b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBtYWtldXAlMjBhcnRpc3R8ZW58MXx8fHwxNzY0MjE4MjM1fDA&ixlib=rb-4.1.0&q=80&w=1080",
      bgColor: "bg-[#e8dfd5]"
    }
  ];

  return (
    <>
      <section className="py-24 px-6 lg:px-12 bg-[#f5f3ef]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="text-[#b8a574] uppercase tracking-[0.2em] mb-4">{t.servicesTag}</p>
            <h2 className="text-[#2d2d2d] mb-6">
              {t.servicesTitle}
            </h2>
            <p className="text-[#6b6b6b] max-w-2xl mx-auto">
              {t.servicesDesc}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div 
                key={index} 
                className="group cursor-pointer"
                onClick={() => setSelectedService(index)}
              >
                <div className="relative overflow-hidden rounded-2xl mb-6 aspect-[3/4]">
                  <img 
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className={`absolute bottom-0 left-0 right-0 p-8 ${service.bgColor} bg-opacity-95 backdrop-blur-sm`}>
                    <h3 className="text-[#2d2d2d] mb-3 tracking-wider">{service.title}</h3>
                    <p className="text-sm text-[#6b6b6b] mb-4 leading-relaxed">{service.shortDesc}</p>
                    <button 
                      className="text-[#2d2d2d] text-sm uppercase tracking-wider hover:text-[#b8a574] transition-colors flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedService(index);
                      }}
                    >
                      {t.learnMore}
                      <span className={language === 'ar' ? 'rotate-180' : ''}>→</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={selectedService !== null} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#f5f3ef] border-none p-0">
          {selectedService !== null && (
            <div className="relative">
              <button
                onClick={() => setSelectedService(null)}
                className="absolute top-4 right-4 z-50 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
              >
                <X className="w-5 h-5 text-[#2d2d2d]" />
              </button>
              
              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative h-[400px] md:h-full">
                  <img
                    src={services[selectedService].image}
                    alt={services[selectedService].fullTitle}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
                
                <div className="p-8 lg:p-12">
                  <h2 className="text-[#2d2d2d] mb-6 tracking-wider">
                    {services[selectedService].fullTitle}
                  </h2>
                  
                  <p className="text-[#6b6b6b] mb-8 leading-relaxed">
                    {services[selectedService].fullDesc}
                  </p>
                  
                  <div className="mb-8">
                    <h3 className="text-[#2d2d2d] mb-4 tracking-wider">
                      {services[selectedService].features}
                    </h3>
                    <div className="space-y-3">
                      {services[selectedService].featuresList.map((feature, idx) => (
                        <p key={idx} className="text-[#6b6b6b] leading-relaxed">
                          {feature}
                        </p>
                      ))}
                    </div>
                  </div>
                  
                  <button 
                    className="w-full px-8 py-4 bg-[#2d2d2d] text-white rounded-full hover:bg-[#1a1a1a] transition-colors uppercase tracking-wider"
                    onClick={() => {
                      setSelectedService(null);
                      document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {t.bookNow}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
