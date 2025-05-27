
import { MapPin, Clock, Heart } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-900 via-green-900 to-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-3 mb-4">
              <img 
                src="/lovable-uploads/be9056bb-e896-44a3-a954-c8d9a754bb4f.png" 
                alt="Colégio Zampieri" 
                className="h-12 w-12"
              />
              <div>
                <h3 className="text-xl font-bold">Colégio Zampieri</h3>
                <p className="text-green-300 flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  Tradição em Educação
                </p>
              </div>
            </div>
            <p className="text-gray-300">
              Mais de 40 anos transformando vidas com educação de qualidade.
            </p>
          </div>
          
          <div className="text-center md:text-left">
            <h4 className="text-lg font-semibold mb-4 text-green-300">Contato</h4>
            <div className="space-y-2 text-gray-300">
              <div className="flex items-start gap-2 justify-center md:justify-start">
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0 text-green-400" />
                <span>Rua dos Acarapévas, 80<br />Balneário São Francisco<br />São Paulo - SP</span>
              </div>
            </div>
          </div>
          
          <div className="text-center md:text-left">
            <h4 className="text-lg font-semibold mb-4 text-green-300 flex items-center gap-2 justify-center md:justify-start">
              <Clock className="h-4 w-4" />
              Horários
            </h4>
            <div className="space-y-2 text-gray-300">
              <div className="bg-white/5 p-3 rounded-lg">
                <div className="font-semibold text-yellow-400">Manhã:</div>
                <div>7h15 às 12h05</div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg">
                <div className="font-semibold text-blue-400">Tarde:</div>
                <div>13h05 às 17h15</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Colégio Zampieri. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
