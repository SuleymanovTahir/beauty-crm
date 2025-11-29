import { Header } from "../components/Header";
import "../../../styles/globals.css";
import { Hero } from "../components/Hero";
import { About } from "../components/About";
import { Services } from "../components/Services";
import { Portfolio } from "../components/Portfolio";
import { Testimonials } from "../components/Testimonials";
import { Gallery } from "../components/Gallery";
import { FAQ } from "../components/FAQ";
import { Footer } from "../components/Footer";
import { MastersSection } from "../MastersSection";
import { MapSection } from "../MapSection";
import { BookingSection } from "../BookingSection";

import { useState, useEffect } from "react";
import { apiClient } from "../../../src/api/client";
import { useLanguage } from "../LanguageContext";

export function LandingPage() {
    const { language } = useLanguage();
    const [salonInfo, setSalonInfo] = useState<any>({});
    const [services, setServices] = useState<any[]>([]);

    useEffect(() => {
        fetch(`/api/public/salon-info?language=${language}`)
            .then(res => res.json())
            .then(setSalonInfo)
            .catch(err => console.error('Error loading salon info:', err));

        apiClient.getPublicServices()
            .then(setServices)
            .catch(err => console.error('Error loading services:', err));
    }, [language]);

    return (
        <div className="min-h-screen bg-background">
            <Header salonInfo={salonInfo} />
            <main>
                <Hero />
                <About />
                <div id="services">
                    <Services />
                </div>
                <div id="portfolio">
                    <Portfolio />
                </div>
                <div id="team">
                    <MastersSection />
                </div>
                <div id="testimonials">
                    <Testimonials />
                </div>
                <div id="booking">
                    <BookingSection services={services} />
                </div>
                <div id="gallery">
                    <Gallery />
                </div>
                <div id="faq">
                    <FAQ />
                </div>
                <div id="map-section">
                    <MapSection salonInfo={salonInfo} />
                </div>
            </main>
            <Footer salonInfo={salonInfo} />
        </div>
    );
}
