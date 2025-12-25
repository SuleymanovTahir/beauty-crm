import React, { useState } from 'react';
import { toast } from 'sonner';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Star, 
  TrendingUp, 
  Award, 
  Gift, 
  Camera, 
  CreditCard, 
  Bell, 
  Settings, 
  MessageCircle, 
  User, 
  Heart, 
  Sparkles,
  ChevronRight,
  Download,
  Share2,
  Plus,
  X,
  Check,
  Filter,
  Search,
  Edit,
  Repeat,
  Navigation,
  Image as ImageIcon,
  DollarSign,
  BarChart3,
  Users,
  BookOpen,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Upload,
  Trophy,
  Target,
  Flame,
  Zap,
  QrCode,
  Wallet,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Mock Data
const mockUser = {
  id: '1',
  firstName: 'Анна',
  lastName: 'Иванова',
  email: 'anna.ivanova@example.com',
  phone: '+971 50 123 4567',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  memberSince: '2023-06-15',
  birthday: '1990-03-20',
  level: 'Gold',
  points: 2840,
  nextLevelPoints: 5000,
  discount: 15,
  totalVisits: 12,
  totalSpent: 4250,
  savedAmount: 640,
  referralCode: 'ANNA2024'
};

const mockNextAppointment = {
  id: '1',
  service: 'Окра��ивание волос + Стрижка',
  date: '2025-01-05',
  time: '14:00',
  duration: 180,
  master: {
    name: 'Мария Петрова',
    photo: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop',
    specialty: 'Колорист, Стилист'
  },
  price: 450,
  salon: {
    name: 'Beauty Studio Dubai',
    address: 'Dubai Marina, Marina Plaza, Office 302',
    parking: 'Бесплатная парковка 2 часа'
  },
  status: 'confirmed'
};

const mockLastVisit = {
  id: '2',
  service: 'Маникюр + педикюр',
  date: '2024-12-15',
  master: {
    name: 'Ольга Смирнова',
    photo: 'https://images.unsplash.com/photo-1607346256330-dee7af15f7c5?w=400&h=400&fit=crop'
  },
  price: 180,
  reviewed: false,
  beforePhoto: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
  afterPhoto: 'https://images.unsplash.com/photo-1604654894609-b1e8d7d1ac38?w=400&h=400&fit=crop'
};

const mockUpcomingAppointments = [
  mockNextAppointment,
  {
    id: '3',
    service: 'Маникюр',
    date: '2025-01-12',
    time: '16:00',
    duration: 90,
    master: {
      name: 'Ольга Смирнова',
      photo: 'https://images.unsplash.com/photo-1607346256330-dee7af15f7c5?w=400&h=400&fit=crop',
      specialty: 'Мастер маникюра'
    },
    price: 120,
    salon: mockNextAppointment.salon,
    status: 'confirmed'
  }
];

const mockHistory = [
  mockLastVisit,
  {
    id: '4',
    service: 'Стрижка',
    date: '2024-11-20',
    master: {
      name: 'Мария Петрова',
      photo: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop'
    },
    price: 150,
    reviewed: true,
    rating: 5
  },
  {
    id: '5',
    service: 'Уход за лицом',
    date: '2024-11-05',
    master: {
      name: 'Елена Кузнецова',
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop'
    },
    price: 200,
    reviewed: true,
    rating: 5
  }
];

const mockGallery = [
  {
    id: '1',
    before: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=400&fit=crop',
    after: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop',
    service: 'Окрашивание',
    master: 'Мария Петрова',
    date: '2024-12-01',
    category: 'hair'
  },
  {
    id: '2',
    before: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
    after: 'https://images.unsplash.com/photo-1604654894609-b1e8d7d1ac38?w=400&h=400&fit=crop',
    service: 'Маникюр',
    master: 'Ольга Смирнова',
    date: '2024-12-15',
    category: 'nails'
  }
];

const mockMasters = [
  {
    id: '1',
    name: 'Мария Петрова',
    photo: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop',
    specialty: 'Колорист, Стилист',
    rating: 4.9,
    reviewsCount: 156,
    experience: '8 лет',
    visitsWithYou: 8,
    favorite: true
  },
  {
    id: '2',
    name: 'Ольга Смирнова',
    photo: 'https://images.unsplash.com/photo-1607346256330-dee7af15f7c5?w=400&h=400&fit=crop',
    specialty: 'Мастер маникюра',
    rating: 4.8,
    reviewsCount: 203,
    experience: '5 лет',
    visitsWithYou: 4,
    favorite: true
  },
  {
    id: '3',
    name: 'Елена Кузнецова',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
    specialty: 'Косметолог',
    rating: 5.0,
    reviewsCount: 98,
    experience: '10 лет',
    visitsWithYou: 0,
    favorite: false
  }
];

const mockAchievements = [
  { id: '1', title: '5 визитов', description: 'Посетили салон 5 раз', icon: '🎯', unlocked: true, date: '2024-08-15', points: 50 },
  { id: '2', title: '10 визитов', description: 'Посетили салон 10 раз', icon: '🏆', unlocked: true, date: '2024-11-20', points: 100 },
  { id: '3', title: 'Разнообразие', description: 'Попробовали 5 разных услуг', icon: '🌟', unlocked: true, date: '2024-10-10', points: 75 },
  { id: '4', title: '25 визитов', description: 'Посетили салон 25 раз', icon: '💎', unlocked: false, progress: 12, total: 25 },
  { id: '5', title: 'Социальный', description: 'Пригласите 3 друзей', icon: '👥', unlocked: false, progress: 1, total: 3 }
];

