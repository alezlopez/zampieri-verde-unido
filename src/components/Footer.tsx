
import { MapPin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-green-800 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src="/lovable-uploads/be9056bb-e896-44a3-a954-c8d9a754bb4f.png" 
                alt="Colégio Zampieri" 
                className="h-12 w-12"
              />
              <div>
                <h3 className="text-xl font-bold">Colégio Zampieri</h3>
                <p className="text-green-200">Tradição em Educação</p>
              </div>
            </div>
            <p className="text-green-100">
              Mais de 40 anos transformando vidas com educação de qualidade.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Contato</h4>
            <div className="space-y-2 text-green-100">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                <span>Rua dos Acarapévas, 80<br />Balneário São Francisco<br />São Paulo - SP</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Horários</h4>
            <div className="space-y-2 text-green-100">
              <div>
                <strong>Manhã:</strong> 7h15 às 12h05
              </div>
              <div>
                <strong>Tarde:</strong> 13h05 às 17h15
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-green-700 mt-8 pt-8 text-center text-green-200">
          <p>&copy; 2024 Colégio Zampieri. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
