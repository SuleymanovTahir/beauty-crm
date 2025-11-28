import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../src/components/ui/accordion";
import { useLanguage } from "../LanguageContext";

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
        // Fetch FAQ
        const faqResponse = await fetch(`/api/public/faq?lang=${language}`);
        const faqData = await faqResponse.json();
        setFaqs(faqData.faq || []);

        // Fetch salon info for phone
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
      <section id="faq" className="py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-muted-foreground">{t('loading') || 'Loading...'}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="faq" className="py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('faqTag') || 'FAQ'}
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary">
            {t('faqTitle') || 'Часто задаваемые вопросы'}
          </h2>
          <p className="text-lg text-foreground/70">
            {t('faqDesc') || 'Ответы на популярные вопросы наших клиентов'}
          </p>
        </div>

        {faqs.length > 0 ? (
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.id}
                value={`item-${index}`}
                className="bg-card border border-border/50 rounded-2xl px-6 data-[state=open]:shadow-lg transition-all duration-300"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="text-primary pr-4">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-foreground/70 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center text-muted-foreground">
            {t('noFaqAvailable') || 'No FAQ available'}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-foreground/70 mb-4">
            {t('faqContactPrompt') || 'Не нашли ответ на свой вопрос?'}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('faqContactText') || 'Свяжитесь с нами по телефону'}{" "}
            <a href={`tel:${salonPhone}`} className="text-primary hover:underline">
              {salonPhone}
            </a>
            {" "}{t('faqContactSocial') || 'или напишите в наши социальные сети'}
          </p>
        </div>
      </div>
    </section>
  );
}
