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
import { getApiUrl } from "../utils/apiUtils";
import { safeFetch } from "../utils/errorHandler";
import { useSalonInfo } from "../hooks/useSalonInfo";
import { useAuth } from "../../src/contexts/AuthContext";

export function FAQ() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const { phone: salonPhone } = useSalonInfo();
  const { user } = useAuth();

  // Use translations for FAQs. Ensure your translation files structure matches this.
  const [faqs, setFaqs] = useState<{ id: number; question: string; answer: string }[]>([]);

  useEffect(() => {
    // Fetch FAQs
    const fetchData = async () => {
      try {
        const API_URL = getApiUrl();

        // Fetch FAQs from DB with optional client_id
        const clientIdParam = user?.id ? `&client_id=${user.id}` : '';
        const resFaq = await safeFetch(`${API_URL}/api/public/faq?language=${i18n.language}${clientIdParam}`);
        const dataFaq = await resFaq.json();

        const faqData = dataFaq.faqItems || dataFaq.faq || [];

        if (faqData && faqData.length > 0) {
          setFaqs(faqData);
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
  }, [i18n.language, user?.id]);

  return (
    <section id="faq" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            {t('faqTag')}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('faqTitlePart1')} <span className="text-primary">{t('faqTitlePart2')}</span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            {t('faqDesc')}
          </p>
        </div>

        {faqs.length > 0 ? (
          <Accordion type="single" collapsible defaultValue="item-0" className="w-full space-y-3 sm:space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.id}
                value={`item-${index}`}
                className="faq-accordion-item"
              >
                <AccordionTrigger className="text-left hover:no-underline py-3 sm:py-4 lg:py-6">
                  <span className="text-sm sm:text-base text-[var(--heading)] pr-4">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-3 sm:pb-4 lg:pb-6 text-xs sm:text-sm text-foreground/70">
                  <div className="faq-divider" />
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            {t('noFaqAvailable')}
          </div>
        )}

        <div className="mt-6 sm:mt-8 lg:mt-12 text-center space-y-4 p-4 sm:p-6 lg:p-8 glass-panel transition-colors">
          <p className="text-sm sm:text-base text-foreground/70">
            {t('faqContactPrompt')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto">
            <Button
              variant="outline"
              onClick={() => window.location.href = `tel:${salonPhone}`}
              className="w-full bg-background border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground h-10 text-sm"
            >
              <Phone className="w-4 h-4 mr-2" />
              {t('callUs')}
            </Button>
            <Button
              onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full hero-button-primary h-10 text-sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('bookNow')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
