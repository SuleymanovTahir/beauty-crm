import { Award, Users, Clock, Gem } from "lucide-react";
import { useLanguage } from "./LanguageContext";

export function FeaturesSection() {
  const { t, language } = useLanguage();

  const features = [
    {
      icon: Award,
      title: t.feature1Title,
      description: t.feature1Desc,
      bgColor: "bg-[#e8dfd5]"
    },
    {
      icon: Gem,
      title: t.feature2Title,
      description: t.feature2Desc,
      bgColor: "bg-[#f4d4e0]"
    },
    {
      icon: Users,
      title: t.feature3Title,
      description: t.feature3Desc,
      bgColor: "bg-[#e5d9ca]"
    },
    {
      icon: Clock,
      title: t.feature4Title,
      description: t.feature4Desc,
      bgColor: "bg-[#ddd5c7]"
    }
  ];

  return (
    <section className="py-24 px-6 lg:px-12 bg-white" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="text-[#b8a574] uppercase tracking-[0.2em] mb-4">{t.whyUs}</p>
          <h2 className="text-[#2d2d2d] max-w-3xl mx-auto">
            {t.whyTitle}
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className={`${feature.bgColor} p-8 rounded-2xl hover:shadow-xl transition-all duration-300 group`}
            >
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="w-8 h-8 text-[#b8a574]" />
              </div>
              <h3 className="text-[#2d2d2d] mb-4 tracking-wider">{feature.title}</h3>
              <p className="text-[#6b6b6b] text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}