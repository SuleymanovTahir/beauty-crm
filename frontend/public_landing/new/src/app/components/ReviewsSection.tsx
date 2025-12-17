import { useState } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { mockReviews } from '../../utils/mockData';

export function ReviewsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextReview = () => setCurrentIndex((prev) => (prev + 1) % mockReviews.length);
  const prevReview = () => setCurrentIndex((prev) => (prev - 1 + mockReviews.length) % mockReviews.length);

  const getVisibleReviews = () => {
    const visible = [];
    for (let i = 0; i < 3; i++) {
      visible.push(mockReviews[(currentIndex + i) % mockReviews.length]);
    }
    return visible;
  };

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-background" id="testimonials">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            Отзывы
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            Отзывы наших <span className="text-pink-600">клиентов</span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            Мы гордимся доверием наших клиентов
          </p>
        </div>

        <div className="relative mb-8 max-w-7xl mx-auto">
          <button
            onClick={prevReview}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-pink-600"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex justify-center gap-3 sm:gap-4 px-10 sm:px-14">
            {getVisibleReviews().map((review, index) => (
              <div key={`${review.id}-${index}`} className="flex-1 max-w-xs">
                <div className="bg-card rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm border border-border h-full flex flex-col">
                  <div className="flex gap-1 mb-3 sm:mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        fill={i < review.rating ? "currentColor" : "none"}
                        className={`w-3 h-3 sm:w-4 sm:h-4 ${i < review.rating ? 'text-pink-600' : 'text-muted'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/80 mb-4 flex-grow line-clamp-4">{review.text}</p>
                  <div className="flex items-center gap-2 sm:gap-3 pt-3 border-t border-border">
                    {review.avatar_url ? (
                      <img src={review.avatar_url} alt={review.name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm">
                        {review.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-card-foreground truncate">{review.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{review.employee_position}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={nextReview}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-pink-600"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="flex justify-center gap-1.5 sm:gap-2">
          {mockReviews.slice(0, 10).map((_, index) => (
            <div
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`cursor-pointer rounded-full transition-all ${
                index === currentIndex % 10
                  ? 'bg-pink-600 w-6 h-2 sm:w-8 sm:h-3'
                  : 'bg-gray-400 w-2 h-2 sm:w-3 sm:h-3'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
