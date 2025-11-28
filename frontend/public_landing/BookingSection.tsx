import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const defaultServices = [
  "Маникюр",
  "Педикюр",
  "Окрашивание волос",
  "Стрижка",
  "Макияж",
  "Уход за лицом",
  "Другое",
];

interface BookingSectionProps {
  services?: any[];
}

export function BookingSection({ services = [] }: BookingSectionProps) {
  const { t } = useTranslation(['public_landing', 'common']);
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

  // Use services from database or fallback to default list
  const servicesList = services.length > 0 ? services.map(s => s.name) : defaultServices;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.phone || !formData.service || !formData.date || !formData.time) {
      toast.error("Пожалуйста, заполните все обязательные поля");
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
        toast.success("Ваша заявка принята! Мы свяжемся с вами в ближайшее время.");
        // Reset form
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
        toast.error("Не удалось отправить заявку. Попробуйте позже.");
      }
    } catch (error) {
      console.error('Error sending booking request:', error);
      toast.error("Произошла ошибка при отправке.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="booking" className="py-24 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('bookingTag', { defaultValue: 'Запись онлайн' })}
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary">
            {t('bookingTitle', { defaultValue: 'Запишитесь на прием' })}
          </h2>
          <p className="text-lg text-foreground/70">
            {t('bookingDesc', { defaultValue: 'Заполните форму, и мы свяжемся с вами для подтверждения записи' })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-8 border border-border/50 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <Label htmlFor="name">Ваше имя *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Введите ваше имя"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-input-background border-border/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-input-background border-border/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-input-background border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service">Услуга *</Label>
              <Select
                value={formData.service}
                onValueChange={(value) => setFormData({ ...formData, service: value })}
                required
              >
                <SelectTrigger id="service" className="bg-input-background border-border/50">
                  <SelectValue placeholder="Выберите услугу" />
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
              <Label htmlFor="date">Желаемая дата *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-input-background border-border/50"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Желаемое время *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="bg-input-background border-border/50"
                required
              />
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              placeholder="Дополнительные пожелания или вопросы"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="bg-input-background border-border/50 min-h-[100px]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6"
          >
            {loading ? "Отправка..." : "Отправить заявку"}
          </Button>

          <p className="text-sm text-muted-foreground text-center mt-4">
            * Обязательные поля
          </p>
        </form>
      </div>
    </section>
  );
}