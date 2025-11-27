import { Header } from "../components/public_landing/Header";
import "../styles/public_landing_globals.css";
import "../public_landing.css";
import { HeroSection } from "../components/public_landing/HeroSection";
import { FeaturesSection } from "../components/public_landing/FeaturesSection";
import { ServicesSection } from "../components/public_landing/ServicesSection";
import { PortfolioSection } from "../components/public_landing/PortfolioSection";
import { MastersSection } from "../components/public_landing/MastersSection";
import { PricingSection } from "../components/public_landing/PricingSection";
import { BookingSection } from "../components/public_landing/BookingSection";
import { GallerySection } from "../components/public_landing/GallerySection";
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
            <Header salonInfo={salonInfo} />
            <main>
                <HeroSection />
                <FeaturesSection />
                <div id="services-section">
                    <ServicesSection services={services} />
                </div>
                <PortfolioSection />
                <MastersSection />
                <div id="pricing-section">
                    <PricingSection services={services} />
                </div>
                <BookingSection services={services} />
                <GallerySection />
                <div id="map-section">
                    <MapSection salonInfo={salonInfo} />
                </div>
            </main>
            <Footer salonInfo={salonInfo} />
        </div>
    );
}
