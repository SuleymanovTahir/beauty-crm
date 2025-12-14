import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { motion } from "motion/react";
import { useInView } from "react-intersection-observer";

interface Testimonial {
  id: number;
  name: string;
  text: string;
  rating: number;
}

export function Testimonials() {
  const { t, i18n } = useTranslation(['public_landing', 'common', 'dynamic']);
  const language = i18n.language;
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  useEffect(() => {
    // Log to verify component mount
    console.log("Testimonials (New Design) mounted");
    const fetchTestimonials = async () => {
      try {
        const data = await apiClient.getPublicReviews(language);
        if (data.reviews && data.reviews.length > 0) {
          const mappedReviews = data.reviews.map((review: any) => ({
            ...review,
            text: review.text || review.text_ru || "",
            name: review.name || review.author_name || ""
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
  }, [language, t]);

  if (loading) {
    return (
      <section id="testimonials" className="py-16 sm:py-20 lg:py-24 bg-background border-4 border-red-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-muted-foreground">{t('loading') || 'Загрузка отзывов...'}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="testimonials" className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 lg:mb-16"
        >
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-3 sm:mb-4">
            {t('testimonialsTag') || 'Отзывы клиентов'}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-[var(--heading)]">
            {t('testimonialsTitle') || 'Что говорят о нас'}
          </h2>
          <p className="text-base sm:text-lg text-foreground/70 leading-relaxed">
            {t('testimonialsDesc') || 'Мы ценим доверие каждого клиента и гордимся положительными отзывами'}
          </p>
        </motion.div>

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
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="group bg-gradient-to-br from-white to-pink-50/20 border border-pink-100/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full hover:-translate-y-1 hover:border-pink-200/80"
                  >
                    <div className="flex gap-1 mb-3 sm:mb-4">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${i < testimonial.rating ? '' : 'text-muted/30 fill-muted/30'}`}
                          style={i < testimonial.rating ? { color: '#db2777', fill: '#db2777' } : {}}
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm sm:text-base text-foreground/80 mb-4 sm:mb-6 leading-relaxed line-clamp-4 italic">
                        "{testimonial.text}"
                      </p>
                    </div>

                    <div className="border-t border-pink-100/50 pt-3 sm:pt-4 mt-auto flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold text-sm shadow-inner">
                        {testimonial.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm sm:text-base">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground">Client</p>
                      </div>
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* Desktop Arrows - Visible and Positioned INSIDE padding */}
            <CarouselPrevious className="flex absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 bg-white text-primary border-primary/20 shadow-lg hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 z-50 disabled:opacity-100 disabled:pointer-events-auto" />
            <CarouselNext className="flex absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 bg-white text-primary border-primary/20 shadow-lg hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 z-50 disabled:opacity-100 disabled:pointer-events-auto" />

            {/* Mobile Controls - HIDDEN */}
            <div className="flex justify-center gap-6 mt-6 hidden">
              <CarouselPrevious className="static translate-y-0 h-10 w-10 bg-white border-primary/20 text-primary shadow-md hover:bg-primary hover:text-white transition-all duration-300" />
              <CarouselNext className="static translate-y-0 h-10 w-10 bg-white border-primary/20 text-primary shadow-md hover:bg-primary hover:text-white transition-all duration-300" />
            </div>
          </Carousel>
        </div>
      </div>
    </section>
  );
}
