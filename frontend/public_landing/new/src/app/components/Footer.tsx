export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <p className="text-xs sm:text-sm text-primary-foreground/70">
            © {currentYear} Beauty Salon. Все права защищены.
          </p>
          <div className="flex flex-wrap gap-4 sm:gap-6 lg:gap-10 text-xs sm:text-sm text-primary-foreground/70 justify-center">
            <a href="/privacy-policy" className="hover:text-primary-foreground transition-colors">
              Политика конфиденциальности
            </a>
            <a href="/terms" className="hover:text-primary-foreground transition-colors">
              Условия использования
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
