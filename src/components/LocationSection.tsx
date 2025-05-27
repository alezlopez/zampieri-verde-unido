
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation } from "lucide-react";

export const LocationSection = () => {
  const address = "Rua dos Acarapévas, 80, Balneário São Francisco, São Paulo - SP";
  
  return (
    <section id="localizacao" className="py-16 bg-gradient-to-br from-green-600 via-green-700 to-green-800">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Navigation className="h-12 w-12 text-white mx-auto mb-4" />
            <h2 className="text-4xl font-bold text-white">
              Localização
            </h2>
          </div>
          
          <Card className="mb-8 bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MapPin className="h-5 w-5 text-green-300" />
                Nosso Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-green-100">{address}</p>
            </CardContent>
          </Card>
          
          <div className="w-full h-96 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3658.123456789!2d-46.123456!3d-23.456789!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDI3JzI0LjQiUyA0NsKwMDcnMjQuNCJX!5e0!3m2!1spt-BR!2sbr!4v1234567890123!5m2!1spt-BR!2sbr"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização do Colégio Zampieri"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
};
