// Моковые данные для приложения салона красоты

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  loyaltyPoints: number;
  currentDiscount: number;
  totalVisits: number;
  memberSince: string;
  currentTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  streak: number;
}

export interface Appointment {
  id: string;
  masterId: string;
  service: string;
  date: string;
  time: string;
  price: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  photo?: string;
  canReview?: boolean;
}

export interface Master {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  avatar: string;
  isFavorite: boolean;
  reviews: number;
}

export interface GalleryItem {
  id: string;
  category: 'hair' | 'nails' | 'face' | 'body';
  before: string;
  after: string;
  service: string;
  date: string;
  masterId: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedDate?: string;
  progress?: number;
  maxProgress?: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  reward: string;
  deadline: string;
  progress: number;
  maxProgress: number;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  oldPrice: number;
  newPrice: number;
  daysLeft: number;
  image: string;
}

export interface Notification {
  id: string;
  type: 'appointment' | 'promotion' | 'achievement' | 'reminder';
  title: string;
  message: string;
  date: string;
  read: boolean;
}

export const currentUser: User = {
  id: '1',
  name: 'Анна Петрова',
  email: 'anna@example.com',
  phone: '+971 50 123 4567',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
  loyaltyPoints: 2450,
  currentDiscount: 15,
  totalVisits: 47,
  memberSince: '2023-03-15',
  currentTier: 'gold',
  streak: 12,
};

export const masters: Master[] = [
  {
    id: '1',
    name: 'Мария Иванова',
    specialty: 'Волосы',
    rating: 4.9,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop',
    isFavorite: true,
    reviews: 234,
  },
  {
    id: '2',
    name: 'Елена Смирнова',
    specialty: 'Ногти',
    rating: 4.8,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
    isFavorite: true,
    reviews: 189,
  },
  {
    id: '3',
    name: 'Ольга Кузнецова',
    specialty: 'Лицо',
    rating: 4.9,
    avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=200&fit=crop',
    isFavorite: false,
    reviews: 156,
  },
  {
    id: '4',
    name: 'Светлана Попова',
    specialty: 'Массаж',
    rating: 4.7,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop',
    isFavorite: false,
    reviews: 142,
  },
];

export const appointments: Appointment[] = [
  {
    id: '1',
    masterId: '1',
    service: 'Окрашивание + Стрижка',
    date: '2026-01-05',
    time: '14:00',
    price: 450,
    status: 'upcoming',
  },
  {
    id: '2',
    masterId: '2',
    service: 'Маникюр + Гель-лак',
    date: '2024-12-20',
    time: '11:00',
    price: 180,
    status: 'completed',
    canReview: true,
  },
  {
    id: '3',
    masterId: '3',
    service: 'Чистка лица',
    date: '2024-12-10',
    time: '16:30',
    price: 280,
    status: 'completed',
  },
  {
    id: '4',
    masterId: '1',
    service: 'Стрижка',
    date: '2024-11-25',
    time: '10:00',
    price: 150,
    status: 'completed',
  },
];

export const galleryItems: GalleryItem[] = [
  {
    id: '1',
    category: 'hair',
    before: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop',
    after: 'https://images.unsplash.com/photo-1560869713-bf18f8c185fe?w=400&h=400&fit=crop',
    service: 'Окрашивание',
    date: '2024-12-15',
    masterId: '1',
  },
  {
    id: '2',
    category: 'nails',
    before: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
    after: 'https://images.unsplash.com/photo-1610992015762-45dca7e44ae3?w=400&h=400&fit=crop',
    service: 'Маникюр',
    date: '2024-12-20',
    masterId: '2',
  },
  {
    id: '3',
    category: 'face',
    before: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&h=400&fit=crop',
    after: 'https://images.unsplash.com/photo-1526758097130-bab247092569?w=400&h=400&fit=crop',
    service: 'Чистка лица',
    date: '2024-12-10',
    masterId: '3',
  },
  {
    id: '4',
    category: 'hair',
    before: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=400&fit=crop',
    after: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop',
    service: 'Стрижка',
    date: '2024-11-25',
    masterId: '1',
  },
];

