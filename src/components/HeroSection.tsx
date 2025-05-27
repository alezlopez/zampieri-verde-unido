
import { useState, useEffect } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Placeholder images for the slideshow - these will be replaced with actual school photos
  const slides = [
    "photo-1649972904349-6e44c42644a7",
    "photo-1581091226825-a6a2a5aee158", 
    "photo-1519389950473-47ba0277781c",
    "photo-1506744038136-46273834b3fb",
    "photo-1501854140801-50d01698950b"
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
                  src={`https://images.unsplash.com/${slide}?auto=format&fit=crop&w=1920&h=1080&q=80`}
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
