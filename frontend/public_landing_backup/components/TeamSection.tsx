import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getPhotoUrl } from "../../src/utils/photoUtils";
import { Award } from "lucide-react";
import { apiClient } from "../../src/api/client";

interface TeamMember {
    id: number;
    name: string;
    role: string;
    specialty: string;
    image: string;
    experience: string;
}

export function TeamSection() {
    const { t, i18n } = useTranslation(['public_landing', 'common', 'dynamic']);
    const language = i18n.language;
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const data = await apiClient.getPublicEmployees(language);

                if (Array.isArray(data)) {
                    const teamMembers = data.map((emp: any) => ({
                        id: emp.id,
                        name: emp.name,
                        role: emp.role || "",
                        specialty: emp.specialty || "",
                        experience: emp.experience ? `${emp.experience} ${t('yearsExp', 'лет опыта')}` : t('expert', 'Эксперт'),
                        image: getPhotoUrl(emp.image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=ec4899&color=fff&size=400`
                    }));
                    setTeam(teamMembers);
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
    }, [language, t]);

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
                    <h2 className="text-4xl sm:text-5xl mb-6 text-[var(--heading)]">
                        {t('teamTitle') || 'Мастера своего дела'}
                    </h2>
                    <p className="text-lg text-foreground/70">
                        {t('teamDesc') || 'Профессионалы с многолетним опытом и постоянным обучением новым техникам'}
                    </p>
                </div>

                {team.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
                        {team.map((member) => (
                            <div
                                key={member.id}
                                className="group relative overflow-hidden rounded-xl md:rounded-2xl bg-card"
                            >
                                <div className="aspect-[3/4] overflow-hidden relative">
                                    <img
                                        src={member.image}
                                        alt={member.name}
                                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <div className="flex items-center gap-2 text-white mb-2">
                                                <Award className="w-4 h-4" />
                                                <span className="text-sm">{member.experience}</span>
                                            </div>
                                            <p className="text-white text-sm">{member.specialty}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 sm:p-4 bg-gradient-to-t from-card to-transparent">
                                    <h3 className="mb-1 text-sm sm:text-base text-[var(--heading)]">{member.name}</h3>
                                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">{member.role}</p>
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
