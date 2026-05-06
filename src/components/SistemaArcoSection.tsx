export const SistemaArcoSection = () => {
  return (
    <section className="py-16 md:py-24 bg-zampieri-green-dark text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-[0.2em] text-zampieri-gold-light font-bold">Nossos sistemas de ensino</span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold mt-3">Sistema Arco de Ensino</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 backdrop-blur-sm border border-zampieri-gold/30 rounded-2xl p-7 md:p-8 hover:border-zampieri-gold transition-colors">
              <div className="h-14 w-14 rounded-full bg-zampieri-gold text-white flex items-center justify-center text-2xl mb-5">📘</div>
              <h3 className="font-serif text-2xl font-bold mb-3 text-zampieri-gold-light">SAE Digital</h3>
              <p className="text-white/85 leading-relaxed">
                Com o sistema SAE Digital, garantimos um material didático dinâmico, crítico e alinhado com a realidade dos nossos alunos, preparando-os para os desafios do mundo contemporâneo.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-zampieri-gold/30 rounded-2xl p-7 md:p-8 hover:border-zampieri-gold transition-colors">
              <div className="h-14 w-14 rounded-full bg-zampieri-wine text-white flex items-center justify-center text-2xl mb-5">⛵</div>
              <h3 className="font-serif text-2xl font-bold mb-3 text-zampieri-gold-light">Nave a Vela</h3>
              <p className="text-white/85 leading-relaxed">
                Com o sistema Nave a Vela, levamos a educação maker para dentro da sala de aula. Os alunos aprendem criando — desenvolvendo projetos reais, resolvendo problemas com as próprias mãos e exercitando o pensamento crítico, a colaboração e a criatividade. Uma metodologia ativa que transforma o aluno em protagonista do seu aprendizado.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
