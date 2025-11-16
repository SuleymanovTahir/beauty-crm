import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Phone, Mail, MessageSquare, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { PhoneInput } from '../../components/ui/phone-input';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation(['public/Booking', 'common']);

  // State
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  // Form data
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
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
    if (selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedDate, selectedEmployee]);

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
    if (!selectedDate) return;

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const employeeParam = selectedEmployee ? `&employee_id=${selectedEmployee.id}` : '';
      const response = await fetch(`/public/available-slots?date=${dateStr}${employeeParam}`);
      const data = await response.json();
      setTimeSlots(data.slots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast.error('Ошибка загрузки доступного времени');
    }
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error('Пожалуйста, заполните все поля');
      return;
    }

    if (!clientData.name || !clientData.phone) {
      toast.error('Пожалуйста, укажите имя и телефон');
      return;
    }

    setLoading(true);

    try {
      const bookingData = {
        service_id: selectedService.id,
        employee_id: selectedEmployee?.id || null,
        date: selectedDate.toISOString().split('T')[0],
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

  const nextStep = () => {
    if (step === 1 && !selectedService) {
      toast.error('Выберите услугу');
      return;
    }
    if (step === 3 && !selectedDate) {
      toast.error('Выберите дату');
      return;
    }
    if (step === 4 && !selectedTime) {
      toast.error('Выберите время');
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Онлайн-запись
          </h1>
          <p className="text-gray-600">
            Выберите услугу, мастера, дату и время
          </p>
        </div>

        {/* Progress steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[1, 2, 3, 4, 5].map((s) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step >= s
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {step > s ? <Check className="w-5 h-5" /> : s}
                  </div>
                  <span className="text-xs mt-1 text-gray-600">
                    {s === 1 && 'Услуга'}
                    {s === 2 && 'Мастер'}
                    {s === 3 && 'Дата'}
                    {s === 4 && 'Время'}
                    {s === 5 && 'Контакты'}
                  </span>
                </div>
                {s < 5 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > s ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step 1: Service Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Выберите услугу
              </h2>
              {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                <div key={category}>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryServices.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => setSelectedService(service)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedService?.id === service.id
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 hover:border-pink-300'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">{service.name}</h4>
                          <span className="text-pink-600 font-bold">
                            {service.price} {service.currency}
                          </span>
                        </div>
                        {service.description && (
                          <p className="text-sm text-gray-600">{service.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Employee Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Выберите мастера (опционально)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setSelectedEmployee(null)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    !selectedEmployee
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <h4 className="font-semibold text-gray-900">Любой мастер</h4>
                  <p className="text-sm text-gray-600">Выберет администратор</p>
                </div>
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    onClick={() => setSelectedEmployee(employee)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedEmployee?.id === employee.id
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {employee.full_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{employee.full_name}</h4>
                        {employee.specialization && (
                          <p className="text-sm text-gray-600">{employee.specialization}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Date Selection */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Выберите дату
              </h2>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                />
              </div>
            </div>
          )}

          {/* Step 4: Time Selection */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Выберите время
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className={`p-3 rounded-lg font-medium transition-all ${
                      selectedTime === slot.time
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                        : slot.available
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Contact Information */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Ваши контактные данные
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">
                    <User className="w-4 h-4 inline mr-2" />
                    Имя *
                  </Label>
                  <Input
                    id="name"
                    value={clientData.name}
                    onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                    placeholder="Иван Иванов"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Телефон *
                  </Label>
                  <PhoneInput
                    value={clientData.phone}
                    onChange={(phone) => setClientData({ ...clientData, phone })}
                    placeholder="+971 50 123 4567"
                  />
                </div>
                <div>
                  <Label htmlFor="email">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email (опционально)
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={clientData.email}
                    onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Комментарий (опционально)
                  </Label>
                  <Textarea
                    id="notes"
                    value={clientData.notes}
                    onChange={(e) => setClientData({ ...clientData, notes: e.target.value })}
                    placeholder="Особые пожелания или комментарии"
                    rows={3}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-lg mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Детали записи:</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Услуга:</span> {selectedService?.name}</p>
                  <p><span className="font-medium">Цена:</span> {selectedService?.price} {selectedService?.currency}</p>
                  {selectedEmployee && (
                    <p><span className="font-medium">Мастер:</span> {selectedEmployee.full_name}</p>
                  )}
                  <p><span className="font-medium">Дата:</span> {selectedDate?.toLocaleDateString('ru-RU')}</p>
                  <p><span className="font-medium">Время:</span> {selectedTime}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={step === 1 ? () => navigate('/') : prevStep}
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {step === 1 ? 'На главную' : 'Назад'}
            </Button>
            {step < 5 ? (
              <Button
                onClick={nextStep}
                className="bg-gradient-to-r from-pink-500 to-purple-600"
              >
                Далее
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-gradient-to-r from-pink-500 to-purple-600"
              >
                {loading ? 'Создание записи...' : 'Подтвердить запись'}
                <Check className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
