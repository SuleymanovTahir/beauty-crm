import { motion } from 'motion/react';
import { Sparkles, Award, Clock, Shield } from 'lucide-react';

interface HeroSectionProps {
  onNavigate: (section: string) => void;
}

export function HeroSection({ onNavigate }: HeroSectionProps) {
  const benefits = [
    { icon: Award, text: 'Профессионализм' },
    { icon: Clock, text: 'Запись 24/7' },
    { icon: Shield, text: 'Безопасность' },
    { icon: Sparkles, text: 'Премиум качество' },
  ];

  return (
    <section className="relative min-h-screen flex items-center bg-muted pt-24 pb-12 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-50 animate-pulse" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full mb-6 border border-border"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary">Премиум студия красоты</span>
            </motion.div>

            <h1 className="text-5xl lg:text-6xl mb-6 text-foreground">
              Красота и{' '}
              <span className="text-primary">
                Элегантность
              </span>
            </h1>

            <p className="text-xl text-foreground/70 mb-8 max-w-xl">
              Профессиональные услуги красоты и эстетической медицины. Индивидуальный подход к каждому клиенту.
            </p>

            <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-12">
              <button
                onClick={() => onNavigate('services')}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-full hover:shadow-xl transition-all transform hover:scale-105"
              >
                Наши услуги
              </button>
              <button
                onClick={() => onNavigate('contacts')}
                className="px-8 py-4 border-2 border-primary text-primary rounded-full hover:bg-muted transition-all"
              >
                Записаться
              </button>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl shadow-sm border border-border"
                >
                  <benefit.icon className="w-6 h-6 text-primary" />
                  <span className="text-xs text-foreground/70 text-center">{benefit.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYWNpYWwlMjB0cmVhdG1lbnR8ZW58MXx8fHwxNzY1NzMxMDM2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Beauty Treatment"
                className="w-full h-[600px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
            </div>

            {/* Floating card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -bottom-6 -left-6 bg-card p-6 rounded-2xl shadow-xl max-w-xs border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">500+ клиентов</p>
                  <p className="text-sm text-foreground/70">Нам доверяют</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}