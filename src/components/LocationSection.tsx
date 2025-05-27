
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export const LocationSection = () => {
  const address = "Rua dos Acarapévas, 80, Balneário São Francisco, São Paulo - SP";
  
  return (
    <section id="localizacao" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-green-800">
            Localização
          </h2>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <MapPin className="h-5 w-5" />
                Nosso Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-gray-700">{address}</p>
            </CardContent>
          </Card>
          
          <div className="w-full h-96 rounded-lg overflow-hidden shadow-lg">
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
