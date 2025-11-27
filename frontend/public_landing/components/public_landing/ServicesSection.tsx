import { Sparkles, Scissors, Palette } from "lucide-react";
import { useLanguage } from "./LanguageContext";

export function ServicesSection() {
  const { t, language } = useLanguage();

  const services = [
    {
      icon: Sparkles,
      title: t.service1Title,
      description: t.service1Desc,
      image: "https://images.unsplash.com/photo-1727199433272-70fdb94c8430?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW5pY3VyZSUyMG5haWxzfGVufDF8fHx8MTc2NDE2Mzg0M3ww&ixlib=rb-4.1.0&q=80&w=1080",
      bgColor: "bg-[#f4d4e0]"
    },
    {
      icon: Scissors,
      title: t.service2Title,
      description: t.service2Desc,
      image: "https://images.unsplash.com/photo-1659036354224-48dd0a9a6b86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwc3R5bGluZyUyMHNhbG9ufGVufDF8fHx8MTc2NDExNDY3NXww&ixlib=rb-4.1.0&q=80&w=1080",
      bgColor: "bg-[#c7b8a8]"
    },
    {
      icon: Palette,
      title: t.service3Title,
      description: t.service3Desc,
      image: "https://images.unsplash.com/photo-1617035305886-59c560e07ce4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWtldXAlMjBhcnRpc3QlMjB3b3JrfGVufDF8fHx8MTc2NDE2Mzg0NHww&ixlib=rb-4.1.0&q=80&w=1080",
      bgColor: "bg-[#e8dfd5]"
    }
  ];

  return (
    <section className="py-24 px-6 lg:px-12 bg-[#e8e5df]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#b8a574] uppercase tracking-wider mb-4">{t.servicesTag}</p>
          <h2 className="text-4xl lg:text-5xl text-[#2d2d2d] mb-6">
            {t.servicesTitle}
          </h2>
          <p className="text-[#6b6b6b] max-w-2xl mx-auto">
            {t.servicesDesc}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="group">
              <div className="relative h-[400px] rounded-3xl overflow-hidden mb-6">
                <img 
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className={`absolute bottom-0 left-0 right-0 p-6 ${service.bgColor} bg-opacity-90`}>
                  <service.icon className="w-8 h-8 text-[#2d2d2d] mb-3" />
                  <h3 className="text-[#2d2d2d] mb-2">{service.title}</h3>
                  <p className="text-sm text-[#6b6b6b]">{service.description}</p>
                </div>
              </div>
              <button className="w-full px-6 py-3 bg-[#2d2d2d] text-white rounded-full hover:bg-[#1a1a1a] transition-colors">
                {t.learnMore}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
