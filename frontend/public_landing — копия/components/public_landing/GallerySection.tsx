import { useTranslation } from "react-i18next";

export function GallerySection() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;

  const galleryImages = [
    {
      url: "https://images.unsplash.com/photo-1759142235060-3191ee596c81?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiZWF1dHklMjBzYWxvbiUyMGludGVyaW9yfGVufDF8fHx8MTc2NDE2MjcxN3ww&ixlib=rb-4.1.0&q=80&w=1080",
      title: t('mainHall')
    },
    {
      url: "https://images.unsplash.com/photo-1634235421135-16ebd88c13c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW5pY3VyZSUyMG5haWxzJTIwc3BhfGVufDF8fHx8MTc2NDE2MjcxN3ww&ixlib=rb-4.1.0&q=80&w=1080",
      title: t('manicureZone')
    },
    {
      url: "https://images.unsplash.com/photo-1759134155377-4207d89b39ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwc2Fsb24lMjBsdXh1cnl8ZW58MXx8fHwxNzY0MTYyNzE3fDA&ixlib=rb-4.1.0&q=80&w=1080",
      title: t('hairZone')
    },
    {
      url: "https://images.unsplash.com/photo-1630595633877-9918ee257288?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcGElMjB0cmVhdG1lbnQlMjBtYXNzYWdlfGVufDF8fHx8MTc2NDA5NTg5Nnww&ixlib=rb-4.1.0&q=80&w=1080",
      title: t('spaZone')
    }
  ];

  return (
    <section className="py-24 px-6 lg:px-12 bg-[#f5f3f0]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#b8a574] uppercase tracking-wider mb-4">{t('galleryTag')}</p>
          <h2 className="text-4xl lg:text-5xl text-[#2d2d2d] mb-6">
            {t('galleryTitle')}
          </h2>
          <p className="text-[#6b6b6b] max-w-2xl mx-auto">
            {t('galleryDesc')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {galleryImages.map((image, index) => (
            <div key={index} className="group">
              <div className="relative h-[400px] rounded-2xl overflow-hidden">
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <h3 className="text-white">{image.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}