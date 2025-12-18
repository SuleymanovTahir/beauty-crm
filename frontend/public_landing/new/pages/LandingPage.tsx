//new/pages/LandingPage.tsx
import { Suspense, lazy } from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { CookieConsent } from '../components/CookieConsent';
import { Footer } from '../components/Footer';
import '../../styles/theme.css';
import '../../styles/index.css';

// Lazy load components for better performance
const About = lazy(() => import('../components/About').then(m => ({ default: m.About })));
const Services = lazy(() => import('../components/Services').then(m => ({ default: m.Services })));
const Portfolio = lazy(() => import('../components/Portfolio').then(m => ({ default: m.Portfolio })));
const TeamSection = lazy(() => import('../components/TeamSection').then(m => ({ default: m.TeamSection })));
const ReviewsSection = lazy(() => import('../components/ReviewsSection').then(m => ({ default: m.ReviewsSection })));
const Gallery = lazy(() => import('../components/Gallery').then(m => ({ default: m.Gallery })));
const FAQ = lazy(() => import('../components/FAQ').then(m => ({ default: m.FAQ })));
const MapSection = lazy(() => import('../components/MapSection').then(m => ({ default: m.MapSection })));
const BookingSection = lazy(() => import('../components/BookingSection').then(m => ({ default: m.BookingSection })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />

        <Suspense fallback={<LoadingSpinner />}>
          <About />
        </Suspense>

        <Suspense fallback={<LoadingSpinner />}>
          <div id="services">
            <Services />
          </div>
        </Suspense>

        <Suspense fallback={<LoadingSpinner />}>
          <div id="portfolio">
            <Portfolio />
          </div>
        </Suspense>

        <Suspense fallback={<LoadingSpinner />}>
          <div id="team">
            <TeamSection />
          </div>
        </Suspense>

        <Suspense fallback={<LoadingSpinner />}>
          <div id="testimonials">
            <ReviewsSection />
          </div>
        </Suspense>

        <Suspense fallback={<LoadingSpinner />}>
          <div id="gallery">
            <Gallery />
          </div>
        </Suspense>

        <Suspense fallback={<LoadingSpinner />}>
          <div id="faq">
            <FAQ />
          </div>
        </Suspense>

        <Suspense fallback={<LoadingSpinner />}>
          <div id="map-section">
            <MapSection />
          </div>
        </Suspense>

        <Suspense fallback={<LoadingSpinner />}>
          <div id="booking">
            <BookingSection />
          </div>
        </Suspense>
      </main>

      <Footer />
      <CookieConsent />
    </div>
  );
}
