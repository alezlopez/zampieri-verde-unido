
import { Button } from "@/components/ui/button";
import { Phone, MapPin } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export const HeroSection = () => {
  const heroImages = [
    {
      src: "/lovable-uploads/c87cdeb9-2c2a-43fb-ab89-e04abe363a87.png",
      alt: "Colégio Zampieri - Fachada"
    },
    {
      src: "/lovable-uploads/50f87f48-5976-4388-802c-470163741419.png",
      alt: "Colégio Zampieri - Estrutura"
    },
    {
      src: "/lovable-uploads/bd571e68-1908-4859-81a4-bc2c0c51fa6a.png",
      alt: "Colégio Zampieri - Ambiente"
    },
    {
      src: "/lovable-uploads/0cdb27ce-d958-4905-a581-9db785144836.png",
      alt: "Colégio Zampieri - Quadra Esportiva"
    },
    {
      src: "/lovable-uploads/f3790e95-abb5-4337-902b-52d8445b9927.png",
      alt: "Colégio Zampieri - Cantina"
    },
    {
      src: "/lovable-uploads/b54ffc4f-651d-4f74-9fcf-5e39229a31e9.png",
      alt: "Colégio Zampieri - Playground"
    },
    {
      src: "/lovable-uploads/98a581a2-937b-463d-bc0d-a7393568ad43.png",
      alt: "Colégio Zampieri - Parque Infantil"
    }
  ];

  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 pt-[140px]">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
              Tradição em <span className="text-green-600">Educação</span>
            </h1>
            <p className="text-lg text-gray-700 leading-relaxed">
              Há mais de 30 anos formando cidadãos conscientes e preparados para o futuro. 
              No Colégio Zampieri, cada aluno é único e especial.
            </p>
          </div>

          <div className="relative">
            <Carousel className="w-full max-w-lg mx-auto">
              <CarouselContent>
                {heroImages.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="relative h-96 w-full">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-full object-cover rounded-lg shadow-2xl"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          </div>
        </div>
      </div>
    </section>
  );
};
