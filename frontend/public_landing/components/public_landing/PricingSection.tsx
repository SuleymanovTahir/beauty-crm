import { useTranslation } from "react-i18next";

interface PricingSectionProps {
  services?: any[];
}

export function PricingSection({ services = [] }: PricingSectionProps) {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;

  // Group services by category or use default pricing
  const pricingCategories = services.length > 0 ? [
    {
      title: t('manucureCategory'),
      services: services.filter(s => s.category?.toLowerCase().includes('маникюр') || s.category?.toLowerCase().includes('manicure')).map(s => ({
        name: s.name,
        duration: `${s.duration || 60} мин`,
        price: s.price?.toString() || '0',
        oldPrice: (s.price * 2)?.toString() || '0'
      }))
    },
    {
      title: t('pedicureCategory'),
      services: services.filter(s => s.category?.toLowerCase().includes('педикюр') || s.category?.toLowerCase().includes('pedicure')).map(s => ({
        name: s.name,
        duration: `${s.duration || 60} мин`,
        price: s.price?.toString() || '0',
        oldPrice: (s.price * 2)?.toString() || '0'
      }))
    },
    {
      title: t('hairCategory'),
      services: services.filter(s => s.category?.toLowerCase().includes('волос') || s.category?.toLowerCase().includes('hair')).map(s => ({
        name: s.name,
        duration: `${s.duration || 60} мин`,
        price: s.price?.toString() || '0',
        oldPrice: (s.price * 2)?.toString() || '0'
      }))
    },
    {
      title: t('spaCategory'),
      services: services.filter(s => s.category?.toLowerCase().includes('спа') || s.category?.toLowerCase().includes('spa') || s.category?.toLowerCase().includes('массаж') || s.category?.toLowerCase().includes('massage')).map(s => ({
        name: s.name,
        duration: `${s.duration || 60} мин`,
        price: s.price?.toString() || '0',
        oldPrice: (s.price * 2)?.toString() || '0'
      }))
    }
  ].filter(cat => cat.services.length > 0) : [
    {
      title: t('manucureCategory'),
      services: [
        { name: t('classicManicure'), duration: "45 мин", price: "200", oldPrice: "400" },
        { name: t('gelManicure'), duration: "60 мин", price: "250", oldPrice: "500" },
        { name: t('nailExtension'), duration: "90 мин", price: "350", oldPrice: "700" },
        { name: t('nailDesign'), duration: "10 мин", price: "50", oldPrice: "100" }
      ]
    },
    {
      title: t('pedicureCategory'),
      services: [
        { name: t('classicPedicure'), duration: "60 мин", price: "250", oldPrice: "500" },
        { name: t('spaPedicure'), duration: "90 мин", price: "400", oldPrice: "800" },
        { name: t('medicalPedicure'), duration: "75 мин", price: "350", oldPrice: "700" }
      ]
    },
    {
      title: t('hairCategory'),
      services: [
        { name: t('womenHaircut'), duration: "45 мин", price: "300", oldPrice: "600" },
        { name: t('menHaircut'), duration: "30 мин", price: "200", oldPrice: "400" },
        { name: t('hairColoring'), duration: "120 мин", price: "500", oldPrice: "1000" },
        { name: t('hairStyling'), duration: "45 мин", price: "150", oldPrice: "300" },
        { name: t('keratinTreatment'), duration: "180 мин", price: "800", oldPrice: "1600" }
      ]
    },
    {
      title: t('spaCategory'),
      services: [
        { name: t('classicMassage'), duration: "60 мин", price: "400", oldPrice: "800" },
        { name: t('faceMassage'), duration: "30 мин", price: "200", oldPrice: "400" },
        { name: t('spaRitual'), duration: "120 мин", price: "700", oldPrice: "1400" },
        { name: t('aromatherapy'), duration: "90 мин", price: "500", oldPrice: "1000" }
      ]
    }
  ];

  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-24 px-6 lg:px-12 bg-[#f5f3f0]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <p className="text-[#b8a574] uppercase tracking-wider mb-4">{t('pricingTag')}</p>
          <h2 className="text-4xl lg:text-5xl text-[#2d2d2d] mb-6">
            {t('pricingTitle')}
          </h2>
          <div className="inline-block px-6 py-3 bg-[#b8a574] text-white rounded-full">
            {t('pricingDiscount')}
          </div>
        </div>

        <div className="space-y-12">
          {pricingCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-white rounded-3xl p-8 shadow-sm">
              <h3 className="text-2xl text-[#2d2d2d] mb-8 pb-4 border-b border-[#e8e5df]">
                {category.title}
              </h3>

              <div className="space-y-6">
                {category.services.map((service, serviceIndex) => (
                  <div
                    key={serviceIndex}
                    className="flex items-center justify-between py-4 border-b border-[#f5f3f0] last:border-0 hover:bg-[#f5f3f0] hover:px-4 hover:rounded-lg transition-all"
                  >
                    <div className="flex-1">
                      <h4 className="text-[#2d2d2d] mb-1">{service.name}</h4>
                      <p className="text-sm text-[#6b6b6b]">{service.duration}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl text-[#b8a574] font-semibold">
                        AED {service.price}
                      </span>
                      <span className="text-sm text-[#6b6b6b] line-through">
                        AED {service.oldPrice}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button
            onClick={scrollToBooking}
            className="px-12 py-4 bg-[#2d2d2d] text-white rounded-full hover:bg-[#1a1a1a] transition-colors"
          >
            {t('bookNowBtn')}
          </button>
        </div>
      </div>
    </section>
  );
}