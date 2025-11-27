import { Instagram, Facebook, MessageCircle } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="text-xl mb-4">Colour Studio</h3>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Премиальный салон красоты в центре города. Создаем безупречные образы с 2015 года.
            </p>
          </div>

          <div>
            <h4 className="mb-4">Контакты</h4>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <p>ул. Примерная, д. 10</p>
              <p>Москва, 123456</p>
              <p>
                <a href="tel:+79991234567" className="hover:text-primary-foreground transition-colors">
                  +7 (999) 123-45-67
                </a>
              </p>
              <p>
                <a href="mailto:info@colourstudio.ru" className="hover:text-primary-foreground transition-colors">
                  info@colourstudio.ru
                </a>
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-4">Часы работы</h4>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <p>Понедельник - Воскресенье</p>
              <p>10:00 - 21:00</p>
              <p className="mt-4">Без выходных</p>
            </div>
          </div>

          <div>
            <h4 className="mb-4">Социальные сети</h4>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/70">
            © {currentYear} Colour Studio. Все права защищены.
          </p>
          <div className="flex gap-6 text-sm text-primary-foreground/70">
            <a href="#" className="hover:text-primary-foreground transition-colors">
              Политика конфиденциальности
            </a>
            <a href="#" className="hover:text-primary-foreground transition-colors">
              Условия использования
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
