import { useState, useEffect } from "react";
import { useLanguage } from "../LanguageContext";
import { apiClient } from "../../../src/api/client";
import { Button } from "../../../components/ui/button";
import { Calendar } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  text: string;
  rating: number;
}

export function Testimonials() {
  const { t, language } = useLanguage();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const data = await apiClient.getPublicReviews(language);
        if (data.reviews && data.reviews.length > 0) {
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
      <section id="testimonials" className="py-16 sm:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-muted-foreground">{t('loading', { defaultValue: 'Загрузка отзывов...' })}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="testimonials" className="py-16 sm:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('testimonialsTag', { defaultValue: 'Отзывы клиентов' })}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-primary">
            {t('testimonialsTitle', { defaultValue: 'Что говорят о нас' })}
          </h2>
          <p className="text-base sm:text-lg text-foreground/70">
            {t('testimonialsDesc', { defaultValue: 'Мы ценим доверие каждого клиента и гордимся положительными отзывами' })}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id || index}
              className="bg-card rounded-xl sm:rounded-2xl p-6 sm:p-8 border-2 border-border/50 hover:border-primary/50 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${i < testimonial.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 fill-gray-300'}`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm sm:text-base text-foreground/80 mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>
              <div className="border-t border-border/50 pt-4">
                <p className="text-sm sm:text-base text-primary">{testimonial.name}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-8 sm:mt-12 space-y-4">
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('testimonialsCallToAction', { defaultValue: 'Станьте частью наших довольных клиентов!' })}
          </p>
          <Button
            onClick={() => {
              document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 sm:px-12 py-5 sm:py-6 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            size="lg"
          >
            <Calendar className="w-5 h-5" />
            {t('bookNow', { defaultValue: "Записаться на прием" })}
          </Button>
        </div>
      </div>
    </section>
  );
}
