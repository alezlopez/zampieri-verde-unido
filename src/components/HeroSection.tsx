
import { useState, useEffect } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Real photos of Colégio Zampieri
  const slides = [
    "/lovable-uploads/50f87f48-5976-4388-802c-470163741419.png",
    "/lovable-uploads/eac25f65-1ceb-4632-8920-01eb9365ce27.png", 
    "/lovable-uploads/df233acd-a555-44ec-a57b-0bc85614836f.png",
    "/lovable-uploads/bd571e68-1908-4859-81a4-bc2c0c51fa6a.png",
    "/lovable-uploads/c87cdeb9-2c2a-43fb-ab89-e04abe363a87.png"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section id="inicio" className="relative h-screen overflow-hidden">
      <Carousel className="w-full h-full">
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={index} className="relative h-screen">
              <div className="relative w-full h-full">
                <img
                  src={slide}
                  alt={`Colégio Zampieri - Slide ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-green-900/40"></div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>

      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="text-center text-white">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Colégio Zampieri
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
            Mais de 40 anos transformando vidas com educação de qualidade
          </p>
          
          <div className="flex justify-center space-x-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