const spendingData = [
  { month: 'Июл', amount: 280 },
  { month: 'Авг', amount: 350 },
  { month: 'Сен', amount: 420 },
  { month: 'Окт', amount: 380 },
  { month: 'Ноя', amount: 520 },
  { month: 'Дек', amount: 850 }
];

const serviceDistribution = [
  { name: 'Маникюр', value: 45, color: '#FF6B9D' },
  { name: 'Волосы', value: 30, color: '#C084FC' },
  { name: 'Уход за лицом', value: 15, color: '#60A5FA' },
  { name: 'Педикюр', value: 10, color: '#34D399' }
];

const loyaltyLevels = [
  { name: 'Bronze', minPoints: 0, discount: 5, color: '#CD7F32', benefits: ['5% скидка', 'Баллы за визиты'] },
  { name: 'Silver', minPoints: 1000, discount: 10, color: '#C0C0C0', benefits: ['10% скидка', 'Ранняя запись', 'Приоритетная поддержка'] },
  { name: 'Gold', minPoints: 2500, discount: 15, color: '#FFD700', benefits: ['15% скидка', 'Приоритет', 'Подарок на ДР', 'VIP зона'] },
  { name: 'Platinum', minPoints: 5000, discount: 20, color: '#E5E4E2', benefits: ['20% скидка', 'Персональный менеджер', 'VIP зона', 'Закрытые мероприятия'] }
];

const beautyMetrics = [
  { name: 'Волосы', value: 85, lastDate: '2024-12-01', daysAgo: 24, status: 'good' },
  { name: 'Окрашивание', value: 70, lastDate: '2024-12-01', daysAgo: 24, status: 'good' },
  { name: 'Ногти', value: 95, lastDate: '2024-12-15', daysAgo: 10, status: 'perfect' },
  { name: 'Кожа', value: 60, lastDate: '2024-11-05', daysAgo: 50, status: 'attention' },
  { name: 'Брови', value: 40, lastDate: '2024-10-20', daysAgo: 66, status: 'attention' },
  { name: 'Эпиляция', value: 50, lastDate: '2024-11-20', daysAgo: 35, status: 'attention' }
];

const mockNotifications = [
  { id: '1', type: 'reminder', title: 'Напоминание о записи', message: 'Завтра в 14:00 - Окрашивание у Марии', time: '2 часа назад', read: false },
  { id: '2', type: 'points', title: 'Начислены баллы', message: 'Вам начислено 180 баллов за последний визит', time: '1 день назад', read: false },
  { id: '3', type: 'promo', title: 'Персональное предложение', message: '20% на уход за лицом только для вас!', time: '2 дня назад', read: true },
  { id: '4', type: 'achievement', title: 'Новое достижение', message: 'Вы разблокировали "10 визитов"!', time: '5 дней назад', read: true }
];

// Utility Components
const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
      active 
        ? 'bg-gray-900 text-white' 
        : 'bg-white text-gray-600 hover:bg-gray-50'
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; trend?: string; color?: string }> = ({ icon, label, value, trend, color = 'text-gray-900' }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-200">
    <div className="flex items-start justify-between mb-2">
      <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>
        {icon}
      </div>
      {trend && (
        <span className="text-sm text-green-600 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </span>
      )}
    </div>
    <p className="text-gray-500 text-sm mb-1">{label}</p>
    <p className="text-2xl">{value}</p>
  </div>
);

