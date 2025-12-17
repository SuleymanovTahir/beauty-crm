// Mock data for extensive content testing

export const mockGalleryImages = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  image_path: `https://images.unsplash.com/photo-${1550000000000 + i * 100000}?w=600&h=600&fit=crop&auto=format`,
  title: `Работа ${i + 1}`,
  title_ru: `Работа ${i + 1} - Профессиональная укладка`,
  title_en: `Work ${i + 1} - Professional styling`,
  category: ['face', 'hair', 'nails', 'body'][i % 4]
}));

export const mockPortfolioImages = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  image_path: `https://images.unsplash.com/photo-${1600000000000 + i * 50000}?w=500&h=700&fit=crop&auto=format`,
  title: `Портфолио ${i + 1}`,
  description: `Результат работы наших мастеров`,
  category: ['face', 'hair', 'nails', 'body'][i % 4]
}));

export const mockServices = Array.from({ length: 120 }, (_, i) => {
  const categories = ['nails', 'hair', 'face', 'body', 'makeup', 'brows'];
  const cat = categories[i % categories.length];
  const basePrice = 50 + (i * 10);
  
  return {
    id: i + 1,
    name: `${cat.charAt(0).toUpperCase() + cat.slice(1)} - Процедура ${(i % 20) + 1}`,
    description: `Профессиональная услуга высочайшего качества с использованием премиальных материалов`,
    price: basePrice,
    min_price: basePrice,
    max_price: basePrice + 200,
    currency: 'AED',
    duration: 30 + (i % 6) * 15,
    category: cat
  };
});

export const mockReviews = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  name: ['Анна', 'Maria', 'Sarah', 'Elena'][i % 4] + ' ' + ['Иванова', 'Garcia', 'Johnson'][i % 3],
  avatar_url: i % 3 === 0 ? `https://i.pravatar.cc/150?img=${i + 1}` : '',
  rating: 4 + (i % 2),
  text: `Потрясающий салон! Мастера профессионалы. Атмосфера уютная. Результат превзошел ожидания. Обязательно вернусь!`,
  employee_position: ['Мастер маникюра', 'Стилист', 'Визажист'][i % 3],
  created_at: new Date(Date.now() - i * 86400000).toISOString()
}));

export const mockTeamMembers = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  name: ['Елена', 'Maria', 'Anna', 'Sofia'][i % 4] + ' ' + ['Смирнова', 'Santos', 'Petrova'][i % 3],
  role: ['Топ-стилист', 'Мастер маникюра', 'Визажист', 'Колорист'][i % 4],
  specialty: 'Специализация: сложные окрашивания, стрижки',
  experience: 5 + (i % 10),
  image: `https://i.pravatar.cc/400?img=${i + 20}`
}));
