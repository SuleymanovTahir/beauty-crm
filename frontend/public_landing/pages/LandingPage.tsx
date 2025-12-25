//new/pages/LandingPage.tsx
import { Suspense, lazy } from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { CookieConsent } from '../components/CookieConsent';
import { Footer } from '../components/Footer';
import '../styles/css/index.css';

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

        <div id="services">
          <Suspense fallback={<LoadingSpinner />}>
            <Services />
          </Suspense>
        </div>

        <div id="portfolio">
          <Suspense fallback={<LoadingSpinner />}>
            <Portfolio />
          </Suspense>
        </div>

        <div id="team">
          <Suspense fallback={<LoadingSpinner />}>
            <TeamSection />
          </Suspense>
        </div>

        <div id="testimonials">
          <Suspense fallback={<LoadingSpinner />}>
            <ReviewsSection />
          </Suspense>
        </div>

        <div id="gallery">
          <Suspense fallback={<LoadingSpinner />}>
            <Gallery />
          </Suspense>
        </div>

        <div id="faq">
          <Suspense fallback={<LoadingSpinner />}>
            <FAQ />
          </Suspense>
        </div>

        <div id="map-section">
          <Suspense fallback={<LoadingSpinner />}>
            <MapSection />
          </Suspense>
        </div>

        <div id="booking">
          <Suspense fallback={<LoadingSpinner />}>
            <BookingSection />
          </Suspense>
        </div>
      </main>

      <Footer />
      <CookieConsent />
    </div>
  );
}
