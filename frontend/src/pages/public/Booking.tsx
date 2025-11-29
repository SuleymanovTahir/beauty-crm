// /frontend/src/pages/public/Booking.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { PhoneInput } from '../../components/ui/phone-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from 'sonner';

interface Service {
  id: number;
  name: string;
  price: number;
  currency: string;
  category: string;
  description: string;
}

interface Employee {
  id: number;
  username: string;
  full_name: string;
  role: string;
  specialization: string | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function Booking() {
  const navigate = useNavigate();

  // State
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  // Form data
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("any");
  const [dateStr, setDateStr] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  const [clientData, setClientData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  // Fetch services on mount
  useEffect(() => {
    fetchServices();
    fetchEmployees();
  }, []);

  // Fetch time slots when date or employee changes
  useEffect(() => {
    if (dateStr) {
      fetchTimeSlots();
    } else {
      setTimeSlots([]);
      setSelectedTime("");
    }
  }, [dateStr, selectedEmployeeId]);

  const fetchServices = async () => {
    try {
      const response = await fetch('/public/services');
      const data = await response.json();
      setServices(data.services);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Ошибка загрузки услуг');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/public/employees');
      const data = await response.json();
      setEmployees(data.employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Ошибка загрузки мастеров');
    }
  };

  const fetchTimeSlots = async () => {
    if (!dateStr) return;

    try {
      const employeeParam = selectedEmployeeId && selectedEmployeeId !== "any" ? `&employee_id=${selectedEmployeeId}` : '';
      const response = await fetch(`/public/available-slots?date=${dateStr}${employeeParam}`);
      const data = await response.json();
      setTimeSlots(data.slots);

      // If previously selected time is no longer available, clear it
      if (selectedTime && !data.slots.some((slot: TimeSlot) => slot.time === selectedTime && slot.available)) {
        setSelectedTime("");
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast.error('Ошибка загрузки доступного времени');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedServiceId || !dateStr || !selectedTime || !clientData.name || !clientData.phone) {
      toast.error('Пожалуйста, заполните все обязательные поля');
      return;
    }

    setLoading(true);

    try {
      const bookingData = {
        service_id: parseInt(selectedServiceId),
        employee_id: selectedEmployeeId === "any" ? null : parseInt(selectedEmployeeId),
        date: dateStr,
        time: selectedTime,
        name: clientData.name,
        phone: clientData.phone,
        email: clientData.email || null,
        notes: clientData.notes || null
      };

      const response = await fetch('/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      if (response.ok) {
        toast.success('Запись успешно создана!');
        // Reset form or navigate
        setClientData({ name: '', phone: '', email: '', notes: '' });
        setSelectedServiceId("");
        setSelectedEmployeeId("any");
        setDateStr("");
        setSelectedTime("");
        navigate('/success');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка создания записи');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Ошибка создания записи');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="booking" className="py-24 bg-background min-h-screen flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            Запись онлайн
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary font-medium">
            Запишитесь на прием
          </h2>
          <p className="text-lg text-muted-foreground">
            Заполните форму, и мы свяжемся с вами для подтверждения записи
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
                value={clientData.name}
                onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                className="bg-input-background border-border/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон *</Label>
              <PhoneInput
                value={clientData.phone}
                onChange={(phone) => setClientData({ ...clientData, phone })}
                placeholder="+7 (999) 123-45-67"
                className="bg-input-background border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={clientData.email}
                onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                className="bg-input-background border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service">Услуга *</Label>
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
                required
              >
                <SelectTrigger id="service" className="bg-input-background border-border/50">
                  <SelectValue placeholder="Выберите услугу" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name} ({service.price} {service.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee">Мастер (опционально)</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger id="employee" className="bg-input-background border-border/50">
                  <SelectValue placeholder="Любой мастер" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Любой мастер</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.full_name} {employee.specialization ? `(${employee.specialization})` : ''}
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
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="bg-input-background border-border/50"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Желаемое время *</Label>
              <Select
                value={selectedTime}
                onValueChange={setSelectedTime}
                disabled={!dateStr || timeSlots.length === 0}
                required
              >
                <SelectTrigger id="time" className="bg-input-background border-border/50">
                  <SelectValue placeholder={dateStr ? (timeSlots.length > 0 ? "Выберите время" : "Нет свободного времени") : "Сначала выберите дату"} />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem
                      key={slot.time}
                      value={slot.time}
                      disabled={!slot.available}
                    >
                      {slot.time}
                    </SelectItem>
                  ))}
                  {timeSlots.length === 0 && dateStr && (
                    <SelectItem value="none" disabled>Нет свободного времени</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              placeholder="Дополнительные пожелания или вопросы"
              value={clientData.notes}
              onChange={(e) => setClientData({ ...clientData, notes: e.target.value })}
              className="bg-input-background border-border/50 min-h-[100px]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg"
          >
            {loading ? 'Отправка...' : 'Отправить заявку'}
          </Button>

          <p className="text-sm text-muted-foreground text-center mt-4">
            * Обязательные поля
          </p>
        </form>
      </div>
    </section>
  );
}
