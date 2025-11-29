// /frontend/public_landing/components/Testimonials.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../src/api/client";

interface Testimonial {
  id: number;
  name: string;
  text: string;
  rating: number;
}

export function Testimonials() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const data = await apiClient.getPublicReviews(language);
        if (data.reviews && data.reviews.length > 0) {
          // Map the text field based on language if available, otherwise fallback to text
          const mappedReviews = data.reviews.map((review: any) => ({
            ...review,
            text: review[`text_${language}`] || review.text_ru || review.text || ""
          }));
          setTestimonials(mappedReviews);
        }
      } catch (error) {
        console.error('Error loading testimonials:', error);
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, [language]);

  if (loading) {
    return (
      <section id="testimonials" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-muted-foreground">{t('loading') || 'Загрузка отзывов...'}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="testimonials" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('testimonialsTag') || 'Отзывы клиентов'}
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary">
            {t('testimonialsTitle') || 'Что говорят о нас'}
          </h2>
          <p className="text-lg text-foreground/70">
            {t('testimonialsDesc') || 'Мы ценим доверие каждого клиента и гордимся положительными отзывами'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id || index}
              className="group bg-card border border-border/50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 flex flex-col h-full"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${i < testimonial.rating ? 'text-primary fill-primary' : 'text-muted/30 fill-muted/30'}`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>

              <div className="flex-1">
                <p className="text-sm sm:text-base text-foreground/80 mb-6 leading-relaxed line-clamp-4 italic">
                  "{testimonial.text}"
                </p>
              </div>

              <div className="border-t border-border/50 pt-4 mt-auto flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {testimonial.name.charAt(0).toUpperCase()}
                </div>
                <p className="font-semibold text-foreground text-sm sm:text-base">{testimonial.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
