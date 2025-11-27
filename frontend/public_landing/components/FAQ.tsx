import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

const faqs = [
  {
    question: "Как записаться на процедуру?",
    answer: "Вы можете записаться онлайн через форму на нашем сайте, позвонив по телефону +7 (999) 123-45-67 или написав нам в социальных сетях. Мы работаем ежедневно с 10:00 до 21:00.",
  },
  {
    question: "Можно ли отменить или перенести запись?",
    answer: "Да, вы можете отменить или перенести запись, предупредив нас не менее чем за 24 часа. Просьба сообщать об изменениях заранее, чтобы мы могли предложить время другим клиентам.",
  },
  {
    question: "Какие материалы вы используете?",
    answer: "Мы используем только профессиональные материалы премиум-класса от ведущих мировых брендов: OPI, CND, L'Oreal Professional, Kerastase, MAC и другие. Все продукты сертифицированы и безопасны.",
  },
  {
    question: "Есть ли у вас программа лояльности?",
    answer: "Да, у нас действует накопительная система скидок для постоянных клиентов. При первом посещении вы получаете карту клиента, на которую начисляются бонусы. Также действуют специальные предложения и акции.",
  },
  {
    question: "Сколько времени занимает процедура?",
    answer: "Длительность зависит от выбранной процедуры. В среднем: маникюр - 60-90 минут, окрашивание волос - 2-3 часа, макияж - 60-90 минут. Точное время уточняйте при записи.",
  },
  {
    question: "Можно ли делать несколько процедур за одно посещение?",
    answer: "Конечно! Вы можете комбинировать различные услуги. Например, маникюр + педикюр, окрашивание + стрижка + укладка. При бронировании нескольких услуг сообщите об этом администратору для корректного планирования времени.",
  },
  {
    question: "Есть ли противопоказания к процедурам?",
    answer: "Некоторые процедуры имеют противопоказания (беременность, аллергические реакции, кожные заболевания). Наши мастера проведут консультацию перед процедурой и подберут безопасные варианты.",
  },
  {
    question: "Какие способы оплаты вы принимаете?",
    answer: "Мы принимаем наличные, банковские карты (Visa, Mastercard, МИР), а также оплату через мобильные приложения. Оплата производится после оказания услуги.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            FAQ
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary">
            Часто задаваемые вопросы
          </h2>
          <p className="text-lg text-foreground/70">
            Ответы на популярные вопросы наших клиентов
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
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

        <div className="mt-12 text-center">
          <p className="text-foreground/70 mb-4">Не нашли ответ на свой вопрос?</p>
          <p className="text-sm text-muted-foreground">
            Свяжитесь с нами по телефону{" "}
            <a href="tel:+79991234567" className="text-primary hover:underline">
              +7 (999) 123-45-67
            </a>
            {" "}или напишите в наши социальные сети
          </p>
        </div>
      </div>
    </section>
  );
}
