import { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import { useTranslation } from "react-i18next";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  specialty: string;
  image: string;
  experience: number | string;
}

export function TeamSection() {
  const { t, i18n } = useTranslation(['public_landing', 'common', 'dynamic']);
  const language = i18n.language;
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [displayCount, setDisplayCount] = useState(8);

  // Helper function to capitalize names (ALL CAPS -> Title Case)
  const capitalizeName = (name: string) => {
    return name.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
        const res = await fetch(`${API_URL}/api/public/employees?language=${language}`);
        const data = await res.json();

        if (Array.isArray(data)) {
          const teamMembers = data.map((emp: any) => ({
            id: emp.id,
            name: capitalizeName(emp.name),
            role: emp.role || "",
            specialty: emp.specialty || "",
            // Experience from backend might be number or string. 
            experience: emp.experience || 0,
            // Check if image is full URL or needs prefix. Usually backend sends filename.
            // Check if image is full URL or needs prefix. Usually backend sends filename.
            image: emp.image ? (
              emp.image.startsWith('http') ? emp.image :
                emp.image.startsWith('/') ? `${API_URL}${emp.image}` :
                  `${API_URL}/uploads/${emp.image}`
            ) : `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=ec4899&color=fff&size=400`
          }));
          setTeam(teamMembers);
        } else {
          setTeam([]);
        }

      } catch (error) {
        console.error('Error loading employees:', error);
        setTeam([]);
      }
    };

    fetchEmployees();
  }, [language]);

  const displayedMembers = team.slice(0, displayCount);

  return (
    <section id="team" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            {t('teamTag', { defaultValue: 'Наша команда' })}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('teamTitle', { defaultValue: 'Мастера своего дела' })}
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            {t('teamDesc', { defaultValue: 'Профессионалы с многолетним опытом' })}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 max-w-6xl mx-auto">
          {displayedMembers.map((member) => (
            <div key={member.id} className="team-card">
              <div className="aspect-[3/4] overflow-hidden relative">
                <img
                  src={member.image}
                  alt={member.name}
                  loading="lazy"
                  className="w-full h-full object-cover object-top"
                />
                <div className="team-card-overlay">
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                    {Boolean(member.experience && member.experience !== 0 && member.experience !== "0") && (
                      <div className="flex items-center gap-1.5 text-primary-foreground mb-1">
                        <Award className="w-3 h-3" />
                        <span className="text-xs">{member.experience} {t('yearsExp', { defaultValue: 'лет' })}</span>
                      </div>
                    )}
                    <p className="text-primary-foreground text-xs line-clamp-2">{member.specialty}</p>
                  </div>
                </div>
              </div>
              <div className="p-2 sm:p-3">
                <h3 className="text-sm sm:text-base text-[var(--heading)] mb-0.5">{member.name}</h3>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
            </div>
          ))}
        </div>

        {displayCount < team.length && (
          <div className="text-center mt-6 sm:mt-8">
            <button
              onClick={() => setDisplayCount(prev => Math.min(prev + 8, team.length))}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              {t('loading', { defaultValue: 'Показать еще' })} ({team.length - displayCount})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
