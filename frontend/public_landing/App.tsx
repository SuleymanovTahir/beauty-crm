// /frontend/public_landing/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { ServiceDetail } from "./pages/ServiceDetail";
import { PrivacyPolicy } from "./pages/public_landing__PrivacyPolicy";
import { TermsOfUse } from "./pages/public_landing__TermsOfUse";
import { LanguageProvider } from "./LanguageContext";

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/services/:category" element={<ServiceDetail />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-use" element={<TermsOfUse />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}
