const team = [
  {
    name: "Анна Петрова",
    role: "Топ-стилист",
    specialty: "Окрашивание и стрижки",
    image: "https://images.unsplash.com/photo-1763048208932-cbe149724374?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoYWlyc3R5bGlzdHxlbnwxfHx8fDE3NjQxMjY2NTN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    name: "Мария Соколова",
    role: "Мастер маникюра",
    specialty: "Nail-арт и дизайн",
    image: "https://images.unsplash.com/photo-1750187218719-d9062dd84ff6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjQxMDU0NTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    name: "Елена Волкова",
    role: "Визажист",
    specialty: "Вечерний и свадебный макияж",
    image: "https://images.unsplash.com/photo-1734092916915-d16146c0726c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHRlc3RpbW9uaWFsJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY0MjIzNDIwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
];

export function Team() {
  return (
    <section id="team" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            Наша команда
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary">
            Мастера своего дела
          </h2>
          <p className="text-lg text-foreground/70">
            Профессионалы с многолетним опытом и постоянным обучением новым техникам
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {team.map((member, index) => (
            <div
              key={index}
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
      </div>
    </section>
  );
}
