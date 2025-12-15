// ReviewsSection.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Quote } from "lucide-react";
// Using explicit relative path for safety
import { apiClient } from "../../src/api/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface Testimonial {
  id: number;
  name: string;
  image: string;
  rating: number;
  service: string;
  text: string;
  date: string;
}

export function Testimonials() {
  const { t, i18n } = useTranslation(['public_landing', 'common', 'dynamic']);
  const language = i18n.language;

  const fallbackReviews: Testimonial[] = [
    {
      id: 1,
      name: 'Анна Петрова',
      image: 'https://images.unsplash.com/photo-1623594675959-02360202d4d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBwcm9mZXNzaW9uYWwlMjB3b21hbnxlbnwxfHx8fDE3NjU3NTM5ODd8MA&ixlib=rb-4.1.0&q=80&w=1080',
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
      text: 'Прекрасная атмосфера и высочайший уровень сервиса. После массажа лица чувствую себя обновленной.',
      date: '12 декабря 2024',
    },
    {
      id: 3,
      name: 'Елена Смирнова',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      rating: 5,
      service: 'Маникюр',
      text: 'Лучший салон в городе! Всегда довольна результатом. Мастера - настоящие профессионалы своего дела.',
      date: '10 декабря 2024',
    },
  ];

  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackReviews);

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
          setTestimonials(mappedReviews);
          console.log(`Loaded ${mappedReviews.length} reviews from database`);
        } else {
          console.log("Using fallback reviews");
        }
      } catch (error) {
        console.error('Error loading testimonials:', error);
      }
    };

    fetchTestimonials();
  }, [language, t]);

  return (
    <section id="testimonials" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('testimonialsTag') || 'Отзывы клиентов'}
          </p>
          <h2 className="text-3xl sm:text-5xl mb-6 text-[var(--heading)]">
            {t('testimonialsTitle') || 'Что говорят о нас'}
          </h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            {t('testimonialsDesc') || 'Мы ценим доверие каждого клиента и гордимся положительными отзывами'}
          </p>
        </div>

        {/* Carousel containing Target Design (Gradient Cards, Stars Top) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full relative px-12 md:px-20 overflow-visible"
          >
            <CarouselContent className="-ml-6 md:-ml-10">
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={testimonial.id || index} className="pl-6 md:pl-10 basis-full md:basis-1/2 lg:basis-1/3 xl:basis-1/4 h-auto py-4">
                  <ReviewCard review={testimonial} />
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* Navigation Arrows */}
            <CarouselPrevious className="flex absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 bg-white text-pink-600 border-pink-100 shadow-lg hover:bg-pink-50 transition-all duration-300 z-50 disabled:opacity-50" />
            <CarouselNext className="flex absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 bg-white text-pink-600 border-pink-100 shadow-lg hover:bg-pink-50 transition-all duration-300 z-50 disabled:opacity-50" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}

// Target Design (Scenario 2: Gradient Card, Stars Top)
function ReviewCard({ review }: { review: Testimonial }) {
  return (
    <div className="group bg-gradient-to-br from-white to-pink-50/20 border border-pink-100/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full hover:-translate-y-1 hover:border-pink-200/80">

      {/* Stars Row (Top) */}
      <div className="flex gap-1 mb-3 sm:mb-4">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 sm:w-5 sm:h-5 ${i < review.rating ? '' : 'text-muted/30 fill-muted/30'}`}
            style={i < review.rating ? { color: '#db2777', fill: '#db2777' } : {}}
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>

      {/* Review Text */}
      <div className="flex-1">
        <p className="text-sm sm:text-base text-foreground/80 mb-4 sm:mb-6 leading-relaxed line-clamp-4 italic">
          "{review.text}"
        </p>
      </div>

      {/* Footer (Avatar + Name) */}
      <div className="border-t border-pink-100/50 pt-3 sm:pt-4 mt-auto flex items-center gap-3">
        {review.image ? (
          <img
            src={review.image}
            alt={review.name}
            className="w-10 h-10 rounded-full object-cover border border-pink-100"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}

        {/* Fallback Avatar (Initial) - Hidden if image loads */}
        <div className={`w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold text-sm shadow-inner ${review.image ? 'hidden' : ''}`}>
          {review.name.charAt(0).toUpperCase()}
        </div>

        <div>
          <p className="font-semibold text-foreground text-sm sm:text-base">{review.name}</p>
          <p className="text-xs text-muted-foreground">{review.service || 'Client'}</p>
        </div>
      </div>
    </div>
  );
}
