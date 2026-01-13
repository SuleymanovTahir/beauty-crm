// /frontend/src/pages/admin/Calendar.tsx
// frontend/src/pages/admin/Calendar.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  User,
  Scissors,
  Clock,
  Plus,
  Trash2,
  Edit,
  Check
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useCurrency } from '../../hooks/useSalonSettings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface Booking {
  id: number;
  client_id: string;
  service: string;
  datetime: string;
  phone: string;
  name: string;
  status: string;
  created_at: string;
  revenue: number;
  master?: string;
}

interface Service {
  id: number;
  key: string;
  name: string;
  name_ru: string;
  price: number;
  currency: string;
  category: string;
}

interface Client {
  id: string;
  instagram_id: string;
  display_name: string;
  phone?: string;
  namejt: string;
}

interface UserMaster {
  id: number;
  username: string;
  full_name: string;
  role: string;
}


// Функция генерации слотов времени (вынесена наружу, принимает параметры)
const generateTimeSlots = (startHour: number, endHour: number) => {
  const slots = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    slots.push({ hour, minute: 0, display: `${String(hour).padStart(2, '0')}:00` });
    if (hour < endHour) {
      slots.push({ hour, minute: 30, display: `${String(hour).padStart(2, '0')}:30` });
    }
  }
  return slots;
};

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  confirmed: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  completed: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  cancelled: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
};



interface CalendarProps {
  employeeFilter?: boolean;
}


