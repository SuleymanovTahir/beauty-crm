import React from 'react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { Heart, Award, Users, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';

const team = [
  { name: 'Анна Петрова', role: 'Мастер перманентного макияжа', experience: '8 лет опыта', avatar: 'А' },
  { name: 'Мария Иванова', role: 'Косметолог', experience: '6 лет опыта', avatar: 'М' },
  { name: 'Елена Сидорова', role: 'Мастер маникюра', experience: '5 лет опыта', avatar: 'Е' },
  { name: 'Ольга Козлова', role: 'Парикмахер-стилист', experience: '10 лет опыта', avatar: 'О' },
  { name: 'София Николаева', role: 'Lash-мастер', experience: '4 года опыта', avatar: 'С' },
  { name: 'Ирина Волкова', role: 'Массажист', experience: '7 лет опыта', avatar: 'И' },
];

export default function About() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl text-gray-900 mb-6">О нас</h1>
            <p className="text-xl text-gray-600">
              Мы создаем красоту и уверенность уже более 10 лет. Наша миссия - помочь каждой женщине
              почувствовать себя прекрасной и особенной.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl text-gray-900 mb-6">Наша история</h2>
              <div className="space-y-4 text-gray-600 text-lg">
                <p>
                  Luxury Beauty Salon был основан в 2015 году с простой идеей: создать место, где каждая
                  женщина может получить услуги премиум-класса в комфортной и уютной атмосфере.
                </p>
                <p>
                  За годы работы мы стали одним из ведущих салонов красоты в Дубае, обслужив более 10,000
                  довольных клиенток. Наша репутация построена на доверии, профессионализме и любви к
                  своему делу.
                </p>
                <p>
                  Мы постоянно развиваемся, следим за последними трендами в индустрии красоты и используем
                  только проверенные, качественные материалы и оборудование.
                </p>
              </div>
            </div>
            <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1695527081827-fdbc4e77be9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBzYWxvbiUyMHNwYSUyMGludGVyaW9yfGVufDF8fHx8MTc2MDg1MDUzNXww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Salon Interior"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl text-gray-900 mb-4">Наши ценности</h2>
            <p className="text-xl text-gray-600">Принципы, которыми мы руководствуемся</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-8 h-8 text-pink-600" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">Любовь к делу</h3>
              <p className="text-gray-600">
                Мы любим то, что делаем, и это отражается в каждой процедуре
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">Профессионализм</h3>
              <p className="text-gray-600">
                Наши мастера регулярно повышают квалификацию
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">Клиентоориентированность</h3>
              <p className="text-gray-600">
                Ваш комфорт и удовлетворенность - наш приоритет
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">Качество</h3>
              <p className="text-gray-600">
                Используем только премиальные материалы и оборудование
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl text-gray-900 mb-4">Наша команда</h2>
            <p className="text-xl text-gray-600">
              Познакомьтесь с нашими талантливыми мастерами
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member, idx) => (
              <div key={idx} className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-8 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-6">
                  {member.avatar}
                </div>
                <h3 className="text-xl text-gray-900 mb-2">{member.name}</h3>
                <p className="text-pink-600 mb-2">{member.role}</p>
                <p className="text-sm text-gray-600">{member.experience}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-5xl text-pink-600 mb-2">10+</p>
              <p className="text-gray-700">Лет опыта</p>
            </div>
            <div>
              <p className="text-5xl text-purple-600 mb-2">10K+</p>
              <p className="text-gray-700">Довольных клиентов</p>
            </div>
            <div>
              <p className="text-5xl text-pink-600 mb-2">15+</p>
              <p className="text-gray-700">Видов услуг</p>
            </div>
            <div>
              <p className="text-5xl text-purple-600 mb-2">50+</p>
              <p className="text-gray-700">Наград и сертификатов</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl text-gray-900 mb-6">Готовы преобразиться?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Запишитесь на процедуру прямо сейчас и ощутите разницу
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-pink-500 to-purple-600"
            onClick={() => navigate('/')}
          >
            Записаться на процедуру
          </Button>
        </div>
      </section>
    </div>
  );
}
