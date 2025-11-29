import { useState, useEffect } from "react";
import { useLanguage } from "./LanguageContext";
import { getPhotoUrl } from "../../src/utils/photoUtils";
import { Button } from "../../components/ui/button";
import { Calendar } from "lucide-react";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  specialty: string;
  image: string;
}

export function MastersSection() {
  const { language, t } = useLanguage();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees?active_only=true');
        const data = await response.json();
        const employees = data.employees || [];

        const teamMembers = employees.map((emp: any) => ({
          id: emp.id,
          name: emp.full_name,
          role: emp[`position_${language}`] || emp.position_ru || emp.position || '',
          specialty: emp[`bio_${language}`] || emp.bio_ru || emp.specialization || '',
          image: getPhotoUrl(emp.photo) || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=ec4899&color=fff&size=400`
        }));

        setTeam(teamMembers);
      } catch (error) {
        console.error('Error loading employees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [language]);

  if (loading) {
    return (
      <section id="team" className="py-16 sm:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-muted-foreground">{t('loading', { defaultValue: 'Загрузка...' })}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="team" className="py-16 sm:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('teamTag', { defaultValue: 'Наша команда' })}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-primary">
            {t('teamTitle', { defaultValue: 'Мастера своего дела' })}
          </h2>
          <p className="text-base sm:text-lg text-foreground/70">
            {t('teamDesc', { defaultValue: 'Профессионалы с многолетним опытом и постоянным обучением новым техникам' })}
          </p>
        </div>

        {team.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {team.map((member) => (
                <div
                  key={member.id}
                  className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-xl transition-all duration-300"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-4 sm:p-6 bg-gradient-to-t from-card to-transparent">
                    <h3 className="mb-1 sm:mb-2 text-sm sm:text-base text-primary">{member.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Section */}
            <div className="text-center mt-8 sm:mt-12 space-y-4">
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('teamCallToAction', { defaultValue: 'Запишитесь к нашим профессиональным мастерам!' })}
              </p>
              <Button
                onClick={() => {
                  document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 sm:px-12 py-5 sm:py-6 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                size="lg"
              >
                <Calendar className="w-5 h-5" />
                {t('bookNow', { defaultValue: "Записаться на прием" })}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground">
            {t('noTeamAvailable', { defaultValue: 'Информация о мастерах скоро появится' })}
          </div>
        )}
      </div>
    </section>
  );
}
