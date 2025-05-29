import { Button } from "@/components/ui/button";
import { Phone, MapPin } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export const HeroSection = () => {
  const handleCallClick = () => {
    window.open("tel:5560-1473", "_self");
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("Olá! Gostaria de mais informações sobre o Colégio Zampieri.");
    window.open(`https://wa.me/5511956601473?text=${message}`, "_blank");
  };

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
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={handleCallClick}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
              >
                <Phone className="h-5 w-5" />
                Ligar Agora
              </Button>
              <Button 
                onClick={handleWhatsAppClick}
                variant="outline" 
                className="border-green-600 text-green-600 hover:bg-green-50 px-6 py-3 rounded-lg"
              >
                WhatsApp
              </Button>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">São Paulo - SP</span>
            </div>
          </div>

          <div className="relative">
            <Carousel className="w-full max-w-lg mx-auto">
              <CarouselContent>
                {heroImages.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="relative">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-auto rounded-lg shadow-2xl"
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
