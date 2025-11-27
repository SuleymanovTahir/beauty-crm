import { useLanguage } from "./LanguageContext";

export function PortfolioSection() {
  const { t, language } = useLanguage();

  const portfolioImages = [
    {
      url: "https://images.unsplash.com/photo-1698308233758-d55c98fd7444?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBuYWlsJTIwYXJ0JTIwbHV4dXJ5fGVufDF8fHx8MTc2NDIxODM4OHww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Nails"
    },
    {
      url: "https://images.unsplash.com/photo-1633681138600-295fcd688876?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBoYWlyJTIwY29sb3IlMjBzYWxvbnxlbnwxfHx8fDE3NjQyMTgzODh8MA&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Hair Coloring"
    },
    {
      url: "https://images.unsplash.com/photo-1674049406467-824ea37c7184?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleWVsYXNoJTIwZXh0ZW5zaW9ucyUyMGJlYXV0exlbnwxfHx8fDE3NjQxOTQ4ODd8MA&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Lashes"
    },
    {
      url: "https://images.unsplash.com/photo-1738248393412-87ecae54d5b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleWVicm93JTIwbWljcm9ibGFkaW5nJTIwYmVhdXR5fGVufDF8fHx8MTc2NDIxODIzNnww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Brows"
    },
    {
      url: "https://images.unsplash.com/photo-1727199433272-70fdb94c8430?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW5pY3VyZSUyMG5haWxzfGVufDF8fHx8MTc2NDE2Mzg0M3ww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Manicure"
    },
    {
      url: "https://images.unsplash.com/photo-1673956136339-c19971c6ceac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBtYWtldXAlMjBhcnRpc3QlMjB3b3JrfGVufDF8fHx8MTc2NDIxODM4OXww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Makeup"
    },
    {
      url: "https://images.unsplash.com/photo-1594150608366-da1107c57702?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoYWlyc3R5bGluZyUyMHNhbG9ufGVufDF8fHx8MTc2NDIxODM5MHww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Styling"
    },
    {
      url: "https://images.unsplash.com/photo-1760038548850-bfc356d88b12?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoYWlyJTIwc2Fsb24lMjBiZWF1dHl8ZW58MXx8fHwxNzY0MjE4MjM1fDA&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Hair Salon"
    }
  ];

  return (
    <section className="py-24 px-6 lg:px-12 bg-[#f5f3ef]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="text-[#b8a574] uppercase tracking-[0.2em] mb-4">{t.portfolioTag}</p>
          <h2 className="text-[#2d2d2d] mb-6">
            {t.portfolioTitle}
          </h2>
          <p className="text-[#6b6b6b] max-w-2xl mx-auto">
            {t.portfolioDesc}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {portfolioImages.map((image, index) => (
            <div 
              key={index}
              className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-2xl transition-all duration-500"
            >
              <img 
                src={image.url}
                alt={image.category}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-white uppercase tracking-wider">{image.category}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}