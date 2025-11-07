import React, { useEffect, useState } from 'react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { Heart, Award, Users, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useTranslation } from 'react-i18next';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  experience: string;
  avatar?: string;
}

export default function About() {
  const navigate = useNavigate();
  const { t } = useTranslation(['public/About', 'common']);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [salonInfo, setSalonInfo] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Загружаем информацию о салоне
        const salonData = await apiClient.getSalonInfo();
        setSalonInfo(salonData);

        // Загружаем команду из API employees
        const data = await apiClient.getPublicEmployees();

        if (data.employees && data.employees.length > 0) {
          const teamData = data.employees.map((e: any) => ({
            id: e.id,
            name: e.full_name,
            role: e.position || 'Мастер',
            experience: e.experience || '',
            avatar: e.photo || e.full_name.charAt(0).toUpperCase()
          }));
          setTeam(teamData);
        } else {
          // Если команды нет - оставляем пустой массив
          setTeam([]);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        // При ошибке тоже оставляем пустым
        setTeam([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl text-gray-900 mb-6">{t('about:title')}</h1>
            <p className="text-xl text-gray-600">
              {t('about:We_create_beauty_and_confidence_for_over_10_years_Our_mission_-_to_help_every_woman_feel_beautiful_and_special')}
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
            <h2 className="text-4xl text-gray-900 mb-6">{t('about:our_story')}</h2>
              <div className="space-y-4 text-gray-600 text-lg">
                <p>
                  {salonInfo.name || 'Наш салон'} - {t('about:your_reliable_partner_in_the_world_of_beauty')}
                </p>
                <p>
                  {t('about:Over_the_years_we_have_become_one_of_the_leading_beauty_salons_in_Dubai_having_served_over_10_000_satisfied_clients_Our_reputation_is_built_on_trust_professionalism_and_love_for_our_craft')}
                </p>
                <p>
                {t('about:We_are_constantly_evolving_following_the_latest_trends_in_the_beauty_industry_and_using_only_proven_high-quality_materials_and_equipment')}
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
          <h2 className="text-4xl text-gray-900 mb-4">{t('about:our_values')}</h2>
          <p className="text-xl text-gray-600">{t('about:The_principles_we_are_guided_by')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-8 h-8 text-pink-600" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">{t('about:Love_for_our_craft')}</h3>

              <p className="text-gray-600">
              {t('about:We_love_what_we_do_and_this_is_reflected_in_every_procedure')}              
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">{t('about:values.professionalism.title')}</h3>
              <p className="text-gray-600">
              {t('about:Our_masters_regularly_upgrade_their_qualifications')}              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">{t('about:values.client_focus.title')}</h3>
              <p className="text-gray-600">
              {t('about:Your_comfort_and_satisfaction_-_our_priority')}
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">{t('about:values.quality.title')}</h3>
              <p className="text-gray-600">
              {t('about:We_use_only_premium_materials_and_equipment')}              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
          <h2 className="text-4xl text-gray-900 mb-4">{t('about:our_team')}</h2>
          <p className="text-xl text-gray-600">
            {t('about:Meet_our_talented_masters')}            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
<p className="text-gray-600">{t('common:loading')}</p>
</div>
          ) : team.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {team.map((member) => (
                <div key={member.id} className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-8 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-6">
                    {member.avatar}
                  </div>
                  <h3 className="text-xl text-gray-900 mb-2">{member.name}</h3>
                  <p className="text-pink-600 mb-2">{member.role}</p>
                  <p className="text-sm text-gray-600">{member.experience}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl text-gray-900 mb-4">{t('about:Our_team_of_professionals')}</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
              {t('about:In_our_salon_experienced_masters_with_international_certificates_work_Each_specialist_has_extensive_experience_and_regularly_upgrades_their_qualifications_to_provide_you_with_services_of_the_highest_quality')}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-5xl text-pink-600 mb-2">10+</p>
              <p className="text-gray-700">{t('stats:years_experience')}</p>
            </div>
            <div>
              <p className="text-5xl text-purple-600 mb-2">10K+</p>
              <p className="text-gray-700">{t('stats:satisfied_clients')}</p>
            </div>
            <div>
              <p className="text-5xl text-pink-600 mb-2">15+</p>
              <p className="text-gray-700">{t('stats:service_types')}</p>
            </div>
            <div>
              <p className="text-5xl text-purple-600 mb-2">50+</p>
              <p className="text-gray-700">{t('stats:awards_and_certificates')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl text-gray-900 mb-6">{t('cta:ready_to_transform')}</h2>
          <p className="text-xl text-gray-600 mb-8">
          {t('about:Book_a_procedure_right_now_and_feel_the_difference')}
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-pink-500 to-purple-600"
            onClick={() => navigate('/')}
          >
            {t('cta:book_procedure')}
          </Button>
        </div>
      </section>
    </div>
  );
}