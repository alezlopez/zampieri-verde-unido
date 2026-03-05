import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EnrollmentBanner } from "@/components/EnrollmentBanner";

const Privacidade = () => {
  return (
    <div className="min-h-screen bg-white">
      <EnrollmentBanner />
      <Header activeSection="privacidade" />

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
                <Shield className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-green-800 mb-3">
                Política de Privacidade
              </h1>
              <p className="text-sm md:text-base text-gray-500">
                ESCOLINHA DE EDUCAÇÃO INFANTIL PINGO DE OURO LTDA — CNPJ nº 55.704.506/0001-73
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 md:p-8 lg:p-10 prose prose-green max-w-none text-sm md:text-base text-gray-700 space-y-6 md:space-y-8">

              <p>
                Este site é mantido e operado por ESCOLINHA DE EDUCAÇÃO INFANTIL PINGO DE OURO LTDA, CNPJ nº 55.704.506/0001-73. Nós coletamos e utilizamos alguns dados pessoais que pertencem àqueles que utilizam nosso site. Ao fazê-lo, agimos na qualidade de controlador desses dados e estamos sujeitos às disposições da Lei Federal n. 13.709/2018 (Lei Geral de Proteção de Dados Pessoais - LGPD).
              </p>

              <p>Nós cuidamos da proteção de seus dados pessoais e, por isso, disponibilizamos esta política de privacidade, que contém informações importantes sobre:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Quem deve utilizar nosso site</li>
                <li>Quais dados coletamos e o que fazemos com eles</li>
                <li>Seus direitos em relação aos seus dados pessoais</li>
                <li>Como entrar em contato conosco</li>
              </ul>

              {/* Seção 1 */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">1. Dados que coletamos e motivos da coleta</h2>

              <h3 className="text-base md:text-lg font-semibold text-green-700">1.1 Dados pessoais coletados</h3>
              <p>Nós coletamos os seguintes dados pessoais de nossos usuários:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Endereço IP</li>
                <li>Login, quando aplicado</li>
                <li>Ações efetuadas no Portal</li>
                <li>Ferramentas, funcionalidades e conteúdos acessados</li>
                <li>Datas e horários de cada ação e de acesso ao Portal</li>
                <li>Informações sobre o dispositivo utilizado, como versão de sistema operacional, navegador, e demais dados possíveis de serem coletados</li>
                <li>Session ID, quando disponível; ID de máquina, número de PIN e toda e qualquer informação necessária para a sua adequada identificação e autenticação</li>
              </ol>

              <p>
                Além disso, usamos cookies quando você visita nosso portal para armazenar suas preferências pessoais quando navega na Internet. O Colégio compromete-se a colaborar com as autoridades.
              </p>

              <p>A coleta destes dados ocorre quando VOCÊ insere as suas informações voluntariamente no Portal, via cadastro, bem como na interação com as ferramentas existentes de coleta de dados de navegação, frequência de acesso ou quando VOCÊ realiza contato direto por meio dos canais disponíveis via Portal.</p>

              <p>Estes dados são coletados com as seguintes finalidades:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Identificá-lo e autenticá-lo no seu acesso ao Portal</li>
                <li>Responder às eventuais dúvidas e solicitações</li>
                <li>Cumprir ordem legal ou judicial</li>
                <li>Constituir, defender ou exercer regularmente direitos em âmbito judicial ou administrativo</li>
                <li>Garantir a sua segurança e a dos administradores</li>
                <li>Manter atualizados os cadastros dos seus dados para fins de contato</li>
                <li>Promover os serviços do Colégio Zampieri e informar sobre novidades</li>
                <li>Gerar análises e estudos educacionais e sociais</li>
                <li>Prestar informações aos órgãos reguladores e aos responsáveis legais de nossos alunos</li>
                <li>Aperfeiçoar o uso e a experiência interativa durante a sua navegação no Portal</li>
                <li>Alimentar o banco de dados do Colégio Zampieri</li>
              </ol>

              <p>A base de dados formada por meio da coleta de dados no Portal é de propriedade e responsabilidade do Colégio Zampieri e não será compartilhada, vendida, cedida, transferida, informada ou alugada a terceiros.</p>

              {/* Seção 2 - Dados sensíveis */}
              <h3 className="text-base md:text-lg font-semibold text-green-700">1.2 Dados sensíveis</h3>
              <p>
                Não serão coletados dados sensíveis de nossos usuários, assim entendidos aqueles definidos nos arts. 11 e seguintes da Lei de Proteção de Dados Pessoais. Assim, não haverá coleta de dados sobre origem racial ou étnica, convicção religiosa, opinião política, filiação a sindicato ou a organização de caráter religioso, filosófico ou político, dado referente à saúde ou à vida sexual, dado genético ou biométrico, quando vinculado a uma pessoa natural.
              </p>

              {/* Seção 3 - Crianças e adolescentes */}
              <h3 className="text-base md:text-lg font-semibold text-green-700">1.3 Dados de crianças e adolescentes</h3>
              <p>Nós coletamos os seguintes dados de crianças e adolescentes:</p>
              <ol className="list-[lower-alpha] pl-5 space-y-1">
                <li>Endereço IP</li>
                <li>Login, quando aplicado</li>
                <li>Ações efetuadas no Portal</li>
                <li>Ferramentas, funcionalidades e conteúdos acessados</li>
                <li>Datas e horários de cada ação e de acesso ao Portal</li>
                <li>Informações sobre o dispositivo utilizado</li>
                <li>Session ID, quando disponível; ID de máquina, número de PIN e informações para identificação e autenticação</li>
              </ol>
              <p>O tratamento de dados de crianças e adolescentes é realizado com base no melhor interesse da criança ou do adolescente.</p>

              {/* Seção 4 - Cookies */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">2. Cookies</h2>
              <p>
                Cookies são pequenos arquivos de texto baixados automaticamente em seu dispositivo quando você acessa e navega por um site. Eles servem, basicamente, para que seja possível identificar dispositivos, atividades e preferências de usuários.
              </p>
              <p>
                Os cookies do site são aqueles enviados ao computador ou dispositivo do usuário e administrador exclusivamente pelo site. As informações coletadas por meio destes cookies são utilizadas para melhorar e personalizar a experiência do usuário.
              </p>
              <p>
                O usuário poderá se opor ao registro de cookies pelo site, bastando que desative esta opção no seu próprio navegador. A desativação dos cookies, no entanto, pode afetar a disponibilidade de algumas ferramentas e funcionalidades do site.
              </p>

              {/* Seção 5 - Compartilhamento */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">3. Compartilhamento de dados pessoais com terceiros</h2>
              <p>
                O Colégio Zampieri não compartilha com terceiros, sem autorização expressa, dados sensíveis, como dados de saúde e frequência de seus alunos, exceto com os seus responsáveis legais. Informações que não permitem a identificação pessoal, especialmente dados navegacionais, poderão ser compartilhadas com terceiros para a emissão de relatórios.
              </p>
              <p>
                Os dados obtidos somente poderão ser acessados por profissionais devidamente autorizados pelo Colégio, respeitando os princípios de proporcionalidade e necessidade, relevância para os objetivos do Colégio, bem como o compromisso de confidencialidade e preservação da privacidade dos dados pessoais.
              </p>

              {/* Seção 6 - Armazenamento */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">4. Por quanto tempo seus dados pessoais serão armazenados</h2>
              <p>
                Os dados pessoais coletados pelo site são armazenados e utilizados por período de tempo que corresponda ao necessário para atingir as finalidades elencadas neste documento. Uma vez expirados os períodos de armazenamento dos dados pessoais, eles são removidos de nossas bases de dados ou anonimizados.
              </p>

              {/* Seção 7 - Bases legais */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">5. Bases legais para o tratamento de dados pessoais</h2>
              <p>
                Cada operação de tratamento de dados pessoais precisa ter um fundamento jurídico, ou seja, uma base legal, que nada mais é que uma justificativa que a autorize, prevista na Lei Geral de Proteção de Dados Pessoais. Todas as nossas atividades de tratamento de dados pessoais possuem uma base legal que as fundamenta.
              </p>

              {/* Seção 8 - Direitos */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">6. Direitos do usuário</h2>
              <p>O usuário do site possui os seguintes direitos, conferidos pela Lei de Proteção de Dados Pessoais:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Confirmação da existência de tratamento</li>
                <li>Acesso aos dados</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos</li>
                <li>Portabilidade dos dados a outro fornecedor de serviço ou produto</li>
                <li>Eliminação dos dados pessoais tratados com o consentimento do titular</li>
                <li>Informação das entidades públicas e privadas com as quais o controlador realizou uso compartilhado de dados</li>
                <li>Informação sobre a possibilidade de não fornecer consentimento e sobre as consequências da negativa</li>
                <li>Revogação do consentimento</li>
              </ul>
              <p>
                É importante destacar que, nos termos da LGPD, não existe um direito de eliminação de dados tratados com fundamento em bases legais distintas do consentimento, a menos que os dados sejam desnecessários, excessivos ou tratados em desconformidade com o previsto na lei.
              </p>

              {/* Seção 9 - Medidas de segurança */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">7. Medidas de segurança no tratamento de dados pessoais</h2>
              <p>
                Empregamos medidas técnicas e organizativas aptas a proteger os dados pessoais de acessos não autorizados e de situações de destruição, perda, extravio ou alteração desses dados. Entre as medidas de segurança adotadas, destacamos o armazenamento de dados criptografados.
              </p>
              <p>
                Caso ocorra qualquer tipo de incidente de segurança que possa gerar risco ou dano relevante para qualquer de nossos usuários, comunicaremos os afetados e a Autoridade Nacional de Proteção de Dados acerca do ocorrido.
              </p>

              {/* Seção 10 - Reclamação */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">8. Reclamação a uma autoridade de controle</h2>
              <p>
                Sem prejuízo de qualquer outra via de recurso administrativo ou judicial, os titulares de dados pessoais que se sentirem, de qualquer forma, lesados, podem apresentar reclamação à Autoridade Nacional de Proteção de Dados.
              </p>

              {/* Seção 11 - Alterações */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">9. Alterações nesta política</h2>
              <p>
                A presente versão desta Política de Privacidade foi atualizada pela última vez em: <strong>06/10/2021</strong>.
              </p>
              <p>
                Reservamo-nos o direito de modificar, a qualquer momento, as presentes normas, especialmente para adaptá-las às eventuais alterações feitas em nosso site. Sempre que houver uma modificação, nossos usuários serão notificados acerca da mudança.
              </p>

              {/* Seção 12 - Contato */}
              <h2 className="text-lg md:text-xl font-bold text-green-800 !mt-8">10. Como entrar em contato conosco</h2>
              <p>
                Para esclarecer quaisquer dúvidas sobre esta Política de Privacidade ou sobre os dados pessoais que tratamos, entre em contato com nosso Encarregado de Proteção de Dados Pessoais:
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

export default Privacidade;
