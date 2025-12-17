// ReviewsSection.tsx
import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { apiClient } from "../../src/api/client";

interface Review {
  id: number;
  name: string;
  image: string;
  rating: number;
  service: string;
  text: string;
  date: string;
}

export function ReviewsSection() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setVisibleCount(1);
      } else if (window.innerWidth < 1024) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await apiClient.getPublicReviews(language);
        if (data.reviews && data.reviews.length > 0) {
          const mappedReviews = data.reviews.map((review: any) => ({
            id: review.id,
            name: review.name || review.author_name || "Client",
            image: review.avatar_url || "",
            rating: review.rating || 5,
            service: review.employee_position || 'Service',
            text: review.text || review.text_ru || "",
            date: review.created_at ? new Date(review.created_at).toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' }) : "",
          }));
          setReviews(mappedReviews);
        } else {
          setReviews([]);
        }
      } catch (error) {
        setReviews([]);
      }
    };

    fetchReviews();
  }, [language]);

  const nextReview = () => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  const prevReview = () => {
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const goToReview = (index: number) => {
    setCurrentIndex(index);
  };

  const getVisibleReviews = () => {
    if (reviews.length === 0) return [];
    const visible = [];
    for (let i = 0; i < visibleCount; i++) {
      const item = reviews[(currentIndex + i) % reviews.length];
      visible.push(item);
    }
    return visible;
  };

  if (reviews.length === 0) return null;

  // Static text
  const titlePart1 = t('testimonialsTitlePart1', 'Отзывы наших');
  const titlePart2 = t('testimonialsTitlePart2', 'Клиентов');
  const subtitle = t('testimonialsDesc', 'Мы гордимся доверием наших клиентов');

  return (
    <section className="py-20 bg-background" id="reviews">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('testimonialsOverline', 'Отзывы')}
          </p>
          <h2 className="text-4xl lg:text-5xl mb-4 text-[var(--heading)]">
            {titlePart1}{' '}
            <span className="text-pink-600">
              {titlePart2}
            </span>
          </h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Carousel */}
        <div className="block mb-12">
          <div className="flex items-center justify-center gap-4">
            {/* Prev Button */}
            <button
              onClick={prevReview}
              className="w-10 h-10 bg-card rounded-full shadow-lg flex items-center justify-center hover:bg-muted transition-all border border-border shrink-0"
              aria-label="Previous reviews"
            >
              <ChevronLeft className="w-5 h-5 text-pink-600" />
            </button>

            {/* Cards */}
            <div className="flex-1 flex justify-center gap-4 transition-all duration-300">
              {getVisibleReviews().map((review, index) => (
                <div
                  key={`${review.id}-${index}`}
                  className={`flex-1 transition-all duration-300 ${visibleCount === 1 ? 'max-w-sm' : 'max-w-xs'
                    }`}
                >
                  <ReviewCard review={review} />
                </div>
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={nextReview}
              className="w-10 h-10 bg-card rounded-full shadow-lg flex items-center justify-center hover:bg-muted transition-all border border-border shrink-0"
              aria-label="Next reviews"
            >
              <ChevronRight className="w-5 h-5 text-pink-600" />
            </button>
          </div>
        </div>

        {/* Dots Navigation */}
        <div className="flex justify-center gap-2">
          {reviews.map((_, index) => (
            <button
              key={index}
              onClick={() => goToReview(index)}
              className={`transition-all ${index === currentIndex
                ? 'w-8 h-2 bg-pink-600 rounded-full'
                : 'w-2 h-2 bg-gray-400 rounded-full hover:bg-pink-300'
                }`}
              aria-label={`Go to review ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface ReviewCardProps {
  review: Review;
}

function ReviewCard({ review }: ReviewCardProps) {
  const [imageError, setImageError] = useState(false);

  if (!review) return <div className="p-4 bg-red-100 text-red-500">NO REVIEW DATA</div>;

  return (
    <div className="bg-card rounded-xl md:rounded-2xl p-6 shadow-sm border border-border h-full flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
      {/* Quote Icon */}
      <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center mb-4 shrink-0">
        <Quote className="w-6 h-6 text-pink-600" />
      </div>

      {/* Review Text */}
      <p className="text-foreground/80 mb-6 leading-relaxed flex-grow italic line-clamp-6 font-medium min-h-[120px]">"{review.text}"</p>

      <div className="mt-auto">
        {/* Rating */}
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              fill={i < review.rating ? "currentColor" : "none"}
              className={`w-4 h-4 ${i < review.rating
                ? 'text-pink-600'
                : 'text-muted'
                }`}
            />
          ))}
        </div>

        {/* Service Badge */}
        <div className="inline-flex items-center px-3 py-1 bg-pink-50 text-pink-600 text-sm rounded-full mb-4">
          {review.service}
        </div>

        {/* Author */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          {/* Avatar */}
          <div className="relative shrink-0">
            {review.image && !imageError ? (
              <img
                src={review.image}
                alt={review.name}
                className="w-12 h-12 rounded-full object-cover border border-border"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-600 font-bold text-lg">
                {review.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <div className="font-semibold text-card-foreground line-clamp-1">{review.name}</div>
            <div className="text-sm text-muted-foreground">{review.date}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
