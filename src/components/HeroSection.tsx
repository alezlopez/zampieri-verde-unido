import { useState, useEffect } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import type { CarouselApi } from "@/components/ui/carousel";

export const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [api, setApi] = useState<CarouselApi>();

  // Real photos of Colégio Zampieri
  const slides = [
    "/lovable-uploads/50f87f48-5976-4388-802c-470163741419.png",
    "/lovable-uploads/eac25f65-1ceb-4632-8920-01eb9365ce27.png",
    "/lovable-uploads/df233acd-a555-44ec-a57b-0bc85614836f.png",
    "/lovable-uploads/bd571e68-1908-4859-81a4-bc2c0c51fa6a.png",
    "/lovable-uploads/c87cdeb9-2c2a-43fb-ab89-e04abe363a87.png"
  ];

  useEffect(() => {
    if (!api) {
      return;
    }
    const timer = setInterval(() => {
      api.scrollNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [api]);
  useEffect(() => {
    if (!api) {
      return;
    }
    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap());
    });
  }, [api]);
  const scrollToSlide = (index: number) => {
    if (api) {
      api.scrollTo(index);
    }
  };

  return (
    <section id="inicio" className="relative h-screen overflow-hidden">
      <Carousel className="w-full h-full" setApi={setApi}>
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={index} className="relative h-screen">
              <div className="relative w-full h-full">
                <img 
                  src={slide} 
                  alt={`Colégio Zampieri - Slide ${index + 1}`} 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/70"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"></div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4 bg-white/20 border-white/30 hover:bg-white/30 backdrop-blur-sm" />
        <CarouselNext className="right-4 bg-white/20 border-white/30 hover:bg-white/30 backdrop-blur-sm" />
      </Carousel>

      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="text-center text-white max-w-4xl px-4">
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-bold mb-4 bg-gradient-to-r from-white via-green-100 to-white bg-clip-text text-transparent tracking-tight">
              Colégio Zampieri
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-green-400 to-green-600 mx-auto mb-6 rounded-full"></div>
          </div>
          
          <p className="text-xl md:text-3xl mb-12 font-light leading-relaxed text-green-50 max-w-3xl mx-auto">
            Há mais de <span className="font-semibold text-green-300">40 anos</span> transformando vidas com 
            <span className="font-semibold text-white"> educação de qualidade</span>
          </p>
          
          <div className="flex justify-center space-x-3 mb-8">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToSlide(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentSlide 
                    ? "w-12 h-3 bg-gradient-to-r from-green-400 to-green-600 shadow-lg shadow-green-500/50" 
                    : "w-3 h-3 bg-white/60 hover:bg-white/80"
                }`}
              />
            ))}
          </div>

          <div className="animate-bounce">
            <div className="w-6 h-10 border-2 border-white/50 rounded-full mx-auto flex justify-center">
              <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
