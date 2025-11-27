import { Button } from "./ui/button";

export function Hero() {
  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1648065460033-5c59f2ef1d97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwd29tYW4lMjBiZWF1dHl8ZW58MXx8fHwxNzY0MjIzNDE5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Elegant Beauty"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/60 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="max-w-2xl">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground">
                Премиальный салон красоты
              </p>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl tracking-tight text-primary">
                Ваша красота —
                <br />
                наша страсть
              </h1>
            </div>
            
            <p className="text-lg text-foreground/70 max-w-xl">
              Откройте для себя мир изысканной красоты в атмосфере роскоши и комфорта. 
              Профессиональный уход и безупречный сервис.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => {
                  document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6"
              >
                Записаться на прием
              </Button>
              <Button
                onClick={() => {
                  document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
                }}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-6"
              >
                Наши услуги
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
