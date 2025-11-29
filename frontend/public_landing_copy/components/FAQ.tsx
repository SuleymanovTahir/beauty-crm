import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/ui/accordion";
import { useLanguage } from "../LanguageContext";
import { Button } from "../../../components/ui/button";
import { Calendar, Phone } from "lucide-react";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

export function FAQ() {
  const { language, t } = useLanguage();
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [salonPhone, setSalonPhone] = useState<string>("+971 XX XXX XXXX");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const faqResponse = await fetch(`/api/public/faq?language=${language}`);
        const faqData = await faqResponse.json();
        const faqArray = Array.isArray(faqData) ? faqData : (faqData.faq || []);
        setFaqs(faqArray);

        const salonResponse = await fetch(`/api/public/salon-info?language=${language}`);
        const salonData = await salonResponse.json();
        if (salonData.phone) {
          setSalonPhone(salonData.phone);
        }
      } catch (error) {
        console.error('Error loading FAQ:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [language]);

  if (loading) {
    return (
      <section id="faq" className="py-16 sm:py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-muted-foreground">{t('loading', { defaultValue: 'Загрузка...' })}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="faq" className="py-16 sm:py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('faqTag', { defaultValue: 'FAQ' })}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-primary">
            {t('faqTitle', { defaultValue: 'Часто задаваемые вопросы' })}
          </h2>
          <p className="text-base sm:text-lg text-foreground/70">
            {t('faqDesc', { defaultValue: 'Ответы на популярные вопросы наших клиентов' })}
          </p>
        </div>

        {faqs.length > 0 ? (
          <Accordion type="single" collapsible className="w-full space-y-3 sm:space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.id}
                value={`item-${index}`}
                className="bg-card border-2 border-border/50 rounded-xl sm:rounded-2xl px-4 sm:px-6 data-[state=open]:shadow-lg data-[state=open]:border-primary/50 transition-all duration-300"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4 sm:py-6">
                  <span className="text-sm sm:text-base text-primary pr-4">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-4 sm:pb-6 text-xs sm:text-sm text-foreground/70 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center text-muted-foreground">
            {t('noFaqAvailable', { defaultValue: 'Вопросы скоро появятся' })}
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-8 sm:mt-12 text-center space-y-4 p-6 sm:p-8 bg-card rounded-xl sm:rounded-2xl border border-border/50">
          <p className="text-sm sm:text-base text-foreground/70">
            {t('faqContactPrompt', { defaultValue: 'Не нашли ответ на свой вопрос?' })}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            <Button
              variant="outline"
              onClick={() => window.location.href = `tel:${salonPhone}`}
              className="gap-2 w-full sm:w-auto"
            >
              <Phone className="w-4 h-4" />
              {t('callUs', { defaultValue: 'Позвонить' })}: {salonPhone}
            </Button>
            <Button
              onClick={() => {
                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 w-full sm:w-auto"
            >
              <Calendar className="w-4 h-4" />
              {t('bookNow', { defaultValue: "Записаться онлайн" })}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
