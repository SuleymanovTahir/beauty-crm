// /frontend/public_landing/BookingSection.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../src/api/client";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface BookingSectionProps {
  services: any[];
}

export function BookingSection({ services }: BookingSectionProps) {
  const { t } = useTranslation(['public_landing', 'common']);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    // email: "",
    // service: "",
    // date: "",
    // time: "",
    // comment: "",
  });

  // Default categories with translations
  const getDefaultCategories = () => [
    t('nails', { defaultValue: 'Ногти' }),
    t('hair', { defaultValue: 'Волосы' }),
    t('brows', { defaultValue: 'Брови и ресницы' }),
    t('cosmetology', { defaultValue: 'Косметология' }),
    t('otherServices', { defaultValue: 'Другое' }),
  ];

  // Extract unique categories from services
  const servicesList = services.length > 0
    ? Array.from(new Set(services.map(s => s.category).filter(Boolean)))
    : getDefaultCategories();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.phone) {
      toast.error(t('fillRequiredFields', { defaultValue: 'Пожалуйста, заполните все обязательные поля' }));
      return;
    }

    // Validate name length (minimum 2 characters)
    if (formData.name.trim().length < 2) {
      toast.error(t('nameMinLength', { defaultValue: 'Имя должно содержать минимум 2 символа' }));
      return;
    }

    // Validate phone number (minimum 10 digits)
    const phoneDigits = formData.phone.replace(/\D/g, ''); // Remove non-digits
    if (phoneDigits.length < 10) {
      toast.error(t('phoneMinLength', { defaultValue: 'Номер телефона должен содержать минимум 10 цифр' }));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/public/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          message: `New Booking Request: \n          Phone: ${formData.phone} `
          // Service: ${formData.service}
        })
      });

      if (response.ok) {
        toast.success(t('bookingSuccess', { defaultValue: 'Ваша заявка принята! Мы свяжемся с вами в ближайшее время.' }));
        // Reset form
        setFormData({
          name: "",
          phone: "",
          // email: "",
          // service: "",
          // date: "",
          // time: "",
          // comment: "",
        });
      } else {
        toast.error(t('bookingError', { defaultValue: 'Не удалось отправить заявку. Попробуйте позже.' }));
      }
    } catch (error) {
      console.error('Error sending booking request:', error);
      toast.error(t('sendError', { defaultValue: 'Произошла ошибка при отправке.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="booking" className="w-full max-w-7xl mx-auto px-4 py-12 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('bookingTag', { defaultValue: 'Запись онлайн' })}
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-[var(--heading)]">
            {t('bookingTitle', { defaultValue: 'Запишитесь на прием' })}
          </h2>
          <p className="text-lg text-foreground/70">
            {t('bookingDesc', { defaultValue: 'Заполните форму, и мы свяжемся с вами для подтверждения записи' })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-8 border border-border/50 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('yourName', { defaultValue: 'Ваше имя' })} *</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('enterName', { defaultValue: 'Введите ваше имя' })}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ border: "2px solid #f9a8d4" }}
                className="bg-[#f3f3f5] px-3 placeholder:text-[#717182]"
                minLength={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('phone', { defaultValue: 'Телефон' })} *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('enterPhone', { defaultValue: '+971 (50) 123-45-67' })}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{ border: "2px solid #f9a8d4" }}
                className="bg-[#f3f3f5] px-3 placeholder:text-[#717182]"
                minLength={10}
                required
              />
            </div>


            {/* <div className="space-y-2">
              <Label htmlFor="service">{t('service', { defaultValue: 'Услуга' })} *</Label>
              <Select
                value={formData.service}
                onValueChange={(value) => setFormData({ ...formData, service: value })}
                required
              >
                <SelectTrigger id="service" className="bg-input-background border-border/50">
                  <SelectValue placeholder={t('selectService', { defaultValue: 'Выберите услугу' })} />
                </SelectTrigger>
                <SelectContent>
                  {servicesList.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}


            {/* <div className="space-y-2">
              <Label htmlFor="email">{t('email', { defaultValue: 'Email' })}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('enterEmail', { defaultValue: 'your@email.com' })}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-input-background border-border/50"
              />
            </div> */}

            {/* <div className="space-y-2">
              <Label htmlFor="service">{t('service', { defaultValue: 'Услуга' })} *</Label>
              <Select
                value={formData.service}
                onValueChange={(value) => setFormData({ ...formData, service: value })}
                required
              >
                <SelectTrigger id="service" className="bg-input-background border-border/50">
                  <SelectValue placeholder={t('selectService', { defaultValue: 'Выберите услугу' })} />
                </SelectTrigger>
                <SelectContent>
                  {servicesList.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}

            {/* <div className="space-y-2">
              <Label htmlFor="date">{t('desiredDate', { defaultValue: 'Желаемая дата' })} *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-input-background border-border/50"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div> */}

            {/* <div className="space-y-2">
              <Label htmlFor="time">{t('desiredTime', { defaultValue: 'Желаемое время' })} *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="bg-input-background border-border/50"
                required
              />
            </div> */}
          </div>

          {/* <div className="space-y-2 mb-6">
            <Label htmlFor="comment">{t('comment', { defaultValue: 'Комментарий' })}</Label>
            <Textarea
              id="comment"
              placeholder={t('additionalComments', { defaultValue: 'Дополнительные пожелания или вопросы' })}
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="bg-input-background border-border/50 min-h-[100px]"
            />
          </div> */}

          <Button
            type="submit"
            disabled={loading}
            className="w-full hero-button-primary py-6"
          >
            {loading ? t('sending', { defaultValue: 'Отправка...' }) : t('submitBooking', { defaultValue: 'Отправить заявку' })}
          </Button>

          <p className="text-sm text-muted-foreground text-center mt-4">
            * {t('requiredFields', { defaultValue: 'Обязательные поля' })}
          </p>
        </form>
      </div>
    </div>
  );
}