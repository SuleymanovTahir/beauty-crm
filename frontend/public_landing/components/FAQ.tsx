import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Button } from "./ui/button";
import { Calendar, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";

export function FAQ() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const [salonPhone, setSalonPhone] = useState("");

  // Use translations for FAQs. Ensure your translation files structure matches this.
  const [faqs, setFaqs] = useState<{ id: number; question: string; answer: string }[]>([]);

  useEffect(() => {
    // Fetch salon info and FAQs
    const fetchData = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

        // 1. Fetch Salon Info for phone
        const resInfo = await fetch(`${API_URL}/api/public/salon-info?language=${i18n.language}`);
        const dataInfo = await resInfo.json();
        if (dataInfo.phone) {
          setSalonPhone(dataInfo.phone);
        }

        // 2. Fetch FAQs from DB
        const resFaq = await fetch(`${API_URL}/api/public/faq?language=${i18n.language}`);
        const dataFaq = await resFaq.json();

        if (dataFaq.faqItems && dataFaq.faqItems.length > 0) {
          setFaqs(dataFaq.faqItems);
        } else {
          // Fallback to translations if DB is empty
          const tFaqs = t('faqItems', { returnObjects: true, ns: 'public_landing' }) as Array<any>;
          if (Array.isArray(tFaqs)) {
            setFaqs(tFaqs.map((item, index) => ({
              id: index,
              question: item.question || '',
              answer: item.answer || ''
            })));
          }
        }

      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback on error
        const tFaqs = t('faqItems', { returnObjects: true, ns: 'public_landing' }) as Array<any>;
        if (Array.isArray(tFaqs)) {
          setFaqs(tFaqs.map((item, index) => ({
            id: index,
            question: item.question || '',
            answer: item.answer || ''
          })));
        }
      }
    };
    fetchData();
  }, [i18n.language]);

  return (
    <section id="faq" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            {t('faqTag', { defaultValue: 'FAQ' })}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('faqTitle', { defaultValue: 'Часто задаваемые вопросы' })}
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            {t('faqDesc', { defaultValue: 'Ответы на популярные вопросы' })}
          </p>
        </div>

        {faqs.length > 0 ? (
          <Accordion type="single" collapsible defaultValue="item-0" className="w-full space-y-3 sm:space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.id}
                value={`item-${index}`}
                className="bg-card border-2 border-primary/20 rounded-lg sm:rounded-xl px-3 sm:px-4 lg:px-6 data-[state=open]:shadow-lg data-[state=open]:border-primary/50 transition-all"
              >
                <AccordionTrigger className="text-left hover:no-underline py-3 sm:py-4 lg:py-6">
                  <span className="text-sm sm:text-base text-[var(--heading)] pr-4">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-3 sm:pb-4 lg:pb-6 text-xs sm:text-sm text-foreground/70">
                  <div className="w-20 h-0.5 bg-primary/20 mb-3 rounded" />
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            {t('noFaqAvailable', { defaultValue: 'Вопросы скоро появятся' })}
          </div>
        )}

        <div className="mt-6 sm:mt-8 lg:mt-12 text-center space-y-4 p-4 sm:p-6 lg:p-8 bg-card rounded-lg sm:rounded-xl border border-border transition-colors">
          <p className="text-sm sm:text-base text-foreground/70">
            {t('faqContactPrompt', { defaultValue: 'Не нашли ответ на свой вопрос?' })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto">
            <Button
              variant="outline"
              onClick={() => window.location.href = `tel:${salonPhone}`}
              className="w-full bg-background border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground h-10 text-sm"
            >
              <Phone className="w-4 h-4 mr-2" />
              {t('callUs', { defaultValue: 'Позвонить' })}
            </Button>
            <Button
              onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full hero-button-primary h-10 text-sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('bookNow', { defaultValue: 'Записаться онлайн' })}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
