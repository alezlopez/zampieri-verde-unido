import { ArrowLeft, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EnrollmentBanner } from "@/components/EnrollmentBanner";

const Rematricula2027Regulamento = () => {
  return (
    <div className="min-h-screen bg-background">
      <EnrollmentBanner />
      <Header />

      <main className="pt-[120px] md:pt-[140px]">
        <div className="container mx-auto px-4 py-6 md:py-12">
          <div className="max-w-4xl mx-auto">
            <div className="mb-4 md:mb-6">
              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                className="text-zampieri-green-dark hover:text-zampieri-gold hover:bg-zampieri-cream text-sm md:text-base"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </div>

            <div className="text-center mb-6 md:mb-10">
              <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-zampieri-cream rounded-full mb-4">
                <Scale className="h-6 w-6 md:h-8 md:w-8 text-zampieri-gold" />
              </div>
              <p className="text-sm md:text-base text-zampieri-gold font-medium tracking-wider uppercase mb-2">
                Colégio Zampieri · Tradição em Educação · Desde 1980
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-zampieri-green-dark mb-3">
                Regulamento da Promoção "Rematrícula 2027 — Números da Sorte"
              </h1>
            </div>

            <div className="bg-card rounded-xl shadow-lg border border-border p-4 md:p-8 lg:p-10 text-sm md:text-base text-foreground space-y-6 md:space-y-8">
              <p className="text-muted-foreground">
                A promoção descrita neste regulamento é de caráter comercial, vinculada exclusivamente à rematrícula de alunos já matriculados no Colégio Zampieri para o ano letivo de 2027. A participação implica a aceitação integral das condições abaixo.
              </p>

              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-bold text-zampieri-green-dark">1. Identificação da Promoção</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Empresa promotora:</strong> Colégio Zampieri (Escolinha de Educação Infantil Pingo de Ouro LTDA — CNPJ nº 55.704.506/0001-73).</li>
                  <li><strong>Endereço:</strong> Rua dos Acarapévas, 80, Balneário São Francisco, São Paulo - SP.</li>
                  <li><strong>Modalidade:</strong> promoção comercial vinculada à rematrícula de alunos já matriculados, com contemplação por sorteio apurado com base nos resultados da Loteria Federal do Brasil.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-bold text-zampieri-green-dark">2. Objetivo</h2>
                <p>
                  Incentivar a rematrícula antecipada dos alunos do Colégio Zampieri para o ano letivo de 2027, por meio de desconto progressivo decrescente conforme a fase de adesão e da distribuição de "números da sorte" que concorrem a prêmios sorteados com base em extrações da Loteria Federal.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-bold text-zampieri-green-dark">3. Período e Fases de Participação</h2>
                <p>
                  A promoção é dividida em 4 (quatro) fases consecutivas, cada uma com desconto e prêmio próprios, conforme tabela abaixo:
                </p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zampieri-cream text-zampieri-green-dark">
                      <tr>
                        <th className="p-3 font-semibold">Fase</th>
                        <th className="p-3 font-semibold">Período</th>
                        <th className="p-3 font-semibold">Desconto</th>
                        <th className="p-3 font-semibold">Números da sorte</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="p-3 font-medium">1ª</td>
                        <td className="p-3">24/08 a 09/09/2026</td>
                        <td className="p-3">50% sobre a mensalidade vigente (2026)</td>
                        <td className="p-3">6 números por rematrícula</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">2ª</td>
                        <td className="p-3">10/09 a 30/09/2026</td>
                        <td className="p-3">40% sobre a mensalidade vigente (2026)</td>
                        <td className="p-3">3 números por rematrícula</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">3ª</td>
                        <td className="p-3">01/10 a 14/10/2026</td>
                        <td className="p-3">30% sobre a mensalidade vigente (2026)</td>
                        <td className="p-3">2 números por rematrícula</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">4ª</td>
                        <td className="p-3">15/10 a 28/10/2026</td>
                        <td className="p-3">20% sobre a mensalidade vigente (2026)</td>
                        <td className="p-3">1 número por rematrícula</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  Quem realizar a rematrícula em uma fase concorre ao prêmio daquela fase e, cumulativamente, aos sorteios de todas as fases posteriores, com os números da sorte já recebidos. Os números da sorte não expiram entre fases.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-bold text-zampieri-green-dark">4. Condições de Participação</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Participam exclusivamente famílias de alunos regularmente matriculados no Colégio Zampieri em 2026, mediante rematrícula formalizada dentro do período de alguma das 4 fases.</li>
                  <li>A rematrícula deve ser realizada 100% online, pelo site <a href="https://colegiozampieri.com.br/rematricula2027" className="text-zampieri-gold underline hover:text-zampieri-green-dark">colegiozampieri.com.br/rematricula2027</a>.</li>
                  <li>Cada aluno rematriculado gera o número de números da sorte correspondente à fase em que a rematrícula foi concluída (ver tabela da Seção 3).</li>
                  <li>Não há necessidade de compra ou pagamento adicional para participar do sorteio — a participação decorre exclusivamente da rematrícula dentro do período vigente.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-bold text-zampieri-green-dark">5. Formação dos Números da Sorte</h2>
                <p>
                  Cada número da sorte distribuído possui 4 (quatro) algarismos, gerado aleatoriamente pelo sistema do Colégio Zampieri no ato da confirmação da rematrícula, dentro do intervalo de 0000 a 9999.
                </p>
                <p>
                  Os números da sorte distribuídos, seus respectivos titulares e a fase de emissão são registrados em base de dados própria, disponível para consulta e auditoria em <a href="https://colegiozampieri.com.br/numerosdasorte" className="text-zampieri-gold underline hover:text-zampieri-green-dark">colegiozampieri.com.br/numerosdasorte</a>.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-bold text-zampieri-green-dark">6. Apuração do Número de Referência</h2>
                <p>
                  Em cada uma das 4 datas de apuração (Seção 3), o número de referência da fase será formado a partir dos dois primeiros prêmios da extração da Loteria Federal do Brasil daquela data, da seguinte forma:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Os 2 (dois) últimos algarismos do 1º (primeiro) prêmio, seguidos dos 2 (dois) últimos algarismos do 2º (segundo) prêmio, formando um número de referência de 4 algarismos.</li>
                </ul>
                <div className="bg-zampieri-cream border border-zampieri-gold/40 rounded-lg p-4 md:p-6 space-y-2">
                  <p className="font-medium text-zampieri-green-dark">Exemplo — Extração hipotética da Loteria Federal:</p>
                  <p>1º prêmio: 52.796 · 2º prêmio: 89.714</p>
                  <p>Últimos 2 algarismos do 1º prêmio: 96 · Últimos 2 algarismos do 2º prêmio: 14</p>
                  <p className="font-semibold text-zampieri-green-dark">Número de referência da fase: 9614</p>
                </div>
                <p>
                  Caso não seja realizada extração da Loteria Federal na data prevista, será utilizado o resultado da extração imediatamente posterior, mantendo-se inalteradas as demais condições.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-bold text-zampieri-green-dark">7. Critério de Aproximação (número de referência não distribuído)</h2>
                <p>
                  Caso o número de referência apurado (Seção 6) não corresponda a nenhum número da sorte efetivamente distribuído até a data da apuração, será contemplado o número da sorte distribuído com a menor diferença absoluta em relação ao número de referência.
                </p>
                <div className="bg-zampieri-cream border border-zampieri-gold/40 rounded-lg p-4 md:p-6 space-y-2">
                  <p className="font-medium text-zampieri-green-dark">Exemplo:</p>
                  <p>Número de referência apurado = 9614, e este número não foi distribuído a nenhum participante.</p>
                  <p>Números da sorte distribuídos mais próximos: "9611" (diferença 3) e "9617" (diferença 3). Como ambos têm a mesma diferença absoluta, aplica-se o critério de desempate abaixo.</p>
                </div>
                <p>
                  <strong>Critério de desempate:</strong> caso dois ou mais números da sorte distribuídos apresentem a mesma diferença absoluta em relação ao número de referência, será contemplado aquele com o maior algarismo na comparação da direita para a esquerda (unidade, depois dezena, depois centena, depois milhar).
                </p>
                <div className="bg-zampieri-cream border border-zampieri-gold/40 rounded-lg p-4 md:p-6 space-y-2">
                  <p className="font-medium text-zampieri-green-dark">Exemplo de desempate:</p>
                  <p>Número de referência = 9614. Números distribuídos "9612" (diferença 2) e "9616" (diferença 2) empatam.</p>
                  <p>Comparando da direita para a esquerda: unidade 6 &gt; 2 → contemplado "9616".</p>
                </div>
                <p>
                  Este critério é aplicado de forma automática e verificável, com base na relação de números da sorte efetivamente distribuídos e registrada em ata de apuração.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-bold text-zampieri-green-dark">8. Prêmios</h2>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zampieri-cream text-zampieri-green-dark">
                      <tr>
                        <th className="p-3 font-semibold">Fase</th>
                        <th className="p-3 font-semibold">Prêmio</th>
                        <th className="p-3 font-semibold">Apuração (Loteria Federal)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="p-3 font-medium">1ª</td>
                        <td className="p-3">Bolsa de estudos 100% para o ano letivo de 2027</td>
                        <td className="p-3">Extração de 10/09/2026</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">2ª</td>
                        <td className="p-3">Kit de material didático SAE + Maker para 2027</td>
                        <td className="p-3">Extração de 01/10/2026</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">3ª</td>
                        <td className="p-3">Kit completo de uniforme escolar para 2027</td>
                        <td className="p-3">Extração de 15/10/2026</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">4ª</td>
                        <td className="p-3">Vale-excursão de fim de ano (Wet'n Wild, Cidade da Criança ou Parque da Mônica — data a definir)</td>
                        <td className="p-3">Extração de 29/10/2026</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-bold text-zampieri-green-dark">9. Entrega dos Prêmios</h2>
                <p>
                  O(s) contemplado(s) de cada fase será(ão) comunicado(s) por telefone, e-mail e/ou WhatsApp cadastrados, em até 5 (cinco) dias úteis após a apuração. O prêmio será entregue ou aplicado (no caso da bolsa de estudos, como desconto integral na mensalidade de 2027) em prazo a ser definido em comunicado específico ao contemplado.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-bold text-zampieri-green-dark">10. Disposições Gerais</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>A participação nesta promoção implica a aceitação integral deste regulamento.</li>
                  <li>Os dados pessoais coletados serão utilizados exclusivamente para fins de operação desta promoção, nos termos da Lei Geral de Proteção de Dados (LGPD).</li>
                  <li>O Colégio Zampieri reserva-se o direito de alterar datas de apuração em caso de não realização da extração da Loteria Federal na data prevista, conforme Seção 6.</li>
                  <li>Dúvidas e casos omissos serão resolvidos pela direção do Colégio Zampieri, ouvida assessoria especializada quando aplicável.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-bold text-zampieri-green-dark">11. Foro</h2>
                <p>
                  Fica eleito o foro da Comarca de São Paulo - SP para dirimir quaisquer questões oriundas do presente regulamento.
                </p>
              </section>

              <p className="text-xs text-muted-foreground pt-4 border-t border-border">
                Última atualização: agosto de 2026.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Rematricula2027Regulamento;
