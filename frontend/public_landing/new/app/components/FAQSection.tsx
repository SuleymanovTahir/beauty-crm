import { motion } from 'motion/react';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'Как записаться на процедуру?',
      answer: 'Вы можете записаться по телефону, через наш сайт или в социальных сетях. Мы работаем с 9:00 до 21:00 без выходных.',
    },
    {
      question: 'Какие способы оплаты вы принимаете?',
      answer: 'Мы принимаем наличные, банковские карты и электронные платежи. Также доступна оплата по QR-коду.',
    },
    {
      question: 'Есть ли у вас подарочные сертификаты?',
      answer: 'Да, мы предлагаем подарочные сертификаты любого номинала. Это отличный подарок для ваших близких!',
    },
    {
      question: 'Нужна ли предварительная консультация?',
      answer: 'Для некоторых процедур рекомендуется предварительная консультация. Наши специалисты помогут подобрать оптимальную программу.',
    },
    {
      question: 'Какие у вас противопоказания?',
      answer: 'Противопоказания индивидуальны для каждой процедуры. Перед записью наш специалист проконсультирует вас.',
    },
    {
      question: 'Можно ли отменить или перенести запись?',
      answer: 'Да, просим предупреждать об отмене или переносе минимум за 24 часа. Это можно сделать по телефону или через мессенджеры.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-background" id="faq">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl mb-4 text-foreground">
            Часто задаваемые{' '}
            <span className="text-primary">
              Вопросы
            </span>
          </h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Ответы на популярные вопросы наших клиентов
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="mb-4"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full text-left bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-foreground pr-4">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`w-5 h-5 text-primary flex-shrink-0 transition-transform duration-300 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                {openIndex === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 pt-4 border-t border-border text-foreground/70"
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}