
import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { HistorySection } from "@/components/HistorySection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { StructureSection } from "@/components/StructureSection";
import { CoursesSection } from "@/components/CoursesSection";
import { ScheduleSection } from "@/components/ScheduleSection";
import { LocationSection } from "@/components/LocationSection";
import { Footer } from "@/components/Footer";
import { EnrollmentBanner } from "@/components/EnrollmentBanner";

const Index = () => {
  const [activeSection, setActiveSection] = useState("inicio");

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["inicio", "historia", "depoimentos", "estrutura", "cursos", "horarios", "localizacao"];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop;
          const height = element.offsetHeight;
          
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <EnrollmentBanner />
      <Header activeSection={activeSection} />
      <main>
        <HeroSection />
        <HistorySection />
        <TestimonialsSection />
        <StructureSection />
        <CoursesSection />
        <ScheduleSection />
        <LocationSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
