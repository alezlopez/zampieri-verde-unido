
import { MapPin, Clock, Heart } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-900 via-green-900 to-gray-900 text-white py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-2 md:space-x-3 mb-4">
              <img 
                src="/lovable-uploads/be9056bb-e896-44a3-a954-c8d9a754bb4f.png" 
                alt="Colégio Zampieri" 
                className="h-10 w-10 md:h-12 md:w-12"
              />
              <div>
                <h3 className="text-lg md:text-xl font-bold">Colégio Zampieri</h3>
                <p className="text-green-300 flex items-center gap-1 justify-center md:justify-start text-sm md:text-base">
                  <Heart className="h-3 w-3 md:h-4 md:w-4" />
                  Tradição em Educação
                </p>
              </div>
            </div>
            <p className="text-gray-300 text-sm md:text-base">
              Mais de 40 anos transformando vidas com educação de qualidade.
            </p>
          </div>
          
          <div className="text-center md:text-left">
            <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-green-300">Contato</h4>
            <div className="space-y-2 text-gray-300 text-sm md:text-base">
              <div className="flex items-start gap-2 justify-center md:justify-start">
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0 text-green-400" />
                <span>Rua dos Acarapévas, 80<br />Balneário São Francisco<br />São Paulo - SP</span>
              </div>
            </div>
          </div>
          
          <div className="text-center md:text-left">
            <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-green-300 flex items-center gap-2 justify-center md:justify-start">
              <Clock className="h-4 w-4" />
              Horários
            </h4>
            <div className="space-y-2 text-gray-300 text-sm md:text-base">
              <div className="bg-white/5 p-2 md:p-3 rounded-lg">
                <div className="font-semibold text-yellow-400">Manhã:</div>
                <div>7h15 às 12h05</div>
              </div>
              <div className="bg-white/5 p-2 md:p-3 rounded-lg">
                <div className="font-semibold text-blue-400">Tarde:</div>
                <div>13h05 às 17h15</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-6 md:mt-8 pt-6 md:pt-8 text-center text-gray-400 text-xs md:text-base">
          <p>&copy; 2024 Colégio Zampieri. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
