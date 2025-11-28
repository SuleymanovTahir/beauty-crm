import { useState, useEffect } from "react";
import { useLanguage } from "./LanguageContext";

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
        const response = await fetch(`/api/public/employees?language=${language}`);
        const data = await response.json();
        setTeam(Array.isArray(data) ? data : []);
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
      <section id="team" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-muted-foreground">{t('loading') || 'Loading...'}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="team" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('teamTag') || 'Наша команда'}
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary">
            {t('teamTitle') || 'Мастера своего дела'}
          </h2>
          <p className="text-lg text-foreground/70">
            {t('teamDesc') || 'Профессионалы с многолетним опытом и постоянным обучением новым техникам'}
          </p>
        </div>

        {team.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member) => (
              <div
                key={member.id}
                className="group relative overflow-hidden rounded-2xl bg-card"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-6 bg-gradient-to-t from-card to-transparent">
                  <h3 className="mb-2 text-primary">{member.name}</h3>
                  <p className="text-sm text-muted-foreground mb-1">{member.role}</p>
                  <p className="text-sm text-foreground/70">{member.specialty}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            {t('noTeamAvailable') || 'No team members available'}
          </div>
        )}
      </div>
    </section>
  );
}
