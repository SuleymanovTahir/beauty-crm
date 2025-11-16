import React, { useState } from 'react';
import { Handshake, Send } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { apiClient } from '../../api/client';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function Cooperation() {
  const { t } = useTranslation(['public/Cooperation', 'common']);
  const [salonInfo, setSalonInfo] = useState<any>({});

  useEffect(() => {
    apiClient.getSalonInfo()
      .then(setSalonInfo)
      .catch(err => console.error('Error loading salon info:', err));
  }, []);
  
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    proposal: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(t('cooperation:success_message'));
    setFormData({ name: '', company: '', email: '', phone: '', proposal: '' });
  };

  return (
    <div>
      <section className="bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Handshake className="w-10 h-10 text-pink-600" />
          </div>
          <h1 className="text-5xl text-gray-900 mb-4">{t('cooperation:title')}</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('cooperation:subtitle')}
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl text-gray-900 mb-4">{t('cooperation:types_title')}</h2>
            <p className="text-xl text-gray-600">
              {t('cooperation:types_subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-8 rounded-2xl">
              <h3 className="text-2xl text-gray-900 mb-4">{t('cooperation:suppliers_title')}</h3>
              <p className="text-gray-600 mb-4">
                {t('cooperation:suppliers_desc')}
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• {t('cooperation:suppliers_item1')}</li>
                <li>• {t('cooperation:suppliers_item2')}</li>
                <li>• {t('cooperation:suppliers_item3')}</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl">
              <h3 className="text-2xl text-gray-900 mb-4">{t('cooperation:influencers_title')}</h3>
              <p className="text-gray-600 mb-4">
                {t('cooperation:influencers_desc')}
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• {t('cooperation:influencers_item1')}</li>
                <li>• {t('cooperation:influencers_item2')}</li>
                <li>• {t('cooperation:influencers_item3')}</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-8 rounded-2xl">
              <h3 className="text-2xl text-gray-900 mb-4">{t('cooperation:masters_title')}</h3>
              <p className="text-gray-600 mb-4">
                {t('cooperation:masters_desc')}
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• {t('cooperation:masters_item1')}</li>
                <li>• {t('cooperation:masters_item2')}</li>
                <li>• {t('cooperation:masters_item3')}</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl">
              <h3 className="text-2xl text-gray-900 mb-4">{t('cooperation:education_title')}</h3>
              <p className="text-gray-600 mb-4">
                {t('cooperation:education_desc')}
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• {t('cooperation:education_item1')}</li>
                <li>• {t('cooperation:education_item2')}</li>
                <li>• {t('cooperation:education_item3')}</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-8 rounded-2xl">
              <h3 className="text-2xl text-gray-900 mb-4">{t('cooperation:marketing_title')}</h3>
              <p className="text-gray-600 mb-4">
                {t('cooperation:marketing_desc')}
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• {t('cooperation:marketing_item1')}</li>
                <li>• {t('cooperation:marketing_item2')}</li>
                <li>• {t('cooperation:marketing_item3')}</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl">
              <h3 className="text-2xl text-gray-900 mb-4">{t('cooperation:other_title')}</h3>
              <p className="text-gray-600 mb-4">
                {t('cooperation:other_desc')}
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• {t('cooperation:other_item1')}</li>
                <li>• {t('cooperation:other_item2')}</li>
                <li>• {t('cooperation:other_item3')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-gray-900 mb-4">{t('cooperation:form_title')}</h2>
            <p className="text-xl text-gray-600">
              {t('cooperation:form_subtitle')}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">{t('cooperation:form_name')} *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('cooperation:form_name_placeholder')}
                  />
                </div>

                <div>
                  <Label htmlFor="company">{t('cooperation:form_company')}</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder={t('cooperation:form_company_placeholder')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t('cooperation:form_email_placeholder')}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">{t('cooperation:form_phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+971 52 696 1100"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="proposal">{t('cooperation:form_proposal')} *</Label>
                <Textarea
                  id="proposal"
                  required
                  value={formData.proposal}
                  onChange={(e) => setFormData({ ...formData, proposal: e.target.value })}
                  placeholder={t('cooperation:form_proposal_placeholder')}
                  className="min-h-[180px]"
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-purple-600" size="lg">
                <Send className="w-4 h-4 mr-2" />
                {t('cooperation:form_submit')}
              </Button>
            </form>
          </div>

          <div className="mt-8 text-center text-gray-600">
            <p>
              {t('cooperation:contact_directly')}: <br />
              {salonInfo.email && (
                <a href={`mailto:${salonInfo.email}`} className="text-pink-600 hover:underline">
                  {salonInfo.email}
                </a>
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}