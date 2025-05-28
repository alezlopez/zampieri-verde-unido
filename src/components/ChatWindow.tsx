
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  nome: string;
  whatsapp: string;
  email: string;
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: Date;
}

interface ChatWindowProps {
  userData: UserData;
}

export const ChatWindow = ({ userData }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: `Olá ${userData.nome.split(" ")[0]}! Como posso ajudá-lo hoje?`,
      sender: "agent",
      timestamp: new Date(),
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setIsLoading(true);

    try {
      console.log("Enviando mensagem para webhook:", newMessage.trim());
      
      const response = await fetch("https://n8n.colegiozampieri.com/webhook/chatSite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "message",
          message: newMessage.trim(),
          userData: userData,
          timestamp: new Date().toISOString(),
        }),
      });

      console.log("Status da resposta:", response.status);
      console.log("Headers da resposta:", response.headers.get('content-type'));

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        let responseData;
        let replyText = "";

        if (contentType && contentType.includes('application/json')) {
          // Resposta é JSON
          responseData = await response.json();
          console.log("Resposta JSON completa:", responseData);
          
          // Primeiro tenta extrair de messages[0].content
          if (responseData.messages && responseData.messages.length > 0) {
            replyText = responseData.messages[0].content;
            console.log("Mensagem extraída de messages[0].content:", replyText);
          } else {
            // Fallback para outros campos possíveis
            replyText = responseData.output || responseData.reply || responseData.message || "Resposta recebida";
            console.log("Mensagem extraída de campos alternativos:", replyText);
          }
        } else {
          // Resposta é texto simples
          replyText = await response.text();
          console.log("Resposta texto:", replyText);
        }

        if (replyText && replyText.trim()) {
          const agentMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: replyText.trim(),
            sender: "agent",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, agentMessage]);
        } else {
          console.log("Resposta vazia ou inválida");
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "Desculpe, não consegui processar sua mensagem. Tente novamente.",
            sender: "agent",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } else {
        console.log("Erro HTTP:", response.status);
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.sender === "user"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <p className="text-sm">{message.text}</p>
              <span className="text-xs opacity-70">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Área de input */}
      <div className="border-t p-4">
        <form onSubmit={sendMessage} className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={isLoading || !newMessage.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
