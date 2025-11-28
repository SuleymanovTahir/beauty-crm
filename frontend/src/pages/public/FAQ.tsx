import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useTranslation } from 'react-i18next';

export default function FAQ() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['public/Faq', 'common']);
  const [salonInfo, setSalonInfo] = React.useState<any>({});
  const [faqs, setFaqs] = React.useState<any[]>([]);

  React.useEffect(() => {
    // Load salon info
    apiClient.getSalonInfo()
      .then(setSalonInfo)
      .catch(err => console.error('Error loading salon info:', err));

    // Load FAQs
    apiClient.getPublicFAQ(i18n.language)
      .then(data => setFaqs(data.faq || []))
      .catch(err => console.error('Error loading FAQs:', err));
  }, [i18n.language]);

  return (
    <div>
      {/* Header */}
      <section className="bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <HelpCircle className="w-10 h-10 text-pink-600" />
          </div>
          <h1 className="text-5xl text-gray-900 mb-4">{t('faq:title')}</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('faq:subtitle')}
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
          <h2 className="text-3xl text-gray-900 mb-4">{t('faq:cta.title')}</h2>
          <p className="text-lg text-gray-600 mb-8">
            {t('faq:cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-pink-500 to-purple-600"
              onClick={() => navigate('/contacts')}
            >
              {t('faq:cta.contactButton')}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/')}
            >
              {t('faq:cta.bookButton')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}