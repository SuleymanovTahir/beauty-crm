import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from "react-i18next";

interface Review {
  id: number;
  name: string;
  avatar_url: string;
  rating: number;
  employee_position: string;
  text: string;
  created_at: string;
}

export function ReviewsSection() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
        const res = await fetch(`${API_URL}/api/public/reviews?language=${i18n.language}`);
        const data = await res.json();

        if (data.reviews && data.reviews.length > 0) {
          // Map backend data to match expected structure if needed, or just use as is if compatible.
          // Backend returns: id, name (or author_name), avatar_url, rating, employee_position, text (or text_xx), created_at
          const mappedReviews = data.reviews.map((review: any) => ({
            id: review.id,
            name: review.name || review.author_name || "Client",
            avatar_url: review.avatar_url || "",
            rating: review.rating || 5,
            employee_position: review.employee_position || 'Service',
            text: review.text || review.text_ru || "",
            created_at: review.created_at || ""
          }));
          setReviews(mappedReviews);
        } else {
          setReviews([]);
        }
      } catch (error) {
        console.error("Failed to fetch reviews", error);
        setReviews([]);
      }
    };

    fetchReviews();
  }, [i18n.language]);

  const nextReview = () => setCurrentIndex((prev) => (prev + 1) % reviews.length);
  const prevReview = () => setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);

  const getVisibleReviews = () => {
    if (reviews.length === 0) return [];
    const visible = [];
    for (let i = 0; i < 3; i++) {
      visible.push(reviews[(currentIndex + i) % reviews.length]);
    }
    return visible;
  };



  if (reviews.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-background" id="testimonials">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            {t('testimonialsOverline', { defaultValue: 'Отзывы' })}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('testimonialsTitlePart1', { defaultValue: 'Отзывы наших' })} <span className="text-pink-600">{t('testimonialsTitlePart2', { defaultValue: 'клиентов' })}</span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            {t('testimonialsDesc', { defaultValue: 'Мы гордимся доверием наших клиентов' })}
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
                      <img src={review.avatar_url} alt={review.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm">
                        {review.name.charAt(0).toUpperCase()}
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
          {reviews.slice(0, 10).map((_, index) => (
            <div
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`cursor-pointer rounded-full transition-all ${index === currentIndex % reviews.length
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
