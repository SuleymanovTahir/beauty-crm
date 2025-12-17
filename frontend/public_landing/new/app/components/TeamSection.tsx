import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, Star } from 'lucide-react';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  specialty: string;
  image: string;
  experience: string;
}

// Mock API client - replace with your actual API
const apiClient = {
  getPublicEmployees: async (language: string) => {
    // This should be replaced with actual API call
    return [];
  }
};

const getPhotoUrl = (photo: string | null) => {
  if (!photo) return null;
  return photo;
};

export function TeamSection() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const language = 'ru'; // Replace with i18n language

  const fallbackTeam: TeamMember[] = [
    {
      id: 1,
      name: 'Анна Петрова',
      role: 'Мастер косметолог',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
      experience: '10 лет опыта',
      specialty: 'Уход за лицом, пилинги',
    },
    {
      id: 2,
      name: 'Мария Иванова',
      role: 'Стилист-парикмахер',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      experience: '8 лет опыта',
      specialty: 'Окрашивание, стрижки',
    },
    {
      id: 3,
      name: 'Елена Смирнова',
      role: 'Мастер маникюра',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      experience: '7 лет опыта',
      specialty: 'Маникюр, дизайн ногтей',
    },
    {
      id: 4,
      name: 'Ольга Козлова',
      role: 'SPA-специалист',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      experience: '9 лет опыта',
      specialty: 'Массаж, SPA-программы',
    },
  ];

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await apiClient.getPublicEmployees(language);

        if (Array.isArray(data) && data.length > 0) {
          const teamMembers = data.map((emp: any) => ({
            id: emp.id,
            name: emp.name,
            role: emp.role || "",
            specialty: emp.specialty || "",
            experience: emp.experience ? `${emp.experience} лет опыта` : 'Эксперт',
            image: getPhotoUrl(emp.image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=db2777&color=fff&size=400`
          }));
          setTeam(teamMembers);
        } else {
          setTeam(fallbackTeam);
        }
      } catch (error) {
        console.error('Error loading employees:', error);
        setTeam(fallbackTeam);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [language]);

  if (loading) {
    return (
      <section className="py-20 bg-muted" id="team">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-muted" id="team">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl mb-4 text-foreground">
            Наша{' '}
            <span className="text-primary">
              Команда
            </span>
          </h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Профессионалы с многолетним опытом
          </p>
        </motion.div>

        {team.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <div className="relative mb-4 overflow-hidden rounded-2xl">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex items-center gap-2 text-primary-foreground mb-2">
                        <Award className="w-4 h-4" />
                        <span className="text-sm">{member.experience}</span>
                      </div>
                      <p className="text-primary-foreground text-sm">{member.specialty}</p>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    {member.name}
                  </h3>
                  <p className="text-primary mb-3">{member.role}</p>
                  <div className="flex justify-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-primary text-primary"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            Команда пока не добавлена
          </div>
        )}
      </div>
    </section>
  );
}
