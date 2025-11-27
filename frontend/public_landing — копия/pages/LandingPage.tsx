import { Header } from "../components/public_landing/NewDesign/Header";
import "../styles/public_landing_globals.css";
import "../public_landing.css";
import { Hero } from "../components/public_landing/NewDesign/Hero";
import { FeaturesSection } from "../components/public_landing/FeaturesSection";
import { Services } from "../components/public_landing/NewDesign/Services";
import { Portfolio } from "../components/public_landing/NewDesign/Portfolio";
import { Testimonials } from "../components/public_landing/NewDesign/Testimonials";
import { MastersSection } from "../components/public_landing/MastersSection";
import { BookingSection } from "../components/public_landing/BookingSection";
import { Gallery } from "../components/public_landing/NewDesign/Gallery";
import { FAQ } from "../components/public_landing/NewDesign/FAQ";
import { MapSection } from "../components/public_landing/MapSection";
import { Footer } from "../components/public_landing/Footer";

import { useState, useEffect } from "react";
import { apiClient } from "../../src/api/client";

export function LandingPage() {
    const [salonInfo, setSalonInfo] = useState<any>({});
    const [services, setServices] = useState<any[]>([]);

    useEffect(() => {
        // Load salon info
        apiClient.getSalonInfo()
            .then(setSalonInfo)
            .catch(err => console.error('Error loading salon info:', err));

        // Load services
        apiClient.getPublicServices()
            .then(setServices)
            .catch(err => console.error('Error loading services:', err));
    }, []);

    return (
        <div className="min-h-screen bg-[#f5f3f0]">
            <Header />
            <main>
                <Hero />
                <FeaturesSection />
                <div id="services-section">
                    <Services />
                </div>
                <Portfolio />
                <MastersSection />
                <Testimonials />
                <BookingSection services={services} />
                <Gallery />
                <FAQ />
                <div id="map-section">
                    <MapSection salonInfo={salonInfo} />
                </div>
            </main>
            <Footer salonInfo={salonInfo} />
        </div>
    );
}
