import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from "sonner@2.0.3";
import { useLanguage } from "./LanguageContext";
import { Calendar, Send } from "lucide-react";

interface BookingSectionProps {
  services?: any[];
}

export function BookingSection({ services = [] }: BookingSectionProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    date: "",
    time: "",
    comment: "",
  });

  const getDefaultCategories = () => [
    t('nails', { defaultValue: 'Ногти' }),
    t('hair', { defaultValue: 'Волосы' }),
    t('brows', { defaultValue: 'Брови и ресницы' }),
    t('cosmetology', { defaultValue: 'Косметология' }),
    t('otherServices', { defaultValue: 'Другое' }),
  ];

  const servicesList = services.length > 0
    ? Array.from(new Set(services.map(s => s.category).filter(Boolean)))
    : getDefaultCategories();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.service || !formData.date || !formData.time) {
      toast.error(t('fillRequiredFields', { defaultValue: 'Пожалуйста, заполните все обязательные поля' }));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: `New Booking Request:
          Phone: ${formData.phone}
          Service: ${formData.service}
          Date: ${formData.date}
          Time: ${formData.time}
          Comment: ${formData.comment}`
        })
      });

      if (response.ok) {
        toast.success(t('bookingSuccess', { defaultValue: 'Ваша заявка принята! Мы свяжемся с вами в ближайшее время.' }));
        setFormData({
          name: "",
          phone: "",
          email: "",
          service: "",
          date: "",
          time: "",
          comment: "",
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
    <section id="booking" className="py-16 sm:py-24 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('bookingTag', { defaultValue: 'Запись онлайн' })}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-primary">
            {t('bookingTitle', { defaultValue: 'Запишитесь на прием' })}
          </h2>
          <p className="text-base sm:text-lg text-foreground/70">
            {t('bookingDesc', { defaultValue: 'Заполните форму, и мы свяжемся с вами для подтверждения записи' })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl sm:rounded-2xl p-6 sm:p-8 border-2 border-border/50 shadow-xl hover:shadow-2xl transition-shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm sm:text-base">{t('yourName', { defaultValue: 'Ваше имя' })} *</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('enterName', { defaultValue: 'Введите ваше имя' })}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-input-background border-border/50 h-11 sm:h-12"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm sm:text-base">{t('phone', { defaultValue: 'Телефон' })} *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('enterPhone', { defaultValue: '+971 (50) 123-45-67' })}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-input-background border-border/50 h-11 sm:h-12"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">{t('email', { defaultValue: 'Email' })}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('enterEmail', { defaultValue: 'your@email.com' })}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-input-background border-border/50 h-11 sm:h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service" className="text-sm sm:text-base">{t('service', { defaultValue: 'Услуга' })} *</Label>
              <Select
                value={formData.service}
                onValueChange={(value) => setFormData({ ...formData, service: value })}
                required
              >
                <SelectTrigger id="service" className="bg-input-background border-border/50 h-11 sm:h-12">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm sm:text-base">{t('desiredDate', { defaultValue: 'Желаемая дата' })} *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-input-background border-border/50 h-11 sm:h-12"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm sm:text-base">{t('desiredTime', { defaultValue: 'Желаемое время' })} *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="bg-input-background border-border/50 h-11 sm:h-12"
                required
              />
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <Label htmlFor="comment" className="text-sm sm:text-base">{t('comment', { defaultValue: 'Комментарий' })}</Label>
            <Textarea
              id="comment"
              placeholder={t('additionalComments', { defaultValue: 'Дополнительные пожелания или вопросы' })}
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="bg-input-background border-border/50 min-h-[100px]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-5 sm:py-6 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            size="lg"
          >
            {loading ? (
              <span>{t('sending', { defaultValue: 'Отправка...' })}</span>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>{t('submitBooking', { defaultValue: 'Отправить заявку' })}</span>
              </>
            )}
          </Button>

          <p className="text-xs sm:text-sm text-muted-foreground text-center mt-4">
            * {t('requiredFields', { defaultValue: 'Обязательные поля' })}
          </p>
        </form>
      </div>
    </section>
  );
}