export default function Calendar({ employeeFilter = false }: CalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentDate, setCurrentDate] = useState<Date>(new Date(today));
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const { t } = useTranslation(['admin/Calendar', 'common']);
  const { currency, formatCurrency } = useCurrency();

  const statusLabels: Record<string, string> = {
    pending: t('calendar:pending'),
    confirmed: t('calendar:confirmed'),
    completed: t('calendar:completed'),
    cancelled: t('calendar:cancelled')
  };

  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [masters, setMasters] = useState<UserMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [addingBooking, setAddingBooking] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');

  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedServiceItem, setSelectedServiceItem] = useState<Service | null>(null);
  const currentUser = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  const employeeId = useMemo(() => employeeFilter ? (currentUser.full_name || currentUser.username) : null, [employeeFilter, currentUser]);
  const canEdit = currentUser?.role === 'director' || currentUser?.role === 'admin' || currentUser?.role === 'sales';

  const [addForm, setAddForm] = useState({
    phone: '',
    date: '',
    time: '',
    revenue: 0,
    master: ''
  });

  const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];

  const [salonHours, setSalonHours] = useState({ start_hour: 10, end_hour: 21 });

  // Генерируем слоты времени на основе salonHours
  const TIME_SLOTS = useMemo(() => generateTimeSlots(salonHours.start_hour, salonHours.end_hour), [salonHours]);

  useEffect(() => {
    loadData();
    const loadSalonHours = async () => {
      try {
        const hours = await api.get('/api/salon-settings/working-hours');
        setSalonHours({
          start_hour: hours.weekdays.start_hour,
          end_hour: hours.weekdays.end_hour
        });
      } catch (err) {
        console.error('Error loading salon hours:', err);
        // Fallback
        setSalonHours({ start_hour: 10, end_hour: 21 });
      }
    };
    loadSalonHours();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingsData, servicesData, clientsData, usersData] = await Promise.all([
        api.getBookings(),
        api.getServices(true),
        api.getClients(),
        api.getUsers()
      ]);

      setBookings(bookingsData.bookings || []);
      setServices(servicesData.services || []);
      setClients(clientsData.clients || []);
      setMasters(usersData.users?.filter((u: UserMaster) =>
        u.role === 'employee' || u.role === 'manager' || u.role === 'admin'
      ) || []);
    } catch (err) {
      toast.error(t('calendar:error_loading_data'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInView = () => {
    if (viewMode === 'day') {
      return [currentDate];
    }

    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diff);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      return date;
    });
  };

  // ОПТИМИЗАЦИЯ: Предварительное вычисление карты бронирований
  // Ключ: "YYYY-MM-DD-HH" (например "2023-10-25-14")
  const bookingsMap = useMemo(() => {
    const map: Record<string, Booking[]> = {};

    bookings.forEach(b => {
      // Исключаем отмененные
      if (b.status === 'cancelled') return;

      // Фильтры
      if (employeeId && b.master && b.master.toUpperCase() !== employeeId.toUpperCase()) return;
      if (selectedEmployee !== 'all' && selectedEmployee && b.master && b.master.toUpperCase() !== selectedEmployee.toUpperCase()) return;
      if (selectedService !== 'all' && selectedService && b.service !== selectedService) return;

      const d = new Date(b.datetime);
      // Ключ: YYYY-MM-DD-HH
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;

      if (!map[key]) map[key] = [];
      map[key].push(b);
    });

    return map;
  }, [bookings, employeeId, selectedEmployee, selectedService]);

  const getBookingsForSlot = (date: Date, hour: number) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${hour}`;
    return bookingsMap[key] || [];
  };

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(b => {
      const bookingDate = new Date(b.datetime);
      return bookingDate.toDateString() === day.toDateString() && b.status !== 'cancelled'; // ✅ Exclude cancelled bookings
    });
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    setCurrentDate(todayDate);

    const todayBookings = getBookingsForDay(todayDate);

    if (todayBookings.length === 0) {
      toast.success(t('calendar:no_bookings_today'), { duration: 3000 });
    } else if (todayBookings.length === 1) {
      toast.success(t('calendar:one_booking_today'), { duration: 3000 });
    } else {
      toast.success(t('calendar:bookings_today', { count: todayBookings.length }), { duration: 3000 });
    }
  };

  const formatDate = (date: Date) => {
    const days = [t('calendar:days.sun'), t('calendar:days.mon'), t('calendar:days.tue'), t('calendar:days.wed'), t('calendar:days.thu'), t('calendar:days.fri'), t('calendar:days.sat')];
    const months = [t('calendar:months.january'), t('calendar:months.february'), t('calendar:months.march'), t('calendar:months.april'), t('calendar:months.may'), t('calendar:months.june'), t('calendar:months.july'), t('calendar:months.august'), t('calendar:months.september'), t('calendar:months.october'), t('calendar:months.november'), t('calendar:months.december')];
    return {
      dayName: days[date.getDay()],
      day: date.getDate(),
      month: months[date.getMonth()],
      full: `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
    };
  };

  const getCurrentPeriod = () => {
    if (viewMode === 'day') {
      return formatDate(currentDate).full;
    }
    const days = getDaysInView();
    const start = formatDate(days[0]);
    const end = formatDate(days[days.length - 1]);
    return `${start.day} ${start.month} - ${end.day} ${end.month} ${days[0].getFullYear()}`;
  };

  const openCreateModal = (date?: Date, hour?: number) => {
    resetForm();
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      const timeStr = hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : TIME_SLOTS[0].display;
      setAddForm(prev => ({
        ...prev,
        date: dateStr,
        time: timeStr
      }));
    }
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (booking: Booking) => {
    const bookingDate = new Date(booking.datetime);
    const client = clients.find(c => c.instagram_id === booking.client_id) || null;
    const service = services.find(s => s.name_ru === booking.service) || null;

    setSelectedClient(client);
    setSelectedServiceItem(service);
    setAddForm({
      phone: booking.phone,
      date: bookingDate.toISOString().split('T')[0],
      time: bookingDate.toTimeString().slice(0, 5),
      revenue: booking.revenue,
      master: booking.master || masters[0]?.full_name || ''
    });
    setIsEditing(true);
    setSelectedBooking(booking);
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setClientSearch('');
    setServiceSearch('');
    setSelectedClient(null);
    setSelectedServiceItem(null);
    setAddForm({
      phone: '',
      date: currentDate.toISOString().split('T')[0],
      time: TIME_SLOTS[0].display,
      revenue: 0,
      master: masters[0]?.full_name || ''
    });
  };

  const handleSaveBooking = async () => {
    if (!selectedClient || !selectedServiceItem || !addForm.date || !addForm.time) {
      toast.error(t('calendar:fill_required_fields'));
      return;
    }

    try {
      setAddingBooking(true);
      if (isEditing && selectedBooking) {
        await api.updateBookingStatus(String(selectedBooking.id), 'cancelled');
        await api.createBooking({
          instagram_id: selectedClient.instagram_id,
          name: selectedClient.display_name,
          phone: addForm.phone || selectedClient.phone || '',
          service: selectedServiceItem.name_ru,
          date: addForm.date,
          time: addForm.time,
          revenue: addForm.revenue || selectedServiceItem.price,
          master: addForm.master,
        });
        toast.success(t('calendar:booking_updated'));
      } else {
        await api.createBooking({
          instagram_id: selectedClient.instagram_id,
          name: selectedClient.display_name,
          phone: addForm.phone || selectedClient.phone || '',
          service: selectedServiceItem.name_ru,
          date: addForm.date,
          time: addForm.time,
          revenue: addForm.revenue || selectedServiceItem.price,
          master: addForm.master,
        });
        toast.success(t('calendar:booking_created'));
      }

      setShowCreateModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      toast.error(t('calendar:error', { message: err.message }));
    } finally {
      setAddingBooking(false);
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    if (!confirm(t('calendar:delete_booking', { name: booking.name }))) return;

    try {
      await api.updateBookingStatus(String(booking.id), 'cancelled');
      toast.success(t('calendar:booking_deleted'));
      setSelectedBooking(null);
      await loadData();
    } catch (err) {
      toast.error(t('calendar:error_deleting_booking'));
      console.error(err);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!selectedBooking) return;
    try {
      await api.updateBookingStatus(String(selectedBooking.id), newStatus);
      const updated = bookings.map(b =>
        b.id === selectedBooking.id ? { ...b, status: newStatus } : b
      );
      setBookings(updated);
      setSelectedBooking({ ...selectedBooking, status: newStatus });
      setShowStatusDropdown(false);
      toast.success(t('calendar:status_changed'));
    } catch (err) {
      toast.error(t('calendar:error_changing_status'));
    }
  };

  const filteredClients = clients.filter((c: Client) =>
    (c.display_name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone || '').includes(clientSearch)
  );

  const filteredServices = services.filter((s: Service) =>
    (s.name_ru || '').toLowerCase().includes(serviceSearch.toLowerCase()) ||
    (s.name || '').toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const hours = Array.from({ length: 13 }, (_, i) => i + 9);
  const days = getDaysInView();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        <p className="mt-4 text-gray-600">{t('common:loading')}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="p-3 md:p-4">
          {/* Top Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 md:mb-4">
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
              <Button
                onClick={goToToday}
                variant="outline"
                className="rounded-xl border-2 hover:border-blue-400 hover:bg-blue-50 transition-all px-3 md:px-4 h-9 md:h-10 text-sm flex-1 sm:flex-none"
              >
                {t('calendar:today')}
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  onClick={navigatePrevious}
                  variant="outline"
                  size="sm"
                  className="h-9 md:h-10 w-9 md:w-10 p-0 rounded-xl border-2 hover:border-blue-400 hover:bg-blue-50"
                >
                  <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
                <Button
                  onClick={navigateNext}
                  variant="outline"
                  size="sm"
                  className="h-9 md:h-10 w-9 md:w-10 p-0 rounded-xl border-2 hover:border-blue-400 hover:bg-blue-50"
                >
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {!employeeFilter && (
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className={`rounded-xl border-2 h-9 md:h-10 px-2 md:px-3 text-sm whitespace-nowrap ${showFilters ? 'bg-blue-100 border-blue-400' : 'hover:border-blue-400'
                    }`}
                >
                  <Filter className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">{t('calendar:filters')}</span>
                </Button>
              )}

              <Select value={viewMode} onValueChange={(v: string) => setViewMode(v as 'day' | 'week')}>
                <SelectTrigger className="w-[100px] md:w-[130px] rounded-xl border-2 h-9 md:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">{t('calendar:day')}</SelectItem>
                  <SelectItem value="week">{t('calendar:week')}</SelectItem>
                </SelectContent>
              </Select>

              {canEdit && (
                <Button
                  onClick={() => openCreateModal()}
                  className="bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 text-white rounded-xl h-9 md:h-10 px-3 md:px-4 text-sm shadow-lg hover:shadow-xl transition-all whitespace-nowrap ml-auto sm:ml-0"
                >
                  <Plus className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">{t('calendar:add')}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Period Display */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-100 to-pink-100 px-4 py-2 rounded-xl w-full sm:w-auto justify-center">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">
                {getCurrentPeriod()}
              </span>
            </div>
          </div>

          {/* Filters Section */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-pink-50 rounded-xl border-2 border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {t('calendar:master')}
                  </label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="rounded-xl border-2 bg-white h-9 text-sm">
                      <SelectValue placeholder={t('calendar:all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('calendar:all_masters')}</SelectItem>
                      {masters.map(emp => (
                        <SelectItem key={emp.id} value={emp.full_name}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5" />
                    {t('calendar:service')}
                  </label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="rounded-xl border-2 bg-white h-9 text-sm">
                      <SelectValue placeholder={t('calendar:all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('calendar:all_services')}</SelectItem>
                      {services.map(service => (
                        <SelectItem key={service.id} value={service.name_ru}>
                          {service.name_ru}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      setSelectedEmployee('all');
                      setSelectedService('all');
                    }}
                    variant="outline"
                    className="w-full rounded-xl border-2 h-9 text-sm hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                  >
                    {t('calendar:reset')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px] h-full">
          {/* Days Header */}
          <div className="sticky top-0 z-10 bg-white border-b-2 border-gray-200 shadow-sm">
            <div className="grid grid-cols-8">
              <div className="p-2 md:p-3 border-r border-gray-200 bg-gray-50">
                <div className="flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              {days.map((day, index) => {
                const formatted = formatDate(day);
                const isToday = day.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={index}
                    className={`p-2 md:p-3 text-center border-r border-gray-200 ${isToday ? 'bg-gradient-to-br from-pink-100 to-blue-100' : 'bg-gray-50'
                      }`}
                  >
                    <div className={`text-xs font-medium ${isToday ? 'text-blue-700' : 'text-gray-600'}`}>
                      {formatted.dayName}
                    </div>
                    <div
                      className={`text-sm md:text-base font-bold mt-0.5 ${isToday
                        ? 'bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent'
                        : 'text-gray-900'
                        }`}
                    >
                      {formatted.day}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Slots */}
          <div className="bg-white">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
                {/* Time Label */}
                <div className="p-2 md:p-3 border-r border-gray-200 bg-gray-50/50 flex items-start justify-center">
                  <span className="text-xs md:text-sm text-gray-600 font-medium">
                    {hour}:00
                  </span>
                </div>

                {/* Day Cells */}
                {days.map((day, dayIndex) => {
                  const slotBookings = getBookingsForSlot(day, hour);

                  return (
                    <div
                      key={dayIndex}
                      className="min-h-[80px] md:min-h-[100px] p-1 md:p-2 border-r border-gray-200 hover:bg-blue-50/30 transition-colors relative group"
                    >
                      {/* Show All Bookings Button if multiple */}
                      {slotBookings.length > 2 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="absolute top-1 right-1 bg-blue-600 text-white rounded-lg px-2 py-1 text-xs font-bold hover:bg-blue-700 shadow-lg z-10">
                              +{slotBookings.length - 2}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64">
                            {slotBookings.map((booking, idx) => (
                              <DropdownMenuItem
                                key={idx}
                                className="flex flex-col items-start p-3 cursor-pointer"
                                onClick={() => setSelectedBooking(booking)}
                              >
                                <p className="font-semibold text-sm">{booking.name}</p>
                                <p className="text-xs text-gray-600">{booking.service}</p>
                                {booking.master && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {booking.master}
                                  </p>
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* Display first 2 bookings */}
                      <div className="space-y-1">
                        {slotBookings.slice(0, 2).map((booking, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedBooking(booking)}
                            className="bg-gradient-to-r from-pink-500 to-blue-600 rounded-lg p-1.5 md:p-2 text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
                          >
                            <p className="font-semibold text-xs md:text-sm truncate">
                              {booking.name}
                            </p>
                            <p className="text-xs opacity-90 truncate">
                              {booking.service}
                            </p>
                            {viewMode === 'day' && booking.master && (
                              <p className="text-xs opacity-75 mt-0.5">
                                {booking.master}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Button - Only for users with edit permissions */}
                      {canEdit && (
                        <button
                          onClick={() => openCreateModal(day, hour)}
                          className="absolute bottom-1 right-1 w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {(selectedEmployee !== 'all' || selectedService !== 'all') && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-2 md:p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-600">{t('calendar:active_filters')}:</span>
            {selectedEmployee !== 'all' && (
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-300"
              >
                <User className="w-3 h-3 mr-1" />
                {selectedEmployee}
                <button
                  onClick={() => setSelectedEmployee('all')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {selectedService !== 'all' && (
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-blue-100 to-pink-100 text-blue-700 border-blue-300"
              >
                <Scissors className="w-3 h-3 mr-1" />
                {selectedService}
                <button
                  onClick={() => setSelectedService('all')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '1rem',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">
                {isEditing ? t('calendar:edit_booking') : t('calendar:add_booking')}
              </h3>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Client Search */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('calendar:client')} *
                </label>
                <div className="relative z-30">
                  <input
                    type="text"
                    placeholder={t('calendar:search_client')}
                    value={selectedClient ? selectedClient.display_name : clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setSelectedClient(null);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => {
                      setShowClientDropdown(true);
                      setShowServiceDropdown(false);
                    }}
                    className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white transition-all"
                  />
                  {selectedClient && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <Check size={16} className="text-green-500" />
                      <button
                        onClick={() => {
                          setSelectedClient(null);
                          setClientSearch('');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {showClientDropdown && !selectedClient && clientSearch && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto z-20">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => {
                              setSelectedClient(client);
                              setClientSearch('');
                              setShowClientDropdown(false);
                              setAddForm({ ...addForm, phone: client.phone || '' });
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 flex items-center gap-3 transition-colors"
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                              {(client.display_name || 'N').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {client.display_name}
                              </div>
                              {client.phone && (
                                <div className="text-xs text-gray-500 truncate">
                                  {client.phone}
                                </div>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                          {t('calendar:clients_not_found')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Service Search */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('calendar:service')} *
                </label>
                <div className="relative z-20">
                  <input
                    type="text"
                    placeholder={t('calendar:search_service')}
                    value={selectedServiceItem ? selectedServiceItem.name_ru : serviceSearch}
                    onChange={(e) => {
                      setServiceSearch(e.target.value);
                      setSelectedServiceItem(null);
                      setShowServiceDropdown(true);
                    }}
                    onFocus={() => {
                      setShowServiceDropdown(true);
                      setShowClientDropdown(false);
                    }}
                    className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white transition-all"
                  />
                  {selectedServiceItem && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <Check size={16} className="text-green-500" />
                      <button
                        onClick={() => {
                          setSelectedServiceItem(null);
                          setServiceSearch('');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {showServiceDropdown && !selectedServiceItem && serviceSearch && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto z-10">
                      {filteredServices.length > 0 ? (
                        filteredServices.map((service) => (
                          <button
                            key={service.id}
                            onClick={() => {
                              setSelectedServiceItem(service);
                              setServiceSearch('');
                              setShowServiceDropdown(false);
                              setAddForm({ ...addForm, revenue: service.price });
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {service.name_ru}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {service.category}
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-blue-600">
                                {formatCurrency(service.price)}
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                          {t('calendar:services_not_found')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Master Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('calendar:master')}
                </label>
                <select
                  value={addForm.master}
                  onChange={(e) => setAddForm({ ...addForm, master: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="">{t('calendar:select_master')}</option>
                  {masters.map((m) => (
                    <option key={m.id} value={m.full_name}>
                      {m.full_name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('calendar:phone')} {!selectedClient?.phone && '*'}
                </label>
                <input
                  type="tel"
                  placeholder={t('calendar:phone_placeholder')}
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white transition-all"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('calendar:date')} *
                  </label>
                  <input
                    type="date"
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('calendar:time')} *
                  </label>
                  <select
                    value={addForm.time}
                    onChange={(e) => setAddForm({ ...addForm, time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  >
                    {TIME_SLOTS.map((slot, idx) => (
                      <option key={idx} value={slot.display}>
                        {slot.display}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Revenue */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('calendar:revenue')} ({currency})
                </label>
                <input
                  type="number"
                  placeholder={t('calendar:revenue_placeholder')}
                  value={addForm.revenue}
                  onChange={(e) => setAddForm({ ...addForm, revenue: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 bg-white transition-all"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  disabled={addingBooking}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  {t('calendar:cancel')}
                </button>
                <button
                  onClick={handleSaveBooking}
                  disabled={addingBooking}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-pink-500 hover:shadow-lg text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingBooking ? t('calendar:creating') : isEditing ? t('calendar:save') : t('calendar:create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedBooking && !showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '1rem',
            width: '100%',
            maxWidth: '450px',
            boxShadow: '0 20px 25px rgba(0,0,0,0.1)',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900">
                {t('calendar:booking')} #{selectedBooking.id}
              </h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  {t('calendar:client')}
                </label>
                <input
                  type="text"
                  value={selectedBooking.name}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  {t('calendar:service')}
                </label>
                <input
                  type="text"
                  value={selectedBooking.service}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>

              {selectedBooking.master && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    {t('calendar:master')}
                  </label>
                  <input
                    type="text"
                    value={selectedBooking.master}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  {t('calendar:phone')}
                </label>
                <input
                  type="tel"
                  value={selectedBooking.phone}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  {t('calendar:date_and_time')}
                </label>
                <input
                  type="text"
                  value={new Date(selectedBooking.datetime).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="w-full px-4 py-3 rounded-lg font-semibold text-sm flex items-center justify-between shadow-sm transition-all"
                  style={{
                    backgroundColor: statusColors[selectedBooking.status]?.bg,
                    color: statusColors[selectedBooking.status]?.text,
                    border: `2px solid ${statusColors[selectedBooking.status]?.border}`,
                  }}
                >
                  <span>{statusLabels[selectedBooking.status]}</span>
                  <span>▼</span>
                </button>

                {showStatusDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl overflow-hidden z-10">
                    {statuses.map(status => (
                      <button
                        key={status}
                        onClick={() => handleChangeStatus(status)}
                        className="w-full px-4 py-3 text-left text-sm font-medium border-b border-gray-100 last:border-b-0 transition-colors"
                        style={{
                          backgroundColor: selectedBooking.status === status ? statusColors[status]?.bg : '#fff',
                          color: statusColors[status]?.text,
                        }}
                      >
                        {statusLabels[status]}
                        {selectedBooking.status === status && ' ✓'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleDeleteBooking(selectedBooking)}
                  className="flex-1 px-4 py-3 bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-lg text-red-700 font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 size={16} />
                  {t('calendar:delete')}
                </button>

                <button
                  onClick={() => {
                    setSelectedBooking(null);
                    openEditModal(selectedBooking);
                  }}
                  className="flex-1 px-4 py-3 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-lg text-blue-700 font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Edit size={16} />
                  {t('calendar:edit')}
                </button>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-pink-500 hover:shadow-lg text-white font-medium rounded-lg transition-all"
              >
                {t('calendar:close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}