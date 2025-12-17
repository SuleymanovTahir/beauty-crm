import { useState } from 'react';
import { Award } from 'lucide-react';
import { mockTeamMembers } from '../../utils/mockData';

export function TeamSection() {
  const [displayCount, setDisplayCount] = useState(8);
  const displayedMembers = mockTeamMembers.slice(0, displayCount);

  return (
    <section id="team" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            Наша команда
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            Мастера своего дела
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            Профессионалы с многолетним опытом
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 max-w-6xl mx-auto">
          {displayedMembers.map((member) => (
            <div key={member.id} className="group relative overflow-hidden rounded-lg sm:rounded-xl bg-card">
              <div className="aspect-[3/4] overflow-hidden relative">
                <img
                  src={member.image}
                  alt={member.name}
                  loading="lazy"
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                    <div className="flex items-center gap-1.5 text-white mb-1">
                      <Award className="w-3 h-3" />
                      <span className="text-xs">{member.experience} лет</span>
                    </div>
                    <p className="text-white text-xs line-clamp-2">{member.specialty}</p>
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

        {displayCount < mockTeamMembers.length && (
          <div className="text-center mt-6 sm:mt-8">
            <button
              onClick={() => setDisplayCount(prev => Math.min(prev + 8, mockTeamMembers.length))}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              Показать еще ({mockTeamMembers.length - displayCount})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
