import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Instagram, Clock, Send} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { apiClient } from '../../api/client';
import { useTranslation } from 'react-i18next';

interface SalonInfo {
  address?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  working_hours?: {
    weekdays?: string;
    weekends?: string;
  };
}

export default function Contacts() {
  const { t } = useTranslation(['public/Contacts', 'common']);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [salonInfo, setSalonInfo] = useState<SalonInfo>({});

  useEffect(() => {
    apiClient.getSalonInfo()
      .then(data => setSalonInfo(data))
      .catch(err => console.error('Error loading salon info:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error(t('contacts:fill_all_fields'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message
        })
      });

      if (response.ok) {
        toast.success(t('contacts:message_sent'));
        setFormData({ name: '', email: '', message: '' });
      } else {
        toast.error(t('contacts:send_error'));
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error(t('contacts:try_later'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <section className="bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl text-gray-900 mb-4">{t('contacts:title')}</h1>
          <p className="text-xl text-gray-600">
            {t('contacts:subtitle')}
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl text-gray-900 mb-8">{t('contacts:how_to_contact')}</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-900 mb-1">{t('contacts:address')}</h3>
                    <p className="text-gray-600">{salonInfo.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-900 mb-1">{t('contacts:phone')}</h3>
                    <p className="text-gray-600">{salonInfo.phone}</p>
                    <p className="text-gray-600">+971 4 123 4567</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-900 mb-1">Email</h3>
                    <p className="text-gray-600">{salonInfo.email}</p>
                    <p className="text-gray-600">booking@luxurybeauty.ae</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Instagram className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-900 mb-1">Instagram</h3>
                    <a 
                      href="https://instagram.com/luxurybeauty_dubai" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:underline"
                    >
                      {salonInfo.instagram}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-900 mb-2">{t('contacts:working_hours')}</h3>
                    <div className="space-y-1 text-gray-600">
                      <p>{t('contacts:weekdays')}: {salonInfo.working_hours?.weekdays}</p>
                      <p>{t('contacts:weekends')}: {salonInfo.working_hours?.weekends || '10:00 - 20:00'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl text-gray-900 mb-8">{t('contacts:write_us')}</h2>
              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="name">{t('contacts:your_name')} *</Label>
                    <Input
                      id="name"
                      required
                      disabled={loading}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('contacts:name_placeholder')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      disabled={loading}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder={t('contacts:email_placeholder')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">{t('contacts:message')} *</Label>
                    <Textarea
                      id="message"
                      required
                      disabled={loading}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder={t('contacts:message_placeholder')}
                      className="min-h-[150px]"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600" 
                    size="lg"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {loading ? t('contacts:sending') : t('contacts:send_button')}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {salonInfo.address && (
        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl text-gray-900 mb-8 text-center">{t('contacts:find_us')}</h2>
            <div className="bg-gray-200 rounded-2xl overflow-hidden h-[450px]">
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(salonInfo.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                title="Salon Location"
              ></iframe>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}