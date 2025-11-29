// /frontend/public_landing/MastersSection.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getPhotoUrl } from "../src/utils/photoUtils";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  specialty: string;
  image: string;
}

import { apiClient } from "../src/api/client";

export function MastersSection() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // Use the public API endpoint which handles translations
        const data = await apiClient.getPublicEmployees(language);

        // The API returns a list of employees with translated fields
        // data is List[Dict] -> Array<Employee>

        if (Array.isArray(data)) {
          const teamMembers = data.map((emp: any) => ({
            id: emp.id,
            name: emp.name, // Already translated by backend
            role: emp.role, // Already translated by backend
            specialty: emp.specialty, // Already translated by backend
            image: getPhotoUrl(emp.image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=ec4899&color=fff&size=400`
          }));
          setTeam(teamMembers); // API returns sorted list
        } else {
          setTeam([]);
        }

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
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 max-w-5xl mx-auto">
            {team.map((member) => (
              <div
                key={member.id}
                className="group relative overflow-hidden rounded-2xl bg-card"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-3 sm:p-6 bg-gradient-to-t from-card to-transparent">
                  <h3 className="mb-1 sm:mb-2 text-sm sm:text-base text-primary">{member.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">{member.role}</p>
                  {/* <p className="text-sm text-foreground/70">{member.specialty}</p> */}
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
