import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";

const navigation = [
  { name: "О нас", href: "#about" },
  { name: "Услуги", href: "#services" },
  { name: "Портфолио", href: "#portfolio" },
  { name: "Команда", href: "#team" },
  { name: "Отзывы", href: "#testimonials" },
  { name: "Галерея", href: "#gallery" },
  { name: "FAQ", href: "#faq" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur-sm shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0">
            <span className="text-2xl tracking-tight text-primary">Colour Studio</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm text-foreground/80 hover:text-foreground transition-colors duration-200"
              >
                {item.name}
              </a>
            ))}
            <Button
              onClick={() => {
                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Записаться
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden pb-6 space-y-4">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="block text-sm text-foreground/80 hover:text-foreground transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
            <Button
              onClick={() => {
                setIsMobileMenuOpen(false);
                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Записаться
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
