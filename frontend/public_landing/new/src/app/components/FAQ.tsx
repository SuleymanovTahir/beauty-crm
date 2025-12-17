import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Button } from "./ui/button";
import { Calendar, Phone } from "lucide-react";

const faqs = [
  {
    id: 1,
    question: "Какие услуги вы предоставляете?",
    answer: "Мы предлагаем широкий спектр услуг: маникюр, педикюр, стрижки, окрашивание, укладки, макияж, уход за лицом. Все процедуры выполняются опытными мастерами."
  },
  {
    id: 2,
    question: "Как записаться на прием?",
    answer: "Вы можете записаться онлайн через форму на сайте, позвонить по телефону или написать в WhatsApp. Мы работаем ежедневно."
  },
  {
    id: 3,
    question: "Какие у вас цены?",
    answer: "Цены зависят от выбранной услуги и мастера. Подробный прейскурант доступен в разделе 'Услуги'. Мы регулярно проводим акции и предлагаем специальные цены."
  },
  {
    id: 4,
    question: "Можно ли отменить или перенести запись?",
    answer: "Да, вы можете отменить или перенести запись, уведомив нас минимум за 24 часа. Это можно сделать по телефону или через личный кабинет."
  },
  {
    id: 5,
    question: "Какие материалы вы используете?",
    answer: "Мы используем только профессиональные материалы ведущих мировых брендов. Все продукты сертифицированы и гипоаллергенны."
  },
  {
    id: 6,
    question: "Есть ли у вас программа лояльности?",
    answer: "Да, у нас действует программа лояльности для постоянных клиентов с накопительными скидками и специальными предложениями."
  }
];

export function FAQ() {
  return (
    <section id="faq" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            FAQ
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            Часто задаваемые вопросы
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            Ответы на популярные вопросы
          </p>
        </div>

        <Accordion type="single" collapsible defaultValue="item-0" className="w-full space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={faq.id}
              value={`item-${index}`}
              className="bg-card border-2 border-border/50 rounded-lg sm:rounded-xl px-3 sm:px-4 lg:px-6 data-[state=open]:shadow-lg data-[state=open]:border-primary/50 transition-all"
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

        <div className="mt-6 sm:mt-8 lg:mt-12 text-center space-y-4 p-4 sm:p-6 lg:p-8 bg-card rounded-lg sm:rounded-xl border border-border/50">
          <p className="text-sm sm:text-base text-foreground/70">
            Не нашли ответ на свой вопрос?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto">
            <Button
              variant="outline"
              onClick={() => window.location.href = 'tel:+971542478604'}
              className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground h-10 text-sm"
            >
              <Phone className="w-4 h-4 mr-2" />
              Позвонить
            </Button>
            <Button
              onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full hero-button-primary h-10 text-sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Записаться онлайн
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
