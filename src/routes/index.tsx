import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import AboutSection from "@/components/home/AboutSection";
import ContactSection from "@/components/home/ContactSection";
import SurahListSection from "@/components/home/SurahListSection";
import { PrayerNowHome } from "@/components/templates/PrayerNowHome";
import { readStoredAppTemplate, type AppTemplateId, DEFAULT_APP_TEMPLATE } from "@/lib/appTemplates";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [template, setTemplate] = useState<AppTemplateId>(DEFAULT_APP_TEMPLATE);
  useEffect(() => {
    setTemplate(readStoredAppTemplate());
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'app:template') setTemplate(readStoredAppTemplate());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (template === 'prayer-now') {
    return (
      <PrayerNowHome />
    );
  }

  return (
    <main className="min-h-screen bg-[#030a06]">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <SurahListSection />
      <AboutSection />
      <ContactSection />
      <Footer />
    </main>
  );
}