export const achievements: Achievement[] = [
  {
    id: '1',
    title: 'Первый визит',
    description: 'Совершите первый визит в салон',
    icon: 'Star',
    unlocked: true,
    unlockedDate: '2023-03-15',
  },
  {
    id: '2',
    title: 'Постоянный клиент',
    description: 'Посетите салон 10 раз',
    icon: 'Heart',
    unlocked: true,
    unlockedDate: '2023-06-20',
  },
  {
    id: '3',
    title: 'Золотой статус',
    description: 'Достигните Gold уровня',
    icon: 'Award',
    unlocked: true,
    unlockedDate: '2024-09-10',
  },
  {
    id: '4',
    title: 'Неделя красоты',
    description: 'Серия из 7 визитов подряд',
    icon: 'Flame',
    unlocked: true,
    unlockedDate: '2024-10-15',
    progress: 12,
    maxProgress: 7,
  },
  {
    id: '5',
    title: 'VIP клиент',
    description: 'Совершите 50 визитов',
    icon: 'Crown',
    unlocked: false,
    progress: 47,
    maxProgress: 50,
  },
  {
    id: '6',
    title: 'Платиновый',
    description: 'Достигните Platinum уровня',
    icon: 'Gem',
    unlocked: false,
    progress: 2450,
    maxProgress: 5000,
  },
];

export const challenges: Challenge[] = [
  {
    id: '1',
    title: 'Тройной маникюр',
    description: 'Сделайте 3 маникюра за месяц',
    reward: '+500 баллов',
    deadline: '2026-01-31',
    progress: 2,
    maxProgress: 3,
  },
  {
    id: '2',
    title: 'Приведи друга',
    description: 'Пригласите 2 друзей по реферальной программе',
    reward: '+1000 баллов',
    deadline: '2026-02-28',
    progress: 0,
    maxProgress: 2,
  },
  {
    id: '3',
    title: 'Новый образ',
    description: 'Попробуйте 3 разные услуги',
    reward: '+300 баллов',
    deadline: '2026-01-15',
    progress: 1,
    maxProgress: 3,
  },
];

export const promotions: Promotion[] = [
  {
    id: '1',
    title: 'Новогодняя акция',
    description: 'Окрашивание + стрижка по специальной цене',
    oldPrice: 550,
    newPrice: 399,
    daysLeft: 7,
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
  },
  {
    id: '2',
    title: 'Зимний уход',
    description: 'Комплекс процедур для лица со скидкой 30%',
    oldPrice: 800,
    newPrice: 560,
    daysLeft: 14,
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=300&fit=crop',
  },
  {
    id: '3',
    title: 'Маникюр + Педикюр',
    description: 'Две услуги по цене одной',
    oldPrice: 350,
    newPrice: 280,
    daysLeft: 3,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop',
  },
];

export const notifications: Notification[] = [
  {
    id: '1',
    type: 'reminder',
    title: 'Напоминание о записи',
    message: 'Ваша запись к Марии Ивановой завтра в 14:00',
    date: '2026-01-04T10:00:00',
    read: false,
  },
  {
    id: '2',
    type: 'promotion',
    title: 'Новая акция!',
    message: 'Зимний уход: комплекс процедур со скидкой 30%',
    date: '2024-12-28T09:00:00',
    read: false,
  },
  {
    id: '3',
    type: 'achievement',
    title: 'Новое достижение!',
    message: 'Вы получили "Неделя красоты" - серия из 7 визитов',
    date: '2024-12-27T15:30:00',
    read: true,
  },
  {
    id: '4',
    type: 'appointment',
    title: 'Оставьте отзыв',
    message: 'Расскажите о вашем визите к Елене Смирновой',
    date: '2024-12-20T18:00:00',
    read: true,
  },
];

export const spendingData = [
  { month: 'Июл', amount: 450 },
  { month: 'Авг', amount: 680 },
  { month: 'Сен', amount: 520 },
  { month: 'Окт', amount: 890 },
  { month: 'Ноя', amount: 720 },
  { month: 'Дек', amount: 1100 },
];

export const categorySpending = [
  { category: 'Волосы', value: 1800, fill: '#FF6B9D' },
  { category: 'Ногти', value: 720, fill: '#C084FC' },
  { category: 'Лицо', value: 840, fill: '#60A5FA' },
  { category: 'Тело', value: 400, fill: '#34D399' },
];

export const beautyMetrics = [
  { category: 'Кожа', score: 85, color: '#FF6B9D' },
  { category: 'Волосы', score: 78, color: '#C084FC' },
  { category: 'Ногти', score: 92, color: '#60A5FA' },
  { category: 'Общий уход', score: 88, color: '#34D399' },
];

export const nextProcedures = [
  { service: 'Маникюр', daysLeft: 5, recommended: true },
  { service: 'Окрашивание', daysLeft: 18, recommended: false },
  { service: 'Чистка лица', daysLeft: 25, recommended: false },
];

export const referralCode = 'ANNA2024';
