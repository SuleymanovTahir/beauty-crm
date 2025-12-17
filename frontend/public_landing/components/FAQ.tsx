// /frontend/public_landing/components/FAQ.tsx
import { useState, useEffect } from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar, Phone } from "lucide-react";

export function FAQ() {
    const { t, i18n } = useTranslation(['public_landing/faq', 'public_landing', 'common']);
    const [loading, setLoading] = useState(true);
    // Updated default phone
    const salonPhone = "+971 58 533 5555";

    // Load FAQ from i18n locale files instead of API
    const faqData = t('items', { returnObjects: true, ns: 'public_landing/faq' }) as Array<any> || [];

    // Fallback if data is not an array (e.g. key failed to load)
    const faqs = Array.isArray(faqData) ? faqData.map((item, index) => ({
        id: index,
        question: item.question || '',
        answer: item.answer || '',
        category: 'general'
    })) : [];

    useEffect(() => {
        // Fetch salon info only, skipping FAQ API
        const fetchSalonInfo = async () => {
            try {
                // Simulate loading for smoother UX
                setLoading(false);

                // Optional: still fetch dynamic salon info like phone if needed
                // const salonResponse = await fetch(`/api/public/salon-info?language=${i18n.language}`);
                // const salonData = await salonResponse.json();
                // if (salonData.phone) setSalonPhone(salonData.phone);
            } catch (error) {
                console.error('Error loading salon info:', error);
                setLoading(false);
            }
        };

        fetchSalonInfo();
    }, [i18n.language]);

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
        <section id="faq" className="py-16 sm:py-24 bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 sm:mb-16">
                    <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
                        {t('faqTag', { ns: 'public_landing', defaultValue: 'FAQ' })}
                    </p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-[var(--heading)]">
                        {t('faqTitle', { ns: 'public_landing', defaultValue: 'Часто задаваемые вопросы' })}
                    </h2>
                    <p className="text-base sm:text-lg text-foreground/70">
                        {t('faqDesc', { ns: 'public_landing', defaultValue: 'Ответы на популярные вопросы наших клиентов' })}
                    </p>
                </div>

                {faqs.length > 0 ? (
                    <Accordion
                        type="single"
                        collapsible
                        defaultValue="item-0"
                        className="w-full space-y-3 sm:space-y-4"
                    >
                        {faqs.map((faq, index) => {
                            return (
                                <AccordionItem
                                    key={faq.id}
                                    value={`item-${index}`}
                                    className="group bg-card border-2 border-border/50 rounded-xl sm:rounded-2xl px-4 sm:px-6 data-[state=open]:shadow-lg data-[state=open]:border-primary/50 transition-all duration-300"
                                >
                                    <AccordionTrigger className="text-left hover:no-underline py-4 sm:py-6 [&[data-state=open]>span]:!text-primary">
                                        <span className="text-sm sm:text-base text-[var(--heading)] pr-4 transition-colors">{faq.question}</span>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-4 sm:pb-6 text-xs sm:text-sm text-foreground/70 leading-relaxed">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                ) : (
                    <div className="text-center text-muted-foreground">
                        {t('noFaqAvailable', { defaultValue: 'Вопросы скоро появятся' })}
                    </div>
                )}

                {/* CTA Section */}
                <div className="mt-8 sm:mt-12 text-center space-y-4 p-6 sm:p-8 bg-card rounded-xl sm:rounded-2xl border border-border/50">
                    <p className="text-sm sm:text-base text-foreground/70">
                        {t('faqContactPrompt', { ns: 'public_landing', defaultValue: 'Не нашли ответ на свой вопрос?' })}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
                        <Button
                            variant="outline"
                            onClick={() => window.location.href = `tel:${salonPhone}`}
                            className="w-full overflow-hidden px-4 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                            <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{t('callUs', { ns: 'public_landing', defaultValue: 'Позвонить' })}: {salonPhone}</span>
                        </Button>
                        <Button
                            onClick={() => {
                                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="w-full overflow-hidden px-4 hero-button-primary"
                        >
                            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{t('bookNow', { ns: 'public_landing', defaultValue: "Записаться онлайн" })}</span>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
