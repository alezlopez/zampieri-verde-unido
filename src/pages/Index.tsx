import { useState, useEffect } from "react";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { HistorySection } from "@/components/HistorySection";
import { SistemaArcoSection } from "@/components/SistemaArcoSection";
import { CoursesSection } from "@/components/CoursesSection";
import { DiferenciaisSection } from "@/components/DiferenciaisSection";
import { ScheduleSection } from "@/components/ScheduleSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { StructureSection } from "@/components/StructureSection";
import { LocationSection } from "@/components/LocationSection";
import { MatriculasCTASection } from "@/components/MatriculasCTASection";
import { InstagramSection } from "@/components/InstagramSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  const [activeSection, setActiveSection] = useState("inicio");

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["inicio", "historia", "cursos", "horarios", "depoimentos", "estrutura", "localizacao"];
      const scrollPosition = window.scrollY + 120;
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el && scrollPosition >= el.offsetTop && scrollPosition < el.offsetTop + el.offsetHeight) {
          setActiveSection(section);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Header activeSection={activeSection} />
      <main>
        <HeroSection />
        <HistorySection />
        <SistemaArcoSection />
        <CoursesSection />
        <DiferenciaisSection />
        <ScheduleSection />
        <TestimonialsSection />
        <StructureSection />
        <LocationSection />
        <MatriculasCTASection />
        <InstagramSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