const ProgressBar: React.FC<{ value: number; max: number; color?: string }> = ({ value, max, color = 'bg-gray-900' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-300`} style={{ width: `${percentage}%` }} />
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string; action?: { label: string; onClick: () => void } }> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
      {icon}
    </div>
    <h3 className="text-lg mb-2 text-gray-900">{title}</h3>
    <p className="text-gray-500 mb-6 max-w-sm">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointmentsView, setAppointmentsView] = useState('upcoming');
  const [galleryFilter, setGalleryFilter] = useState('all');
  const [showAllMasters, setShowAllMasters] = useState(false);
  const [comparePhotos, setComparePhotos] = useState<{ before: string; after: string } | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(2);
  const [favoriteMasters, setFavoriteMasters] = useState<string[]>(['1', '2']);
  const [profileData, setProfileData] = useState({
    firstName: mockUser.firstName,
    lastName: mockUser.lastName,
    email: mockUser.email,
    phone: mockUser.phone
  });
  const [notificationSettings, setNotificationSettings] = useState({
    push: true,
    email: true,
    sms: true
  });
  const [privacySettings, setPrivacySettings] = useState({
    allowPhotos: false
  });
  const [notifications, setNotifications] = useState(mockNotifications);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  const getMotivationalPhrase = () => {
    const phrases = [
      'Вы выглядите великолепно!',
      'Скучали по вам!',
      'Время позаботиться о себе',
      'Ваша красота - наша работа'
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  const handleBooking = () => {
    // This would navigate to UserBookingWizard
    toast.success('Переход на страницу записи...');
    // In real app: navigate('/booking');
  };

  const handleCancelAppointment = (id: string) => {
    toast.success('Запись успешно отменена');
  };

  const handleRescheduleAppointment = (id: string) => {
    toast.info('Открываем форму переноса записи...');
    handleBooking();
  };

  const handleRepeatAppointment = (id: string) => {
    toast.success('Повторяем последнюю запись...');
    handleBooking();
  };

  const handleLeaveReview = (id: string) => {
    toast.info('Открываем форму отзыва...');
  };

  const handleAddToCalendar = () => {
    toast.success('Добавлено в календарь');
  };

  const handleNavigate = () => {
    toast.success('Открываем навигацию...');
  };

  const handleDownloadPhoto = (photoId: string) => {
    toast.success('Фото скачивается...');
  };

  const handleSharePhoto = (photoId: string) => {
    toast.success('Ссылка для шаринга скопирована');
  };

  const handleFavoritePhoto = (photoId: string) => {
    if (selectedPhotoId === photoId) {
      setSelectedPhotoId(null);
      toast.info('Удалено из избранного');
    } else {
      setSelectedPhotoId(photoId);
      toast.success('Добавлено в избранное');
    }
  };

  const handleToggleFavoriteMaster = (masterId: string) => {
    if (favoriteMasters.includes(masterId)) {
      setFavoriteMasters(favoriteMasters.filter(id => id !== masterId));
      toast.info('Мастер удален из избранного');
    } else {
      setFavoriteMasters([...favoriteMasters, masterId]);
      toast.success('Мастер добавлен в избранное');
    }
  };

  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText(mockUser.referralCode);
    toast.success('Код скопирован в буфер обмена');
  };

  const handleShareReferral = (platform: string) => {
    const text = `Присоединяйся к Beauty Studio! Используй мой код ${mockUser.referralCode} и получи скидку 10%`;
    toast.success(`Открываем ${platform} для шаринга...`);
  };

  const handleSaveProfile = () => {
    toast.success('Профиль успешно сохранен');
  };

  const handleChangePassword = () => {
    toast.info('Открываем форму смены пароля...');
  };

  const handleEnable2FA = () => {
    toast.info('Настройка двухфакторной аутентификации...');
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    setUnreadNotifications(prev => Math.max(0, prev - 1));
    toast.success('Уведомление прочитано');
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setUnreadNotifications(0);
    toast.success('Все уведомления прочитаны');
  };

  const handleContactSalon = (method: string) => {
    if (method === 'phone') {
      window.location.href = 'tel:+97150123456';
    } else if (method === 'email') {
      window.location.href = 'mailto:info@beautystudio.ae';
    } else {
      toast.info(`Открываем ${method}...`);
    }
  };

  const handleUploadAvatar = () => {
    toast.info('Открываем выбор фото...');
  };

  const handleExportData = () => {
    toast.success('Экспорт данных начат...');
  };

  const getDaysUntil = (date: string) => {
    const diff = new Date(date).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Завтра';
    return `Через ${days} дней`;
  };

  const currentLevel = loyaltyLevels.find(l => l.name === mockUser.level);
  const nextLevel = loyaltyLevels.find(l => l.minPoints > mockUser.points);

  const averageBeautyScore = Math.round(beautyMetrics.reduce((acc, m) => acc + m.value, 0) / beautyMetrics.length);

  // Dashboard Content
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-700 text-white p-6 rounded-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl mb-1">{getGreeting()}, {mockUser.firstName}! 👋</h1>
            <p className="text-gray-300">{getMotivationalPhrase()}</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white overflow-hidden border-4 border-white/20">
            <img src={mockUser.avatar} alt={mockUser.firstName} className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <p className="text-3xl mb-1">{mockUser.totalVisits}</p>
            <p className="text-gray-300 text-sm">Визитов</p>
          </div>
          <div className="text-center">
            <p className="text-3xl mb-1">{mockUser.points}</p>
            <p className="text-gray-300 text-sm">Баллов</p>
          </div>
          <div className="text-center">
            <p className="text-3xl mb-1">{mockUser.discount}%</p>
            <p className="text-gray-300 text-sm">Скидка</p>
          </div>
        </div>
      </div>

      {/* Next Appointment */}
      {mockNextAppointment && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl">Следующая запись</h2>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
              {getDaysUntil(mockNextAppointment.date)}
            </span>
          </div>
          
          <div className="flex gap-4 mb-4">
            <img 
              src={mockNextAppointment.master.photo} 
              alt={mockNextAppointment.master.name}
              className="w-20 h-20 rounded-xl object-cover"
            />
            <div className="flex-1">
              <h3 className="mb-1">{mockNextAppointment.master.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{mockNextAppointment.master.specialty}</p>
              <p className="text-gray-900">{mockNextAppointment.service}</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="w-5 h-5" />
              <span>{new Date(mockNextAppointment.date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Clock className="w-5 h-5" />
              <span>{mockNextAppointment.time} ({mockNextAppointment.duration} мин)</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="w-5 h-5" />
              <div className="flex-1">
                <p>{mockNextAppointment.salon.address}</p>
                <p className="text-sm text-gray-400">{mockNextAppointment.salon.parking}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={handleAddToCalendar}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              В календарь
            </button>
            <button 
              onClick={() => handleRescheduleAppointment(mockNextAppointment.id)}
              className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Перенести
            </button>
            <button 
              onClick={() => handleCancelAppointment(mockNextAppointment.id)}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              Отменить
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={handleBooking}
          className="p-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-3"
        >
          <Plus className="w-5 h-5" />
          <span>Новая запись</span>
        </button>
        <button 
          onClick={handleBooking}
          className="p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-3"
        >
          <Repeat className="w-5 h-5" />
          <span>Повторить последнюю</span>
        </button>
        <button 
          onClick={() => setActiveTab('masters')}
          className="p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-3"
        >
          <Heart className="w-5 h-5" />
          <span>Мои мастера</span>
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className="p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-3"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Связаться</span>
        </button>
      </div>

      {/* Last Visit */}
      {mockLastVisit && !mockLastVisit.reviewed && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200">
          <h2 className="text-xl mb-4">Ваш последний визит</h2>
          
          <div className="flex gap-4 mb-4">
            <img 
              src={mockLastVisit.master.photo} 
              alt={mockLastVisit.master.name}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div className="flex-1">
              <h3 className="mb-1">{mockLastVisit.service}</h3>
              <p className="text-sm text-gray-500">{mockLastVisit.master.name}</p>
              <p className="text-sm text-gray-400">{new Date(mockLastVisit.date).toLocaleDateString('ru-RU')}</p>
            </div>
          </div>

          {mockLastVisit.beforePhoto && mockLastVisit.afterPhoto && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">До</p>
                <img src={mockLastVisit.beforePhoto} alt="До" className="w-full h-32 object-cover rounded-lg" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">После</p>
                <img src={mockLastVisit.afterPhoto} alt="После" className="w-full h-32 object-cover rounded-lg" />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button 
              onClick={() => handleLeaveReview(mockLastVisit.id)}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Оставить отзыв
            </button>
            <button 
              onClick={() => handleRepeatAppointment(mockLastVisit.id)}
              className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Повторить
            </button>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-100">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl">Персональные инсайты</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm">🎉</div>
            <p className="text-gray-700 flex-1">Вы с нами уже {Math.floor((new Date().getTime() - new Date(mockUser.memberSince).getTime()) / (1000 * 60 * 60 * 24 * 30))} месяцев!</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm">💰</div>
            <p className="text-gray-700 flex-1">Вы сэкономили {mockUser.savedAmount} AED благодаря программе лояльности</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm">⭐</div>
            <p className="text-gray-700 flex-1">Вы посетили нас {mockUser.totalVisits} раз - это больше, чем у 80% клиентов!</p>
          </div>
        </div>
      </div>

      {/* Special Offers */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5" />
          <h2 className="text-xl">Специальные предложения</h2>
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-gray-900">Только для вас: 20% на уход за лицом</h3>
              <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs whitespace-nowrap">Осталось 2 дня</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">Персональное предложение на основе вашей истории</p>
            <button 
              onClick={handleBooking}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Записаться
            </button>
          </div>
        </div>
      </div>

      {/* Smart Recommendations */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl">Умные рекомендации</h2>
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <p className="text-gray-900 mb-2">Вы обычно делаете маникюр каждые 3 недели - пора записаться?</p>
            <button 
              onClick={handleBooking}
              className="text-sm text-gray-900 hover:underline flex items-center gap-1"
            >
              Записаться на маникюр
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-gray-900 mb-2">Прошло 5 недель с последнего окрашивания</p>
            <button 
              onClick={handleBooking}
              className="text-sm text-gray-900 hover:underline flex items-center gap-1"
            >
              Записаться на окрашивание
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Appointments Content
  const renderAppointments = () => (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setAppointmentsView('upcoming')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            appointmentsView === 'upcoming' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Предстоящие
        </button>
        <button
          onClick={() => setAppointmentsView('history')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            appointmentsView === 'history' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          История
        </button>
        <button
          onClick={() => setAppointmentsView('recurring')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            appointmentsView === 'recurring' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Повторяющиеся
        </button>
      </div>

      {appointmentsView === 'upcoming' && (
        <div className="space-y-4">
          {mockUpcomingAppointments.map(apt => (
            <div key={apt.id} className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex gap-3 mb-3">
                <img src={apt.master.photo} alt={apt.master.name} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <h3 className="mb-1">{apt.service}</h3>
                  <p className="text-sm text-gray-500">{apt.master.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-gray-600">{new Date(apt.date).toLocaleDateString('ru-RU')}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-600">{apt.time}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg">{apt.price} AED</p>
                  <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    Подтверждено
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleAddToCalendar}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  В календарь
                </button>
                <button 
                  onClick={() => handleRescheduleAppointment(apt.id)}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Перенести
                </button>
                <button 
                  onClick={() => handleCancelAppointment(apt.id)}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                >
                  Отменить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {appointmentsView === 'history' && (
        <div className="space-y-4">
          {mockHistory.map(visit => (
            <div key={visit.id} className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex gap-3 mb-3">
                <img src={visit.master.photo} alt={visit.master.name} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <h3 className="mb-1">{visit.service}</h3>
                  <p className="text-sm text-gray-500">{visit.master.name}</p>
                  <p className="text-sm text-gray-400">{new Date(visit.date).toLocaleDateString('ru-RU')}</p>
                  {visit.reviewed && visit.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < visit.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg">{visit.price} AED</p>
                </div>
              </div>
              <div className="flex gap-2">
                {!visit.reviewed && (
                  <button 
                    onClick={() => handleLeaveReview(visit.id)}
                    className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                  >
                    Оставить отзыв
                  </button>
                )}
                <button 
                  onClick={() => handleRepeatAppointment(visit.id)}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Повторить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {appointmentsView === 'recurring' && (
        <EmptyState
          icon={<Repeat className="w-8 h-8" />}
          title="Нет повторяющихся записей"
          description="Создайте автоматическую запись, чтобы не забывать о регулярных процедурах"
          action={{
            label: 'Создать автозапись',
            onClick: () => toast.info('Функция в разработке')
          }}
        />
      )}

      {/* Statistics */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg mb-4">Статистика посещений</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Всего визитов</p>
            <p className="text-2xl">{mockUser.totalVisits}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Средняя частота</p>
            <p className="text-2xl">2 недели</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Любимая услуга</p>
            <p className="text-lg">Маникюр</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Любимый мастер</p>
            <p className="text-lg">Мария</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Gallery Content
  const renderGallery = () => {
    const filteredGallery = mockGallery.filter(photo => 
      galleryFilter === 'all' || photo.category === galleryFilter
    );

    return (
      <div className="space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['all', 'hair', 'nails', 'face', 'body'].map(filter => (
            <button
              key={filter}
              onClick={() => setGalleryFilter(filter)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                galleryFilter === filter ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {filter === 'all' && 'Все'}
              {filter === 'hair' && 'Волосы'}
              {filter === 'nails' && 'Ногти'}
              {filter === 'face' && 'Лицо'}
              {filter === 'body' && 'Тело'}
            </button>
          ))}
        </div>

        {filteredGallery.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="w-8 h-8" />}
            title="Нет фотографий"
            description="В этой категории пока нет фотографий трансформаций"
            action={{
              label: 'Смотреть все фото',
              onClick: () => setGalleryFilter('all')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGallery.map(photo => (
          <div key={photo.id} className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <p className="text-sm text-gray-500 mb-2">До</p>
                <img src={photo.before} alt="До" className="w-full h-48 object-cover rounded-lg" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">После</p>
                <img src={photo.after} alt="После" className="w-full h-48 object-cover rounded-lg" />
              </div>
            </div>
            <div className="mb-3">
              <h3 className="mb-1">{photo.service}</h3>
              <p className="text-sm text-gray-500">{photo.master}</p>
              <p className="text-sm text-gray-400">{new Date(photo.date).toLocaleDateString('ru-RU')}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setComparePhotos({ before: photo.before, after: photo.after })}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Сравнить
              </button>
              <button 
                onClick={() => handleDownloadPhoto(photo.id)}
                className="px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleSharePhoto(photo.id)}
                className="px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleFavoritePhoto(photo.id)}
                className="px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Heart className={`w-4 h-4 ${selectedPhotoId === photo.id ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
            </div>
          </div>
        ))}
          </div>
        )}

      {comparePhotos && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setComparePhotos(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl">Сравнение</h3>
              <button onClick={() => setComparePhotos(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">До</p>
                <img src={comparePhotos.before} alt="До" className="w-full rounded-lg" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">После</p>
                <img src={comparePhotos.after} alt="После" className="w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  };

  // Loyalty Content
  const renderLoyalty = () => (
    <div className="space-y-6">
      {/* Points Card */}
      <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white p-6 rounded-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-yellow-100 mb-1">Ваш уровень</p>
            <h2 className="text-3xl mb-2">{mockUser.level}</h2>
            <p className="text-yellow-100">Скидка {mockUser.discount}%</p>
          </div>
          <div className="text-right">
            <p className="text-yellow-100 mb-1">Баллы</p>
            <p className="text-4xl">{mockUser.points}</p>
          </div>
        </div>
        {nextLevel && (
          <div>
            <div className="flex justify-between text-sm text-yellow-100 mb-2">
              <span>До уровня {nextLevel.name}</span>
              <span>{nextLevel.minPoints - mockUser.points} баллов</span>
            </div>
            <ProgressBar value={mockUser.points} max={nextLevel.minPoints} color="bg-white" />
          </div>
        )}
      </div>

      {/* Loyalty Levels */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg mb-4">Уровни программы</h3>
        <div className="space-y-3">
          {loyaltyLevels.map(level => (
            <div 
              key={level.name}
              className={`p-4 rounded-xl border-2 ${
                level.name === mockUser.level 
                  ? 'border-yellow-400 bg-yellow-50' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg" style={{ color: level.color }}>{level.name}</h4>
                <span className="text-sm text-gray-500">{level.discount}% скидка</span>
              </div>
              <p className="text-sm text-gray-500 mb-2">От {level.minPoints} баллов</p>
              <ul className="space-y-1">
                {level.benefits.map((benefit, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Spending Analytics */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg mb-4">Аналитика расходов</h3>
        <div className="h-64 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spendingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#1f2937" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl mb-1">{mockUser.totalSpent} AED</p>
            <p className="text-sm text-gray-500">Всего потрачено</p>
          </div>
          <div className="text-center">
            <p className="text-2xl mb-1">{mockUser.savedAmount} AED</p>
            <p className="text-sm text-gray-500">Сэкономлено</p>
          </div>
          <div className="text-center">
            <p className="text-2xl mb-1">350 AED</p>
            <p className="text-sm text-gray-500">Средний чек</p>
          </div>
          <div className="text-center">
            <p className="text-2xl mb-1">Декабрь</p>
            <p className="text-sm text-gray-500">Самый активны��</p>
          </div>
        </div>

        <h4 className="mb-3">Распределение по услугам</h4>
        <div className="flex items-center gap-6">
          <div className="w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                >
                  {serviceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {serviceDistribution.map(service => (
              <div key={service.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }} />
                  <span className="text-sm">{service.name}</span>
                </div>
                <span className="text-sm">{service.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referral Program */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg">Реферальная программа</h3>
        </div>
        <p className="text-gray-600 mb-4">Пригласите друга и получите 200 баллов, когда он совершит первый визит</p>
        <div className="bg-white p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-500 mb-2">Ваш код</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xl tracking-wider">{mockUser.referralCode}</code>
            <button 
              onClick={handleCopyReferralCode}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Копировать
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          <button 
            onClick={() => handleShareReferral('WhatsApp')}
            className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
          >
            WhatsApp
          </button>
          <button 
            onClick={() => handleShareReferral('Instagram')}
            className="px-3 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors text-sm"
          >
            Instagram
          </button>
          <button 
            onClick={() => handleShareReferral('Email')}
            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
          >
            Email
          </button>
          <button 
            onClick={() => handleShareReferral('SMS')}
            className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
          >
            SMS
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl mb-1">1</p>
            <p className="text-sm text-gray-500">Приглашено</p>
          </div>
          <div className="text-center">
            <p className="text-2xl mb-1">200</p>
            <p className="text-sm text-gray-500">Заработано</p>
          </div>
          <div className="text-center">
            <p className="text-2xl mb-1">1</p>
            <p className="text-sm text-gray-500">Активных</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Achievements Content
  const renderAchievements = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-6 rounded-2xl">
        <h2 className="text-2xl mb-2">Ваши достижения</h2>
        <p className="text-purple-100">Разблокировано {mockAchievements.filter(a => a.unlocked).length} из {mockAchievements.length}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockAchievements.map(achievement => (
          <div 
            key={achievement.id} 
            className={`p-4 rounded-xl border-2 ${
              achievement.unlocked 
                ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300' 
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`text-4xl ${!achievement.unlocked && 'grayscale opacity-50'}`}>
                {achievement.icon}
              </div>
              <div className="flex-1">
                <h3 className="mb-1">{achievement.title}</h3>
                <p className="text-sm text-gray-600">{achievement.description}</p>
                {achievement.unlocked && achievement.date && (
                  <p className="text-xs text-gray-400 mt-1">
                    Разблокировано {new Date(achievement.date).toLocaleDateString('ru-RU')}
                  </p>
                )}
              </div>
              {achievement.unlocked ? (
                <Check className="w-6 h-6 text-green-600" />
              ) : (
                <span className="text-sm text-gray-400">+{achievement.points}</span>
              )}
            </div>
            {!achievement.unlocked && achievement.progress !== undefined && (
              <div>
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Прогресс</span>
                  <span>{achievement.progress}/{achievement.total}</span>
                </div>
                <ProgressBar value={achievement.progress!} max={achievement.total!} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Active Challenges */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5" />
          <h3 className="text-lg">Активные челленджи</h3>
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="mb-1">Запишитесь на этой неделе</h4>
                <p className="text-sm text-gray-600">Получите 50 бонусных баллов</p>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">5 дней</span>
            </div>
            <button 
              onClick={handleBooking}
              className="w-full mt-3 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Выполнить
            </button>
          </div>
          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="mb-1">Попробуйте новую услугу</h4>
                <p className="text-sm text-gray-600">Получите 100 бонусных баллов</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs">10 дней</span>
            </div>
            <button 
              onClick={handleBooking}
              className="w-full mt-3 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Выполнить
            </button>
          </div>
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="mb-1">Приведите друга</h4>
                <p className="text-sm text-gray-600">Получите 200 бонусных баллов</p>
              </div>
              <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded text-xs">Без срока</span>
            </div>
            <button 
              onClick={handleCopyReferralCode}
              className="w-full mt-3 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Поделиться кодом
            </button>
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-6 h-6 text-orange-600" />
          <h3 className="text-lg">Серия посещений</h3>
        </div>
        <div className="text-center mb-4">
          <p className="text-5xl mb-2">🔥</p>
          <p className="text-3xl mb-1">3</p>
          <p className="text-gray-600">Месяца подряд</p>
        </div>
        <div className="p-4 bg-white rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Не прерывайте серию!</p>
          <p className="text-sm">Запишитесь до конца месяца, чтобы продолжить серию и получить дополнительные 100 баллов</p>
        </div>
      </div>
    </div>
  );

  // Masters Content
  const renderMasters = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Избранные мастера</h2>
        <button 
          onClick={() => setShowAllMasters(!showAllMasters)}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          {showAllMasters ? 'Только избранные' : 'Все мастера'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockMasters
          .filter(master => showAllMasters || favoriteMasters.includes(master.id))
          .map(master => (
            <div key={master.id} className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex gap-3 mb-3">
                <img src={master.photo} alt={master.name} className="w-20 h-20 rounded-xl object-cover" />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3>{master.name}</h3>
                    <button 
                      onClick={() => handleToggleFavoriteMaster(master.id)}
                      className="p-1"
                    >
                      <Heart className={`w-5 h-5 ${favoriteMasters.includes(master.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{master.specialty}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{master.rating}</span>
                    </div>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-500">{master.reviewsCount} отзывов</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Опыт</p>
                  <p className="text-sm">{master.experience}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">С вами</p>
                  <p className="text-sm">{master.visitsWithYou} визитов</p>
                </div>
              </div>
              <button 
                onClick={handleBooking}
                className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Записаться
              </button>
            </div>
          ))}
      </div>
    </div>
  );

  // Beauty Profile Content
  const renderBeautyProfile = () => {
    const getStatusColor = (status: string) => {
      switch(status) {
        case 'perfect': return 'text-green-600';
        case 'good': return 'text-blue-600';
        case 'attention': return 'text-orange-600';
        default: return 'text-gray-600';
      }
    };

    const getStatusText = (status: string) => {
      switch(status) {
        case 'perfect': return 'Всё отлично';
        case 'good': return 'Хорошо';
        case 'attention': return 'Нужно внимание';
        default: return '';
      }
    };

    return (
      <div className="space-y-6">
        {/* Overall Score */}
        <div className="bg-gradient-to-br from-pink-500 to-purple-600 text-white p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl mb-1">Beauty Score</h2>
              <p className="text-purple-100">Общий уровень ухоженности</p>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10">
                <span className="text-4xl">{averageBeautyScore}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span>Великолепно! Так держать!</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg mb-4">Показатели здоровья</h3>
          <div className="space-y-4">
            {beautyMetrics.map(metric => (
              <div key={metric.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="mb-1">{metric.name}</h4>
                    <p className="text-sm text-gray-500">
                      {metric.daysAgo} дней назад • {new Date(metric.lastDate).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm ${getStatusColor(metric.status)}`}>
                      {getStatusText(metric.status)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar 
                      value={metric.value} 
                      max={100} 
                      color={metric.status === 'attention' ? 'bg-orange-500' : metric.status === 'perfect' ? 'bg-green-500' : 'bg-blue-500'}
                    />
                  </div>
                  <span className="text-sm w-12 text-right">{metric.value}%</span>
                  <button 
                    onClick={handleBooking}
                    className="px-3 py-1 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    Записаться
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" />
            <h3 className="text-lg">Персональный календарь красоты</h3>
          </div>
          <div className="space-y-3">
            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="mb-1 text-gray-900">Рекомендуем записаться</h4>
                <p className="text-sm text-gray-600 mb-2">Брови: прошло 66 дней с последней коррекции</p>
                <button 
                  onClick={handleBooking}
                  className="text-sm text-gray-900 hover:underline flex items-center gap-1"
                >
                  Записаться на коррекцию бровей
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="mb-1 text-gray-900">Скоро понадобится</h4>
                <p className="text-sm text-gray-600 mb-2">Кожа: прошло 50 дней с последнего ухода</p>
                <button 
                  onClick={handleBooking}
                  className="text-sm text-gray-900 hover:underline flex items-center gap-1"
                >
                  Записаться на уход за лицом
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Notifications Content
  const renderNotifications = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl">Уведомления</h2>
          {unreadNotifications > 0 && (
            <p className="text-sm text-gray-500">{unreadNotifications} непрочитанных</p>
          )}
        </div>
        {unreadNotifications > 0 && (
          <button 
            onClick={handleMarkAllAsRead}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Прочитать все
          </button>
        )}
      </div>
      {notifications.map(notif => (
        <div 
          key={notif.id}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            notif.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
          }`}
          onClick={() => !notif.read && handleMarkNotificationAsRead(notif.id)}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              notif.type === 'reminder' ? 'bg-blue-100 text-blue-600' :
              notif.type === 'points' ? 'bg-green-100 text-green-600' :
              notif.type === 'promo' ? 'bg-purple-100 text-purple-600' :
              'bg-yellow-100 text-yellow-600'
            }`}>
              {notif.type === 'reminder' && <Bell className="w-5 h-5" />}
              {notif.type === 'points' && <Gift className="w-5 h-5" />}
              {notif.type === 'promo' && <Sparkles className="w-5 h-5" />}
              {notif.type === 'achievement' && <Trophy className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <h4 className="mb-1">{notif.title}</h4>
              <p className="text-sm text-gray-600 mb-1">{notif.message}</p>
              <p className="text-xs text-gray-400">{notif.time}</p>
            </div>
            {!notif.read && (
              <div className="w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // Settings Content
  const renderSettings = () => (
    <div className="space-y-6">
      {/* Profile */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg mb-4">Личные данные</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <img src={mockUser.avatar} alt={mockUser.firstName} className="w-20 h-20 rounded-full object-cover" />
            <button 
              onClick={handleUploadAvatar}
              className="absolute bottom-0 right-0 p-1.5 bg-gray-900 text-white rounded-full hover:bg-gray-800"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h4 className="mb-1">{mockUser.firstName} {mockUser.lastName}</h4>
            <p className="text-sm text-gray-500">{mockUser.email}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Имя</label>
            <input 
              type="text" 
              value={profileData.firstName}
              onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Фамилия</label>
            <input 
              type="text" 
              value={profileData.lastName}
              onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Email</label>
            <input 
              type="email" 
              value={profileData.email}
              onChange={(e) => setProfileData({...profileData, email: e.target.value})}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Телефон</label>
            <input 
              type="tel" 
              value={profileData.phone}
              onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <button 
            onClick={handleSaveProfile}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Сохранить изменения
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg mb-4">Безопасность</h3>
        <div className="space-y-3">
          <button 
            onClick={handleChangePassword}
            className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-600" />
              <span>Изменить пароль</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button 
            onClick={handleEnable2FA}
            className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-600" />
              <span>Двухфакторная аутентификация</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button 
            onClick={handleExportData}
            className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-gray-600" />
              <span>Экспорт данных</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Notifications Settings */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg mb-4">Уведомления</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="mb-1">Push-уведомления</h4>
              <p className="text-sm text-gray-500">Уведомления на устройстве</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={notificationSettings.push}
                onChange={(e) => {
                  setNotificationSettings({...notificationSettings, push: e.target.checked});
                  toast.success(e.target.checked ? 'Push-уведомления включены' : 'Push-уведомления отключены');
                }}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gray-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="mb-1">Email-рассылка</h4>
              <p className="text-sm text-gray-500">Новости и акции</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={notificationSettings.email}
                onChange={(e) => {
                  setNotificationSettings({...notificationSettings, email: e.target.checked});
                  toast.success(e.target.checked ? 'Email-рассылка включена' : 'Email-рассылка отключена');
                }}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gray-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="mb-1">SMS-напоминания</h4>
              <p className="text-sm text-gray-500">О предстоящих записях</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={notificationSettings.sms}
                onChange={(e) => {
                  setNotificationSettings({...notificationSettings, sms: e.target.checked});
                  toast.success(e.target.checked ? 'SMS-напоминания включены' : 'SMS-напоминания отключены');
                }}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gray-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg mb-4">Приватность</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="mb-1">Использование фото в портфолио</h4>
              <p className="text-sm text-gray-500">Разрешить салону публиковать</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={privacySettings.allowPhotos}
                onChange={(e) => {
                  setPrivacySettings({...privacySettings, allowPhotos: e.target.checked});
                  toast.success(e.target.checked ? 'Разрешение на публикацию фото включено' : 'Разрешение на публикацию фото отключено');
                }}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gray-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
            </label>
          </div>
        </div>
      </div>

      {/* QR Code & Loyalty Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg mb-4">Виртуальная карта лояльности</h3>
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white p-6 rounded-xl mb-4">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-yellow-100 text-sm mb-1">Beauty Studio Dubai</p>
              <h4 className="text-2xl mb-1">{mockUser.firstName} {mockUser.lastName}</h4>
              <p className="text-yellow-100">{mockUser.level} Member</p>
            </div>
            <div className="w-20 h-20 bg-white rounded-lg p-2">
              <QrCode className="w-full h-full text-gray-900" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-yellow-100 text-xs mb-1">Баллы</p>
              <p className="text-xl">{mockUser.points}</p>
            </div>
            <div>
              <p className="text-yellow-100 text-xs mb-1">Скидка</p>
              <p className="text-xl">{mockUser.discount}%</p>
            </div>
            <div>
              <p className="text-yellow-100 text-xs mb-1">ID</p>
              <p className="text-sm">#{mockUser.id.padStart(6, '0')}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => toast.info('Функция добавления в Wallet скоро будет доступна')}
            className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            Добавить в Wallet
          </button>
          <button 
            onClick={() => toast.success('QR-код сохранен')}
            className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // Chat Content
  const renderChat = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5" />
          <h3 className="text-lg">Чат с салоном</h3>
        </div>
        <EmptyState
          icon={<MessageCircle className="w-8 h-8" />}
          title="Нет сообщений"
          description="Начните общение с администратором салона"
          action={{
            label: 'Написать сообщение',
            onClick: () => toast.info('Функция чата в разработке')
          }}
        />
      </div>

      {/* Contact Info */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg mb-4">Контакты</h3>
        <div className="space-y-3">
          <a 
            href="tel:+97150123456" 
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Phone className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-500">Телефон</p>
              <p>+971 50 123 4567</p>
            </div>
          </a>
          <a 
            href="mailto:info@beautystudio.ae"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Mail className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p>info@beautystudio.ae</p>
            </div>
          </a>
          <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
            <MapPin className="w-5 h-5 text-gray-600 mt-1" />
            <div>
              <p className="text-sm text-gray-500">Адрес</p>
              <p>Dubai Marina, Marina Plaza, Office 302</p>
              <button 
                onClick={handleNavigate}
                className="text-sm text-gray-900 hover:underline mt-1 flex items-center gap-1"
              >
                Построить маршрут
                <Navigation className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Contact Buttons */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg mb-4">Быстрая связь</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button 
            onClick={() => handleContactSalon('phone')}
            className="flex items-center justify-center gap-3 p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Phone className="w-5 h-5" />
            <span>Позвонить</span>
          </button>
          <button 
            onClick={() => handleContactSalon('email')}
            className="flex items-center justify-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Mail className="w-5 h-5" />
            <span>Написать Email</span>
          </button>
          <button 
            onClick={() => handleContactSalon('WhatsApp')}
            className="flex items-center justify-center gap-3 p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span>WhatsApp</span>
          </button>
          <button 
            onClick={() => handleContactSalon('Instagram')}
            className="flex items-center justify-center gap-3 p-4 bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 transition-colors"
          >
            <Camera className="w-5 h-5" />
            <span>Instagram</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl mb-2">Личный кабинет</h1>
          <p className="text-gray-600">Управляйте записями и отслеживайте свой прогресс</p>
        </div>

        {/* Navigation */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            <TabButton 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
              icon={<Sparkles className="w-5 h-5" />}
              label="Главная"
            />
            <TabButton 
              active={activeTab === 'appointments'} 
              onClick={() => setActiveTab('appointments')} 
              icon={<Calendar className="w-5 h-5" />}
              label="Записи"
            />
            <TabButton 
              active={activeTab === 'gallery'} 
              onClick={() => setActiveTab('gallery')} 
              icon={<ImageIcon className="w-5 h-5" />}
              label="Галерея"
            />
            <TabButton 
              active={activeTab === 'loyalty'} 
              onClick={() => setActiveTab('loyalty')} 
              icon={<Award className="w-5 h-5" />}
              label="Лояльность"
            />
            <TabButton 
              active={activeTab === 'achievements'} 
              onClick={() => setActiveTab('achievements')} 
              icon={<Trophy className="w-5 h-5" />}
              label="Достижения"
            />
            <TabButton 
              active={activeTab === 'masters'} 
              onClick={() => setActiveTab('masters')} 
              icon={<Users className="w-5 h-5" />}
              label="Мастера"
            />
            <TabButton 
              active={activeTab === 'beauty'} 
              onClick={() => setActiveTab('beauty')} 
              icon={<Sparkles className="w-5 h-5" />}
              label="Beauty-профиль"
            />
            <div className="relative">
              <TabButton 
                active={activeTab === 'notifications'} 
                onClick={() => setActiveTab('notifications')} 
                icon={<Bell className="w-5 h-5" />}
                label="Уведомления"
              />
              {unreadNotifications > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                  {unreadNotifications}
                </div>
              )}
            </div>
            <TabButton 
              active={activeTab === 'chat'} 
              onClick={() => setActiveTab('chat')} 
              icon={<MessageCircle className="w-5 h-5" />}
              label="Связь"
            />
            <TabButton 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
              icon={<Settings className="w-5 h-5" />}
              label="Настройки"
            />
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'appointments' && renderAppointments()}
          {activeTab === 'gallery' && renderGallery()}
          {activeTab === 'loyalty' && renderLoyalty()}
          {activeTab === 'achievements' && renderAchievements()}
          {activeTab === 'masters' && renderMasters()}
          {activeTab === 'beauty' && renderBeautyProfile()}
          {activeTab === 'notifications' && renderNotifications()}
          {activeTab === 'chat' && renderChat()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </div>
    </div>
  );
}
