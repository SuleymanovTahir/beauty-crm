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
import { motion } from "motion/react";
import { useInView } from "react-intersection-observer";

export function FAQ() {
    const { t, i18n } = useTranslation(['public_landing/faq', 'public_landing', 'common']);
    const [loading, setLoading] = useState(true);
    const salonPhone = "+971 58 533 5555";
    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.1
    });

    const faqData = t('items', { returnObjects: true, ns: 'public_landing/faq' }) as Array<any> || [];

    const faqs = Array.isArray(faqData) ? faqData.map((item, index) => ({
        id: index,
        question: item.question || '',
        answer: item.answer || '',
        category: 'general'
    })) : [];

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 100);
        return () => clearTimeout(timer);
    }, [i18n.language]);

    if (loading) {
        return (
            <section id="faq" className="py-16 sm:py-24 bg-background">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <p className="text-muted-foreground">{t('loading', { defaultValue: 'Загрузка...' })}</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="faq" className="py-12 sm:py-16 lg:py-24 bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 30 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-8 sm:mb-12 lg:mb-16"
                >
                    <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-3 sm:mb-4">
                        {t('faqTag', { ns: 'public_landing', defaultValue: 'FAQ' })}
                    </p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-[var(--heading)]">
                        {t('faqTitle', { ns: 'public_landing', defaultValue: 'Часто задаваемые вопросы' })}
                    </h2>
                    <p className="text-base sm:text-lg text-foreground/70 leading-relaxed">
                        {t('faqDesc', { ns: 'public_landing', defaultValue: 'Ответы на популярные вопросы наших клиентов' })}
                    </p>
                </motion.div>

                {faqs.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <Accordion type="single" collapsible className="w-full space-y-3 sm:space-y-4">
                            {faqs.map((faq, index) => (
                                <AccordionItem
                                    key={faq.id}
                                    value={`item-${index}`}
                                    className="group bg-card border-2 border-border/50 rounded-xl sm:rounded-2xl px-4 sm:px-6 data-[state=open]:shadow-lg data-[state=open]:border-primary/50 transition-all duration-300 hover:border-primary/30"
                                >
                                    <AccordionTrigger className="text-left hover:no-underline py-4 sm:py-6 [&[data-state=open]>span]:!text-primary">
                                        <span className="text-sm sm:text-base lg:text-lg text-[var(--heading)] pr-4 transition-colors font-medium">
                                            {faq.question}
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-4 sm:pb-6 text-xs sm:text-sm lg:text-base text-foreground/70 leading-relaxed">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </motion.div>
                ) : (
                    <div className="text-center text-muted-foreground">
                        {t('noFaqAvailable', { defaultValue: 'Вопросы скоро появятся' })}
                    </div>
                )}

                {/* CTA Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mt-8 sm:mt-12 lg:mt-16 text-center space-y-4 p-6 sm:p-8 bg-card rounded-xl sm:rounded-2xl border border-border/50"
                >
                    <p className="text-sm sm:text-base text-foreground/70">
                        {t('faqContactPrompt', { ns: 'public_landing', defaultValue: 'Не нашли ответ на свой вопрос?' })}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto">
                        <Button
                            variant="outline"
                            onClick={() => window.location.href = `tel:${salonPhone}`}
                            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                            <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate text-sm sm:text-base">
                                {t('callUs', { ns: 'public_landing', defaultValue: 'Позвонить' })}
                            </span>
                        </Button>
                        <Button
                            onClick={() => {
                                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="w-full hero-button-primary"
                        >
                            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate text-sm sm:text-base">
                                {t('bookNow', { ns: 'public_landing', defaultValue: "Записаться онлайн" })}
                            </span>
                        </Button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
