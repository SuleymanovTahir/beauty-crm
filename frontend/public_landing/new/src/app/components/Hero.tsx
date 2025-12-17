import { Button } from "./ui/button";
import { Calendar } from "lucide-react";

export function Hero() {
  return (
    <section id="home" className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-muted/20">
        <img
          src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&h=1080&fit=crop&auto=format"
          alt="Elegant Beauty"
          className="w-full h-full object-cover object-center"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/40" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 w-full flex-grow flex flex-col justify-center">
        <div className="w-full max-w-2xl pt-20 sm:pt-28 lg:pt-32 space-y-6 sm:space-y-8">
          <div className="space-y-4 sm:space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-primary animate-fade-in-up leading-tight">
              Откройте мир
              <br />
              <span className="text-primary/80">
                профессиональной красоты
              </span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-[oklch(0.145_0_0)] opacity-80 animate-fade-in-up leading-relaxed font-medium">
              Discover the world of exquisite beauty in an atmosphere of luxury and comfort.
            </p>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 animate-fade-in-up max-w-md">
            <Button
              onClick={() => {
                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hero-button-primary px-4 sm:px-6 py-4 sm:py-5 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              size="lg"
            >
              <Calendar className="w-4 h-4" />
              <span className="text-sm sm:text-base">Записаться</span>
            </Button>
            <Button
              onClick={() => {
                document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
              }}
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-4 sm:px-6 py-4 sm:py-5 shadow-md hover:shadow-lg transition-all"
              size="lg"
            >
              <span className="text-sm sm:text-base">Услуги</span>
            </Button>
          </div>

          <div className="flex flex-wrap justify-start gap-6 sm:gap-8 lg:gap-12 pt-4 sm:pt-6 border-t border-border/30 animate-fade-in">
            <div className="flex flex-col items-start">
              <span className="text-2xl sm:text-3xl text-primary mb-1">10+</span>
              <span className="text-xs sm:text-sm text-muted-foreground">лет опыта</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-2xl sm:text-3xl text-primary mb-1">5000+</span>
              <span className="text-xs sm:text-sm text-muted-foreground">довольных клиентов</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-2xl sm:text-3xl text-primary mb-1">100%</span>
              <span className="text-xs sm:text-sm text-muted-foreground">гарантия качества</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
