import { motion } from 'motion/react';
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Send } from 'lucide-react';

export function ContactsSection() {
  const contacts = [
    {
      icon: Phone,
      title: 'Телефон',
      info: '+7 (XXX) XXX-XX-XX',
      link: 'tel:+7XXXXXXXXXX',
    },
    {
      icon: Mail,
      title: 'Email',
      info: 'info@mjediamant.com',
      link: 'mailto:info@mjediamant.com',
    },
    {
      icon: MapPin,
      title: 'Адрес',
      info: 'г. Москва, ул. Примерная, 123',
      link: '#',
    },
    {
      icon: Clock,
      title: 'Часы работы',
      info: 'Ежедневно 9:00 - 21:00',
      link: '#',
    },
  ];

  const socialLinks = [
    { icon: Instagram, label: 'Instagram', link: '#' },
    { icon: Facebook, label: 'Facebook', link: '#' },
    { icon: Send, label: 'Telegram', link: '#' },
  ];

  return (
    <section className="py-20 bg-muted" id="contacts">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl mb-4 text-foreground">
            Свяжитесь{' '}
            <span className="text-primary">
              с нами
            </span>
          </h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Мы всегда рады ответить на ваши вопросы
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="space-y-6 mb-8">
              {contacts.map((contact, index) => {
                const Icon = contact.icon;
                return (
                  <motion.a
                    key={index}
                    href={contact.link}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-4 p-6 bg-card rounded-2xl shadow-sm hover:shadow-lg transition-all group border border-border"
                  >
                    <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center group-hover:bg-primary transition-all flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {contact.title}
                      </h3>
                      <p className="text-foreground/70">{contact.info}</p>
                    </div>
                  </motion.a>
                );
              })}
            </div>

            {/* Social Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="bg-card rounded-2xl p-6 shadow-sm border border-border"
            >
              <h3 className="font-semibold text-foreground mb-4">
                Мы в социальных сетях
              </h3>
              <div className="flex gap-3">
                {socialLinks.map((social, index) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={index}
                      href={social.link}
                      className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center hover:bg-primary transition-all group"
                      aria-label={social.label}
                    >
                      <Icon className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
                    </a>
                  );
                })}
              </div>
            </motion.div>

            {/* Map placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-6 bg-card rounded-2xl overflow-hidden shadow-sm h-64 border border-border"
            >
              <img
                src="https://images.unsplash.com/photo-1626383137804-ff908d2753a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBzYWxvbiUyMGludGVyaW9yfGVufDF8fHx8MTc2NTcyNzE3OHww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Наш салон"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
              <h3 className="text-2xl font-semibold text-foreground mb-6">
                Записаться на консультацию
              </h3>
              <form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    Ваше имя
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Введите ваше имя"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="+7 (XXX) XXX-XX-XX"
                  />
                </div>

                <div>
                  <label htmlFor="service" className="block text-sm font-medium text-foreground mb-2">
                    Услуга
                  </label>
                  <select
                    id="service"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  >
                    <option>Выберите услугу</option>
                    <option>Чистка лица</option>
                    <option>Массаж</option>
                    <option>Маникюр</option>
                    <option>Педикюр</option>
                    <option>Окрашивание волос</option>
                    <option>Другое</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                    Комментарий
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                    placeholder="Дополнительная информация"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-primary text-primary-foreground rounded-xl hover:shadow-xl transition-all transform hover:scale-105"
                >
                  Отправить заявку
                </button>

                <p className="text-sm text-muted-foreground text-center">
                  Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}