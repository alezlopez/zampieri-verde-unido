
import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactForm } from "./ContactForm";
import { ChatWindow } from "./ChatWindow";

interface UserData {
  nome: string;
  whatsapp: string;
  email: string;
}

export const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  const handleFormSubmit = (data: UserData) => {
    setUserData(data);
  };

  const handleClose = () => {
    setIsOpen(false);
    setUserData(null);
  };

  return (
    <>
      {/* Botão flutuante */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-2xl rounded-full px-6 py-4 transition-all duration-300 animate-pulse"
        >
          <MessageCircle className="h-6 w-6 mr-2" />
          Estamos on-line. Fale agora!
        </Button>
      </div>

      {/* Janela do chat */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-white rounded-lg shadow-2xl border border-gray-200">
          {/* Header */}
          <div className="bg-green-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-semibold">Colégio Zampieri</h3>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-green-700 p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Conteúdo */}
          <div className="h-96">
            {!userData ? (
              <ContactForm onSubmit={handleFormSubmit} />
            ) : (
              <ChatWindow userData={userData} />
            )}
          </div>
        </div>
      )}
    </>
  );
};
