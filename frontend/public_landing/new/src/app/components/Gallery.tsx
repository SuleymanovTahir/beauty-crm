import { useState } from 'react';
import { mockGalleryImages } from '../../utils/mockData';

export function Gallery() {
  const [displayCount, setDisplayCount] = useState(12);
  const displayedImages = mockGalleryImages.slice(0, displayCount);

  return (
    <section id="gallery" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            Наш салон
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            Атмосфера роскоши и комфорта
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            Современный интерьер создает атмосферу спокойствия
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 max-w-6xl mx-auto">
          {displayedImages.map((item, index) => (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-lg sm:rounded-xl bg-muted"
            >
              <img
                src={item.image_path}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                  <p className="text-xs sm:text-sm text-primary-foreground line-clamp-2">{item.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {displayCount < mockGalleryImages.length && (
          <div className="text-center mt-6 sm:mt-8">
            <button
              onClick={() => setDisplayCount(prev => Math.min(prev + 12, mockGalleryImages.length))}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              Показать еще ({mockGalleryImages.length - displayCount})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
