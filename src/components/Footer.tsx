import logoZampieri from "@/assets/logo-zampieri.png";

export const Footer = () => {
  const escola = [
    { label: "Nossa história", id: "historia" },
    { label: "Estrutura", id: "estrutura" },
    { label: "Depoimentos", id: "depoimentos" },
    { label: "Contato", id: "localizacao" },
  ];
  const ensino = [
    { label: "Educação Infantil", id: "cursos" },
    { label: "Ensino Fundamental", id: "cursos" },
    { label: "Ensino Médio", id: "cursos" },
  ];

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <footer className="bg-zampieri-footer text-white">
      <div className="flex">
        <div className="h-[3px] flex-1 bg-zampieri-green-light" />
        <div className="h-[3px] flex-1 bg-white" />
        <div className="h-[3px] flex-1 bg-zampieri-wine" />
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logoZampieri} alt="Colégio Zampieri" className="h-12 w-12" />
              <div>
                <h3 className="font-serif text-xl font-bold">Colégio Zampieri</h3>
                <p className="text-xs text-zampieri-gold-light">Tradição em Educação · Desde 1980</p>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Formando gerações com excelência acadêmica, valores humanistas e o acolhimento de uma escola família há mais de 46 anos.
            </p>
          </div>

          <div>
            <h4 className="font-serif text-base font-bold text-zampieri-gold-light mb-4">A Escola</h4>
            <ul className="space-y-2 text-sm text-white/75">
              {escola.map((l) => (
                <li key={l.label}>
                  <button onClick={() => scrollTo(l.id)} className="hover:text-zampieri-gold-light transition-colors">{l.label}</button>
                </li>
              ))}
              <li><a href="https://espera.colegiozampieri.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-zampieri-gold-light transition-colors">Matrículas 2027</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-base font-bold text-zampieri-gold-light mb-4">Ensino</h4>
            <ul className="space-y-2 text-sm text-white/75">
              {ensino.map((l) => (
                <li key={l.label}>
                  <button onClick={() => scrollTo(l.id)} className="hover:text-zampieri-gold-light transition-colors">{l.label}</button>
                </li>
              ))}
              <li><a href="https://espera.colegiozampieri.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-zampieri-gold-light transition-colors">Portal do Aluno</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <p>© 2026 Colégio Zampieri · Todos os direitos reservados</p>
          <div className="flex gap-5">
            <a href="/privacidade" className="hover:text-zampieri-gold-light transition-colors">Política de privacidade</a>
            <a href="/termos" className="hover:text-zampieri-gold-light transition-colors">Termos de uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
