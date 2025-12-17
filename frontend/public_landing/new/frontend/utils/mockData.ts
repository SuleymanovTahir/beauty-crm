// Mock data for testing with extensive content

export const mockGalleryImages = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  image_path: `https://images.unsplash.com/photo-${1550000000000 + i * 100000}?w=600&h=600&fit=crop&auto=format`,
  title: `Работа ${i + 1} - Профессиональная укладка волос с использованием премиальных продуктов для долговременного эффекта`,
  title_en: `Work ${i + 1} - Professional hair styling with premium products`,
  title_ar: `العمل ${i + 1} - تصفيف شعر احترافي بمنتجات فاخرة`,
  category: ['face', 'hair', 'nails', 'body'][i % 4]
}));

export const mockPortfolioImages = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  image_path: `https://images.unsplash.com/photo-${1600000000000 + i * 50000}?w=500&h=700&fit=crop&auto=format`,
  title: `Портфолио ${i + 1} - Великолепный результат работы наших мастеров`,
  title_en: `Portfolio ${i + 1} - Magnificent result of our masters`,
  title_ar: `المحفظة ${i + 1} - نتيجة رائعة لأساتذتنا`,
  description: `Комплексная процедура с использованием профессиональных техник и материалов высочайшего качества. Индивидуальный подход к каждому клиенту с учетом всех особенностей и пожеланий.`,
  category: ['face', 'hair', 'nails', 'body'][i % 4]
}));

export const mockServices = Array.from({ length: 120 }, (_, i) => {
  const categories = [
    { name: 'nails', nameRu: 'Ногти', nameEn: 'Nails', nameAr: 'الأظافر' },
    { name: 'hair', nameRu: 'Волосы', nameEn: 'Hair', nameAr: 'الشعر' },
    { name: 'face', nameRu: 'Лицо', nameEn: 'Face', nameAr: 'الوجه' },
    { name: 'body', nameRu: 'Тело', nameEn: 'Body', nameAr: 'الجسم' },
    { name: 'makeup', nameRu: 'Макияж', nameEn: 'Makeup', nameAr: 'المكياج' },
    { name: 'brows', nameRu: 'Брови и ресницы', nameEn: 'Brows & Lashes', nameAr: 'الحواجب والرموش' }
  ];
  
  const cat = categories[i % categories.length];
  const basePrice = 50 + (i * 10);
  
  return {
    id: i + 1,
    name: `${cat.nameRu} - Процедура ${(i % 20) + 1} с использованием премиальных материалов и профессиональных техник для достижения идеального результата`,
    name_en: `${cat.nameEn} - Procedure ${(i % 20) + 1} with premium materials`,
    name_ar: `${cat.nameAr} - الإجراء ${(i % 20) + 1} مع مواد فاخرة`,
    description: `Профессиональная услуга высочайшего качества. Используем только сертифицированные материалы ведущих мировых брендов. Мастера с опытом работы более 10 лет гарантируют безупречный результат. Индивидуальный подход к каждому клиенту с учетом особенностей кожи, волос и личных пожеланий.`,
    description_en: `Professional service of the highest quality. We use only certified materials from leading world brands.`,
    description_ar: `خدمة احترافية بأعلى جودة. نستخدم فقط مواد معتمدة من العلامات التجارية العالمية الرائدة.`,
    price: basePrice,
    min_price: basePrice,
    max_price: basePrice + 200,
    currency: 'AED',
    duration: (30 + (i % 6) * 15),
    category: cat.name
  };
});

