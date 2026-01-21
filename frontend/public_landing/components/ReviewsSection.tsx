import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { getApiUrl } from "../utils/apiUtils";
import { safeFetch } from "../utils/errorHandler";

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
        const API_URL = getApiUrl();
        const res = await safeFetch(`${API_URL}/api/public/reviews?language=${i18n.language}`);
        const data = await res.json();

        if (data.reviews && data.reviews.length > 0) {
          // Map backend data to match expected structure if needed, or just use as is if compatible.
          // Backend returns: id, name (or author_name), avatar_url, rating, employee_position, text (or text_xx), created_at
          const mappedReviews = data.reviews.map((review: any) => ({
            id: review.id,
            name: review.name || review.author_name || t('common:client'),
            avatar_url: review.avatar_url || "",
            rating: review.rating || 5,
            employee_position: review.employee_position || t('common:service'),
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

  const [itemsPerSlide, setItemsPerSlide] = useState(3);

  // Responsive check
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerSlide(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerSlide(2);
      } else {
        setItemsPerSlide(3);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getVisibleReviews = () => {
    if (reviews.length === 0) return [];
    const visible = [];
    for (let i = 0; i < itemsPerSlide; i++) {
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
            {t('testimonialsOverline')}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('testimonialsTitlePart1')} <span className="text-primary">{t('testimonialsTitlePart2')}</span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            {t('testimonialsDesc')}
          </p>
        </div>

        <div className="relative mb-8 max-w-7xl mx-auto">
          <button
            onClick={prevReview}
            className="review-nav-button left-0"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex justify-center gap-3 sm:gap-4 px-10 sm:px-14">
            {getVisibleReviews().map((review, index) => (
              <div key={`${review.id}-${index}`} className="flex-1 max-w-xs">
                <div className="review-card">
                  <div className="flex gap-1 mb-3 sm:mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        fill={i < review.rating ? "currentColor" : "none"}
                        className={`review-star ${i < review.rating ? 'review-star-active' : 'review-star-inactive'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/80 mb-4 flex-grow line-clamp-4">{review.text}</p>
                  <div className="flex items-center gap-2 sm:gap-3 pt-3 border-t border-border">
                    {review.avatar_url ? (
                      <img
                        src={review.avatar_url}
                        alt={review.name}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-sm ${review.avatar_url ? 'hidden' : ''}`}>
                      {review.name.charAt(0).toUpperCase()}
                    </div>
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
            className="review-nav-button right-0"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="flex justify-center gap-1.5 sm:gap-2">
          {reviews.slice(0, 10).map((_, index) => (
            <div
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={index === currentIndex % reviews.length ? "pagination-dot pagination-dot-active" : "pagination-dot"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
