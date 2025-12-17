import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-serif">M</span>
              </div>
              <div>
                <h3 className="font-serif text-lg">M Je Diamant</h3>
                <p className="text-xs text-primary">Beauty Studio</p>
              </div>
            </div>
            <p className="text-background/70 text-sm">
              Ваша красота - наша миссия
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4">Услуги</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><a href="#services" className="hover:text-primary transition-colors">Лицо</a></li>
              <li><a href="#services" className="hover:text-primary transition-colors">Тело</a></li>
              <li><a href="#services" className="hover:text-primary transition-colors">Волосы</a></li>
              <li><a href="#services" className="hover:text-primary transition-colors">Ногти</a></li>
              <li><a href="#services" className="hover:text-primary transition-colors">Косметология</a></li>
            </ul>
          </div>

          {/* Information */}
          <div>
            <h4 className="font-semibold mb-4">Информация</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><a href="#portfolio" className="hover:text-primary transition-colors">Портфолио</a></li>
              <li><a href="#team" className="hover:text-primary transition-colors">Наша команда</a></li>
              <li><a href="#reviews" className="hover:text-primary transition-colors">Отзывы</a></li>
              <li><a href="#faq" className="hover:text-primary transition-colors">FAQ</a></li>
              <li><a href="#contacts" className="hover:text-primary transition-colors">Контакты</a></li>
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h4 className="font-semibold mb-4">Контакты</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li>г. Москва</li>
              <li>ул. Примерная, 123</li>
              <li>+7 (XXX) XXX-XX-XX</li>
              <li>info@mjediamant.com</li>
              <li>Ежедневно 9:00 - 21:00</li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-background/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-background/70">
              © 2024 M Je Diamant Beauty Studio. Все права защищены.
            </p>
            <p className="text-sm text-background/70 flex items-center gap-2">
              Создано с <Heart className="w-4 h-4 text-primary fill-primary" /> для вашей красоты
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}