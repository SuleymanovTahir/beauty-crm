import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { Services } from "./components/Services";
import { Portfolio } from "./components/Portfolio";
import { Team } from "./components/Team";
import { Testimonials } from "./components/Testimonials";
import { Gallery } from "./components/Gallery";
import { FAQ } from "./components/FAQ";
import { Booking } from "./components/Booking";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Portfolio />
        <Team />
        <Testimonials />
        <Gallery />
        <FAQ />
        <Booking />
      </main>
      <Footer />
    </div>
  );
}
