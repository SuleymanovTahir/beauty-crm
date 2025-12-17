import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

interface Review {
  id: number;
  name: string;
  image: string;
  rating: number;
  service: string;
  text: string;
  date: string;
}

// Mock API client - replace with your actual API
const apiClient = {
  getPublicReviews: async (language: string) => {
    // This should be replaced with actual API call
    return { reviews: [] };
  }
};

export function ReviewsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const language = 'ru'; // Replace with i18n language

  const fallbackReviews: Review[] = [
    {
      id: 1,
      name: 'Анна Петрова',
      image: 'https://images.unsplash.com/photo-1623594675959-02360202d4d6?w=400',
      rating: 5,
      service: 'Чистка лица',
      text: 'Потрясающий результат! Кожа стала гладкой и сияющей. Мастер очень внимательная и профессиональная. Обязательно вернусь снова!',
      date: '15 декабря 2024',
    },
    {
      id: 2,
      name: 'Мария Иванова',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
      rating: 5,
      service: 'Массаж лица',
      text: 'Прекрасная атмосфера и высочайший уровень сервиса. После массажа лица чувствую себя обновленной. Спасибо огромное!',
      date: '12 декабря 2024',
    },
    {
      id: 3,
      name: 'Елена Смирнова',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      rating: 5,
      service: 'Маникюр и педикюр',
      text: 'Лучший салон в городе! Всегда довольна результатом. Мастера - настоящие профессионалы своего дела.',
      date: '10 декабря 2024',
    },
    {
      id: 4,
      name: 'Ольга Козлова',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      rating: 5,
      service: 'SPA-программа',
      text: 'Невероятный релакс! Программа SPA превзошла все ожидания. Чувствую себя как после отпуска. Рекомендую всем!',
      date: '8 декабря 2024',
    },
    {
      id: 5,
      name: 'Виктория Новикова',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      rating: 5,
      service: 'Окрашивание волос',
      text: 'Мастер подобрала идеальный оттенок! Волосы выглядят здоровыми и ухоженными. Очень довольна!',
      date: '5 декабря 2024',
    },
    {
      id: 6,
      name: 'Дарья Соколова',
      image: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400',
      rating: 5,
      service: 'Мезотерапия',
      text: 'Результат виден уже после первой процедуры! Кожа стала более упругой и свежей. Спасибо за профессионализм!',
      date: '3 декабря 2024',
    },
  ];

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const data = await apiClient.getPublicReviews(language);
        if (data.reviews && data.reviews.length > 0) {
          const mappedReviews = data.reviews.map((review: any) => ({
            id: review.id,
            name: review.name || review.author_name || "Client",
            image: review.avatar_url || 'https://images.unsplash.com/photo-1623594675959-02360202d4d6?w=400',
            rating: review.rating || 5,
            service: review.employee_position || 'Service',
            text: review.text || review.text_ru || "",
            date: review.created_at ? new Date(review.created_at).toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' }) : "",
          }));
          setReviews(mappedReviews);
          console.log(`Loaded ${mappedReviews.length} reviews from database`);
        } else {
          setReviews(fallbackReviews);
          console.log("Using fallback reviews");
        }
      } catch (error) {
        console.error('Error loading testimonials:', error);
        setReviews(fallbackReviews);
      }
    };

    fetchTestimonials();
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

  // Calculate which reviews to show (3 at a time on desktop)
  const getVisibleReviews = () => {
    const visible = [];
    for (let i = 0; i < 3; i++) {
      visible.push(reviews[(currentIndex + i) % reviews.length]);
    }
    return visible;
  };

  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-muted" id="reviews">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl mb-4 text-foreground">
            Отзывы наших{' '}
            <span className="text-primary">
              Клиентов
            </span>
          </h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Мы гордимся доверием наших клиентов
          </p>
        </motion.div>

        {/* Desktop Carousel - 3 cards */}
        <div className="hidden lg:block mb-12">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3 }}
                className="grid lg:grid-cols-3 gap-6"
              >
                {getVisibleReviews().map((review, index) => (
                  <ReviewCard key={`${review.id}-${index}`} review={review} />
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <button
              onClick={prevReview}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-12 h-12 bg-card rounded-full shadow-lg flex items-center justify-center hover:bg-muted transition-all"
              aria-label="Previous reviews"
            >
              <ChevronLeft className="w-6 h-6 text-primary" />
            </button>
            <button
              onClick={nextReview}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-12 h-12 bg-card rounded-full shadow-lg flex items-center justify-center hover:bg-muted transition-all"
              aria-label="Next reviews"
            >
              <ChevronRight className="w-6 h-6 text-primary" />
            </button>
          </div>
        </div>

        {/* Mobile Carousel - 1 card */}
        <div className="lg:hidden mb-12">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3 }}
              >
                <ReviewCard review={reviews[currentIndex]} />
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <button
              onClick={prevReview}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 bg-card rounded-full shadow-lg flex items-center justify-center hover:bg-muted transition-all z-10"
              aria-label="Previous review"
            >
              <ChevronLeft className="w-5 h-5 text-primary" />
            </button>
            <button
              onClick={nextReview}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 bg-card rounded-full shadow-lg flex items-center justify-center hover:bg-muted transition-all z-10"
              aria-label="Next review"
            >
              <ChevronRight className="w-5 h-5 text-primary" />
            </button>
          </div>
        </div>

        {/* Dots Navigation */}
        <div className="flex justify-center gap-2">
          {reviews.map((_, index) => (
            <button
              key={index}
              onClick={() => goToReview(index)}
              className={`transition-all ${
                index === currentIndex
                  ? 'w-8 h-2 bg-primary rounded-full'
                  : 'w-2 h-2 bg-border rounded-full hover:bg-muted-foreground'
              }`}
              aria-label={`Go to review ${index + 1}`}
            />
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 grid md:grid-cols-3 gap-8"
        >
          {[
            { number: '500+', label: 'Довольных клиентов' },
            { number: '4.9', label: 'Средний рейтинг' },
            { number: '98%', label: 'Повторных визитов' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {stat.number}
              </div>
              <div className="text-foreground/70">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

interface ReviewCardProps {
  review: Review;
}

function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-border">
      {/* Quote Icon */}
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
        <Quote className="w-6 h-6 text-primary" />
      </div>

      {/* Review Text */}
      <p className="text-foreground/80 mb-6 leading-relaxed">{review.text}</p>

      {/* Rating */}
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < review.rating
                ? 'fill-primary text-primary'
                : 'fill-border text-border'
            }`}
          />
        ))}
      </div>

      {/* Service Badge */}
      <div className="inline-flex items-center px-3 py-1 bg-muted text-primary text-sm rounded-full mb-4">
        {review.service}
      </div>

      {/* Author */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <img
          src={review.image}
          alt={review.name}
          className="w-12 h-12 rounded-full object-cover border border-border"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) fallback.classList.remove('hidden');
          }}
        />
        <div className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center text-primary font-bold hidden`}>
          {review.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-semibold text-foreground">{review.name}</div>
          <div className="text-sm text-muted-foreground">{review.date}</div>
        </div>
      </div>
    </div>
  );
}
