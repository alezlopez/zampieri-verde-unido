import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EnrollmentBanner } from "@/components/EnrollmentBanner";

const TermosDeUso = () => {
  return (
    <div className="min-h-screen bg-white">
      <EnrollmentBanner />
      <Header activeSection="termos" />

      <main className="pt-[120px] md:pt-[140px]">
        <div className="container mx-auto px-4 py-6 md:py-12">
          <div className="max-w-4xl mx-auto">
            <div className="mb-4 md:mb-6">
              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                className="text-green-700 hover:text-green-800 hover:bg-green-50 text-sm md:text-base"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </div>

            <div className="text-center mb-6 md:mb-10">
              <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-green-100 rounded-full mb-4">
                <FileText className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-green-800 mb-3">
                Termos de Uso
              </h1>
              <p className="text-sm md:text-base text-gray-500">
                ESCOLINHA DE EDUCAÇÃO INFANTIL PINGO DE OURO LTDA — CNPJ nº 55.704.506/0001-73
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 md:p-8 lg:p-10 prose prose-green max-w-none text-sm md:text-base text-gray-700 space-y-6 md:space-y-8">

              <p>
                Seja bem-vindo ao site do Colégio Zampieri. Ao acessar e utilizar este site, você concorda com os presentes Termos de Uso. Caso não concorde com qualquer disposição aqui prevista, recomendamos que não utilize nossos serviços digitais.
              </p>

              {/* 1 */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">1. Aceitação dos Termos</h2>
              <p>
                Ao navegar, acessar ou utilizar qualquer funcionalidade disponível neste site, o usuário declara ter lido, compreendido e aceito integralmente estes Termos de Uso, bem como a nossa <a href="/privacidade" className="text-green-600 underline hover:text-green-800">Política de Privacidade</a>. O uso continuado do site após eventuais atualizações destes Termos constitui aceitação das modificações realizadas.
              </p>

              {/* 2 */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">2. Descrição do Serviço</h2>
              <p>
                O site do Colégio Zampieri tem como objetivo fornecer informações institucionais sobre a escola, seus cursos (Ensino Infantil, Ensino Fundamental e Ensino Médio), estrutura, localização, horários de funcionamento e canais de contato. O site também disponibiliza formulários de contato, matrículas e ferramentas interativas para alunos, pais e responsáveis.
              </p>

              {/* 3 */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">3. Cadastro e Dados do Usuário</h2>
              <p>
                Para utilizar determinadas funcionalidades do site, poderá ser necessário o fornecimento de dados pessoais, como nome, e-mail, telefone e série escolar. O usuário compromete-se a fornecer informações verdadeiras, completas e atualizadas. O tratamento desses dados será realizado em conformidade com a nossa Política de Privacidade e com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).
              </p>

              {/* 4 */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">4. Propriedade Intelectual</h2>
              <p>
                Todo o conteúdo presente neste site, incluindo, mas não se limitando a, textos, imagens, logotipos, vídeos, gráficos, layout e design, é de propriedade exclusiva do Colégio Zampieri ou de seus licenciadores, sendo protegido pelas leis brasileiras de direitos autorais e propriedade intelectual.
              </p>
              <p>
                É vedada a reprodução, distribuição, modificação ou utilização do conteúdo deste site, total ou parcialmente, sem autorização prévia e expressa do Colégio Zampieri, exceto para uso pessoal e não comercial.
              </p>

              {/* 5 */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">5. Responsabilidades do Usuário</h2>
              <p>Ao utilizar este site, o usuário compromete-se a:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Utilizar o site de forma ética e em conformidade com a legislação vigente</li>
                <li>Não praticar atos que possam danificar, desabilitar ou sobrecarregar o site</li>
                <li>Não tentar acessar áreas restritas ou sistemas do site sem autorização</li>
                <li>Não utilizar o site para disseminar vírus, malware ou qualquer conteúdo malicioso</li>
                <li>Não inserir informações falsas ou enganosas nos formulários disponíveis</li>
                <li>Respeitar os direitos de propriedade intelectual do Colégio Zampieri e de terceiros</li>
              </ul>

              {/* 6 */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">6. Cookies e Tecnologias de Rastreamento</h2>
              <p>
                Este site utiliza cookies e tecnologias similares para melhorar a experiência de navegação, conforme descrito em nossa Política de Privacidade. Ao continuar navegando, o usuário consente com o uso de cookies. É possível gerenciar as preferências de cookies através das configurações do navegador.
              </p>

              {/* 7 */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">7. Limitação de Responsabilidade</h2>
              <p>
                O Colégio Zampieri envidará seus melhores esforços para manter o site disponível e funcionando adequadamente. No entanto, não garantimos que o acesso ao site será ininterrupto, livre de erros ou de componentes prejudiciais.
              </p>
              <p>O Colégio Zampieri não se responsabiliza por:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Eventuais indisponibilidades temporárias do site por motivos técnicos ou de manutenção</li>
                <li>Danos decorrentes de ataques cibernéticos, vírus ou falhas de segurança causadas por terceiros</li>
                <li>Conteúdo de sites de terceiros acessados por meio de links disponíveis neste site</li>
                <li>Veracidade das informações fornecidas pelos próprios usuários</li>
              </ul>

              {/* 8 */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">8. Proteção de Dados de Crianças e Adolescentes</h2>
              <p>
                Em conformidade com o Estatuto da Criança e do Adolescente (ECA) e com a LGPD, o tratamento de dados pessoais de crianças e adolescentes será realizado com base no melhor interesse do menor, garantindo sua proteção integral. Os pais ou responsáveis legais poderão a qualquer momento solicitar informações sobre os dados coletados.
              </p>

              {/* 9 */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">9. Comunicações</h2>
              <p>
                Ao fornecer seus dados de contato, o usuário autoriza o Colégio Zampieri a enviar comunicações relacionadas aos serviços educacionais, novidades, eventos e informações institucionais por meio de e-mail, SMS, WhatsApp ou outros meios de comunicação disponíveis. O usuário poderá solicitar a interrupção dessas comunicações a qualquer momento.
              </p>

              {/* 10 */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">10. Alterações nos Termos de Uso</h2>
              <p>
                O Colégio Zampieri reserva-se o direito de alterar estes Termos de Uso a qualquer momento, sem aviso prévio. As alterações entrarão em vigor a partir da data de sua publicação neste site. Recomendamos que o usuário consulte periodicamente esta página para estar ciente de eventuais atualizações.
              </p>
              <p>
                Última atualização: <strong>março de 2026</strong>.
              </p>

              {/* 11 */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">11. Legislação Aplicável e Foro</h2>
              <p>
                Estes Termos de Uso são regidos pela legislação da República Federativa do Brasil. Fica eleito o foro da Comarca de São Paulo/SP como competente para dirimir quaisquer questões decorrentes destes Termos, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
              </p>

              {/* 12 */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">12. Contato</h2>
              <p>
                Para esclarecer quaisquer dúvidas sobre estes Termos de Uso, entre em contato conosco:
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 md:p-6 space-y-2">
                <p><strong>Responsável:</strong> Alexandre Zampieri Lopez</p>
                <p><strong>E-mail:</strong> financeiro@colegiozampieri.com.br</p>
                <p><strong>Telefone:</strong> (11) 5560-0601</p>
                <p><strong>Endereço:</strong> R. dos Acarapevas, 80 - Bal. São Francisco, São Paulo/SP, CEP: 04473-160</p>
              </div>

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermosDeUso;
