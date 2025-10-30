import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

export default function FAQ() {
  const navigate = useNavigate();
  const [salonInfo, setSalonInfo] = React.useState<any>({});

  React.useEffect(() => {
    apiClient.getSalonInfo()
      .then(setSalonInfo)
      .catch(err => console.error('Error loading salon info:', err));
  }, []);

  // Динамические FAQ на основе данных салона
  const faqs = [
    {
      question: 'Как записаться на процедуру?',
      answer: `Вы можете записаться на процедуру через форму на нашем сайте${salonInfo.phone ? `, позвонив по телефону ${salonInfo.phone}` : ''}${salonInfo.instagram ? `, или написав нам в Instagram ${salonInfo.instagram}` : ''}. Мы свяжемся с вами для подтверждения записи.`
    },
    {
      question: 'Какие способы оплаты вы принимаете?',
      answer: 'Мы принимаем оплату наличными и картами (Visa, MasterCard, American Express). Оплата производится после оказания услуги.'
    },
    {
      question: 'Могу ли я отменить или перенести запись?',
      answer: 'Да, вы можете отменить или перенести запись не позднее чем за 24 часа до назначенного времени. При отмене менее чем за 24 часа может взиматься штраф в размере 50% от стоимости услуги.'
    },
    {
      question: 'Какие материалы вы используете?',
      answer: 'Мы используем только сертифицированные премиальные материалы от ведущих мировых брендов. Все пигменты гипоаллергенны и безопасны для здоровья.'
    },
    {
      question: 'Есть ли у ваших мастеров сертификаты?',
      answer: 'Да, все наши мастера имеют международные сертификаты и регулярно проходят курсы повышения квалификации.'
    },
    {
      question: 'Нужна ли подготовка перед процедурой?',
      answer: 'Да, для некоторых процедур требуется подготовка. Детальные рекомендации мы предоставляем при записи.'
    },
    {
      question: 'Есть ли противопоказания к процедурам?',
      answer: 'Да, у каждой процедуры есть свои противопоказания. Основные: беременность, лактация, острые воспалительные процессы, заболевания крови, онкология. Перед процедурой обязательна консультация с мастером.'
    },
    {
      question: 'Предоставляете ли вы гарантию на услуги?',
      answer: 'Да, мы гарантируем качество всех наших услуг. Если вы не удовлетворены результатом, свяжитесь с нами в течение 7 дней, и мы найдем решение.'
    },
    {
      question: 'Есть ли у вас программа лояльности?',
      answer: 'Да, у нас есть накопительная программа лояльности. После каждого посещения вы получаете бонусы, которые можно использовать для оплаты следующих визитов.'
    },
    ...(salonInfo.working_hours ? [{
      question: 'Работаете ли вы в выходные?',
      answer: `Да, мы работаем 7 дней в неделю. ${salonInfo.working_hours.weekdays ? `В будние дни ${salonInfo.working_hours.weekdays}` : ''}${salonInfo.working_hours.weekends ? `, в выходные ${salonInfo.working_hours.weekends}` : ''}.`
    }] : []),
    {
      question: 'Можно ли подарить сертификат на услуги?',
      answer: 'Да, мы предлагаем подарочные сертификаты на любую сумму или на конкретные услуги. Свяжитесь с нами для оформления сертификата.'
    },
    ...(salonInfo.address ? [{
      question: 'Где находится ваш салон?',
      answer: `Мы находимся по адресу: ${salonInfo.address}. Подробную информацию о том, как добраться, вы можете найти на странице Контакты.`
    }] : [])
  ];

  return (
    <div>
      {/* Header */}
      <section className="bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <HelpCircle className="w-10 h-10 text-pink-600" />
          </div>
          <h1 className="text-5xl text-gray-900 mb-4">Часто задаваемые вопросы</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Ответы на популярные вопросы о наших услугах
          </p>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border border-gray-200 rounded-lg px-6"
                >
                  <AccordionTrigger className="text-left hover:no-underline">
                    <span className="text-lg text-gray-900">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pt-2 pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl text-gray-900 mb-4">Не нашли ответ на свой вопрос?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Свяжитесь с нами, и мы с радостью ответим на все ваши вопросы
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-pink-500 to-purple-600"
              onClick={() => navigate('/contacts')}
            >
              Связаться с нами
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/')}
            >
              Записаться на процедуру
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}