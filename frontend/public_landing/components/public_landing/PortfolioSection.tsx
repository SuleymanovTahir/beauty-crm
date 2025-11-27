import { useTranslation } from "react-i18next";

export function PortfolioSection() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;

  const portfolioImages = [
    {
      url: "https://images.unsplash.com/photo-1633681138600-295fcd688876?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBoYWlyJTIwY29sb3IlMjBzYWxvbnxlbnwxfHx8fDE3NjQyMTgzODh8MA&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Hair Coloring"
    },
    {
      url: "https://images.unsplash.com/photo-1674049406467-824ea37c7184?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlY2VsYXNoJTIwZXh0ZW5zaW9ucyUyMGJlYXV0eXxlbnwxfHx8fDE3NjQxOTQ4ODd8MA&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Lashes"
    },
    {
      url: "https://images.unsplash.com/photo-1594150608366-da1107c57702?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoYWlyc3R5bGluZyUyMHNhbG9ufGVufDF8fHx8MTc2NDIxODM5MHww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Styling"
    },
    {
      url: "https://images.unsplash.com/photo-1760038548850-bfc356d88b12?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoYWlyJTIwc2Fsb24lMjBiZWF1dHl8ZW58MXx8fHwxNzY0MjE4MjM1fDA&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Hair Salon"
    },
    {
      url: "https://images.unsplash.com/photo-1727199433272-70fdb94c8430?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW5pY3VyZSUyMG5haWxzfGVufDF8fHx8MTc2NDE2Mzg0M3ww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Manicure"
    },
    {
      url: "https://images.unsplash.com/photo-1617035305886-59c560e07ce4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWtldXAlMjBhcnRpc3QlMjB3b3JrfGVufDF8fHx8MTc2NDE2Mzg0NHww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Makeup"
    },
    {
      url: "https://images.unsplash.com/photo-1659036354224-48dd0a9a6b86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwc3R5bGluZyUyMHNhbG9ufGVufDF8fHx8MTc2NDExNDY3NXww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Styling"
    },
    {
      url: "https://images.unsplash.com/photo-1727199433272-70fdb94c8430?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW5pY3VyZSUyMG5haWxzfGVufDF8fHx8MTc2NDE2Mzg0M3ww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Nails"
    }
  ];

  return (
    <section className="py-24 px-6 lg:px-12 bg-[#f5f3f0]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#b8a574] uppercase tracking-wider mb-4">{t('portfolioTag')}</p>
          <h2 className="text-4xl lg:text-5xl text-[#2d2d2d] mb-6">
            {t('portfolioTitle')}
          </h2>
          <p className="text-[#6b6b6b] max-w-2xl mx-auto">
            {t('portfolioDesc')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {portfolioImages.map((image, index) => (
            <div
              key={index}
              className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer"
            >
              <img
                src={image.url}
                alt={image.category}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white text-sm">{image.category}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