export const mockReviews = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  name: [
    'Анна Иванова', 'Maria Garcia', 'Sarah Johnson', 'Elena Petrova', 
    'Fatima Ahmed', 'Julia Smith', 'Natalia Volkova', 'Diana Lopez'
  ][i % 8],
  avatar_url: i % 3 === 0 ? `https://i.pravatar.cc/150?img=${i + 1}` : '',
  rating: 4 + (i % 2),
  text: i % 3 === 0
    ? `Потрясающий салон! Мастера - настоящие профессионалы своего дела. Атмосфера очень уютная и расслабляющая. Результат превзошел все мои ожидания. Использовали премиальные материалы, все очень аккуратно и качественно. Обязательно вернусь снова и буду рекомендовать всем своим подругам! Спасибо огромное за прекрасную работу и внимательное отношение!`
    : i % 3 === 1
    ? `Wonderful salon! The masters are true professionals. Very comfortable atmosphere and excellent service. I am extremely satisfied with the result and will definitely come back again. Highly recommend to everyone!`
    : `صالون رائع! الأساتذة محترفون حقيقيون. جو مريح للغاية وخدمة ممتازة. أنا راضية جدًا عن النتيجة وسأعود بالتأكيد مرة أخرى!`,
  employee_position: ['Мастер маникюра', 'Стилист-парикмахер', 'Визажист', 'Косметолог'][i % 4],
  created_at: new Date(Date.now() - i * 86400000).toISOString()
}));

export const mockTeamMembers = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  name: [
    'Елена Смирнова', 'Maria Santos', 'Anna Ivanova', 'Sofia Rodriguez',
    'Natalia Petrova', 'Julia Martinez', 'Victoria Lopez', 'Diana Volkova'
  ][i % 8],
  role: [
    'Топ-стилист', 'Мастер маникюра', 'Визажист', 'Колорист',
    'Косметолог', 'Мастер по бровям', 'Мастер педикюра', 'Парикмахер'
  ][i % 8],
  role_en: [
    'Top Stylist', 'Nail Artist', 'Makeup Artist', 'Colorist',
    'Cosmetologist', 'Brow Master', 'Pedicure Master', 'Hairdresser'
  ][i % 8],
  specialty: i % 2 === 0
    ? 'Специализация: сложные окрашивания, стрижки любой сложности, укладки для особых мероприятий'
    : 'Specialization: complex coloring, haircuts of any complexity, styling for special events',
  specialty_en: 'Specialization: complex coloring, haircuts of any complexity, special event styling',
  experience: 5 + (i % 10),
  image: `https://i.pravatar.cc/400?img=${i + 20}`
}));

export const mockBanners = [
  {
    id: 1,
    image_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&h=1080&fit=crop',
    title_ru: 'Откройте мир',
    title_en: 'Discover the world',
    title_ar: 'اكتشف عالم',
    subtitle_ru: 'профе��сиональной красоты',
    subtitle_en: 'of professional beauty',
    subtitle_ar: 'الجمال المهني',
    bg_pos_desktop_x: 50,
    bg_pos_desktop_y: 50,
    bg_pos_mobile_x: 50,
    bg_pos_mobile_y: 30,
    is_flipped_horizontal: false,
    is_flipped_vertical: false
  }
];

export const mockFAQs = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  question: i % 3 === 0
    ? `Вопрос ${i + 1}: Какие услуги вы предоставляете и сколько времени занимает каждая процедура?`
    : i % 3 === 1
    ? `Question ${i + 1}: What services do you provide and how long does each procedure take?`
    : `السؤال ${i + 1}: ما هي الخدمات التي تقدمونها وكم من الوقت تستغرق كل إجراء؟`,
  answer: i % 3 === 0
    ? `Мы предлагаем широкий спектр услуг: маникюр, педикюр, стрижки, окрашивание, укладки, макияж, уход за лицом и телом. Продолжительность процедур варьируется от 30 минут до 3 часов в зависимости от сложности. Наши мастера всегда проконсультируют вас по времени и стоимости услуг.`
    : i % 3 === 1
    ? `We offer a wide range of services: manicure, pedicure, haircuts, coloring, styling, makeup, facial and body care. The duration of procedures varies from 30 minutes to 3 hours depending on complexity.`
    : `نحن نقدم مجموعة واسعة من الخدمات: مانيكير، باديكير، قص الشعر، الصبغ، التصفيف، المكياج، العناية بالوجه والجسم. تختلف مدة الإجراءات من 30 دقيقة إلى 3 ساعات حسب التعقيد.`,
  category: 'general'
}));
