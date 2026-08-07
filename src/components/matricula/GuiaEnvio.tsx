import { useState } from "react";
import { Check, X, ChevronDown, FileDown, Lightbulb } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Ilustrações (SVG) — leves, lúdicas e sem dependência de imagens     */
/* ------------------------------------------------------------------ */

const Papel = ({
  rotate = 0,
  skew = 0,
  linhas = 4,
  x = 26,
  y = 20,
  w = 68,
  h = 84,
}: {
  rotate?: number;
  skew?: number;
  linhas?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}) => (
  <g transform={`rotate(${rotate} 60 62) skewY(${skew})`}>
    <rect x={x} y={y} width={w} height={h} rx="4" className="fill-white stroke-current" strokeWidth="2" />
    <rect x={x + 8} y={y + 9} width={w * 0.45} height="5" rx="2.5" className="fill-current opacity-40" />
    {Array.from({ length: linhas }).map((_, i) => (
      <rect
        key={i}
        x={x + 8}
        y={y + 26 + i * 11}
        width={w - 16 - (i % 2 === 1 ? 14 : 0)}
        height="4"
        rx="2"
        className="fill-current opacity-20"
      />
    ))}
    <circle cx={x + w - 16} cy={y + h - 16} r="7" className="fill-none stroke-current opacity-30" strokeWidth="2" />
  </g>
);

const Camera = ({ tilt = 0, x = 0, y = 0 }: { tilt?: number; x?: number; y?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${tilt} 60 22)`}>
    <rect x="38" y="6" width="44" height="30" rx="6" className="fill-current" />
    <circle cx="60" cy="21" r="8" className="fill-white opacity-90" />
    <circle cx="60" cy="21" r="4" className="fill-current" />
  </g>
);

const Setas = ({ tilt = false }: { tilt?: boolean }) => (
  <g className="opacity-50">
    {tilt ? (
      <path d="M56 40 L38 58" className="stroke-current" strokeWidth="2" strokeDasharray="4 4" />
    ) : (
      <>
        <path d="M50 40 L50 56" className="stroke-current" strokeWidth="2" strokeDasharray="4 4" />
        <path d="M70 40 L70 56" className="stroke-current" strokeWidth="2" strokeDasharray="4 4" />
      </>
    )}
  </g>
);

const IlustraCerta = () => (
  <svg viewBox="0 0 120 130" className="w-full h-auto text-emerald-700" aria-hidden="true">
    <Camera />
    <Setas />
    <Papel />
  </svg>
);

const IlustraAngulada = () => (
  <svg viewBox="0 0 120 130" className="w-full h-auto text-red-600" aria-hidden="true">
    <Camera tilt={-22} x={-14} y={2} />
    <Setas tilt />
    <Papel rotate={-14} skew={9} />
  </svg>
);

const IlustraInteiro = () => (
  <svg viewBox="0 0 120 130" className="w-full h-auto text-emerald-700" aria-hidden="true">
    <rect
      x="14"
      y="12"
      width="92"
      height="106"
      rx="8"
      className="fill-none stroke-current opacity-30"
      strokeWidth="2"
      strokeDasharray="6 5"
    />
    <Papel x={28} y={26} w={64} h={78} />
  </svg>
);

const IlustraCortado = () => (
  <svg viewBox="0 0 120 130" className="w-full h-auto text-red-600" aria-hidden="true">
    <rect
      x="14"
      y="12"
      width="92"
      height="106"
      rx="8"
      className="fill-none stroke-current opacity-30"
      strokeWidth="2"
      strokeDasharray="6 5"
    />
    <g clipPath="url(#recorte)">
      <Papel x={44} y={44} w={78} h={92} />
    </g>
    <defs>
      <clipPath id="recorte">
        <rect x="14" y="12" width="92" height="106" rx="8" />
      </clipPath>
    </defs>
  </svg>
);

const IlustraLuz = () => (
  <svg viewBox="0 0 120 130" className="w-full h-auto text-emerald-700" aria-hidden="true">
    <circle cx="24" cy="22" r="9" className="fill-current opacity-25" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <path
        key={a}
        d="M24 8 L24 2"
        className="stroke-current opacity-40"
        strokeWidth="2"
        strokeLinecap="round"
        transform={`rotate(${a} 24 22)`}
      />
    ))}
    <Papel x={30} y={30} w={64} h={78} />
  </svg>
);

const IlustraSombra = () => (
  <svg viewBox="0 0 120 130" className="w-full h-auto text-red-600" aria-hidden="true">
    <Papel x={30} y={30} w={64} h={78} />
    <path d="M62 30 L94 30 L94 108 L44 108 Z" className="fill-current opacity-25" />
    <path d="M30 66 L94 66" className="stroke-current opacity-0" strokeWidth="0" />
  </svg>
);

const IlustraSelfie = () => (
  <svg viewBox="0 0 120 130" className="w-full h-auto text-emerald-700" aria-hidden="true">
    <rect x="30" y="10" width="60" height="108" rx="9" className="fill-none stroke-current" strokeWidth="2" />
    <rect x="38" y="22" width="44" height="74" rx="4" className="fill-current opacity-10" />
    <circle cx="60" cy="52" r="15" className="fill-none stroke-current" strokeWidth="2" />
    <path d="M40 96 C44 76, 76 76, 80 96" className="fill-none stroke-current" strokeWidth="2" />
    <rect x="52" y="104" width="16" height="4" rx="2" className="fill-current opacity-40" />
  </svg>
);

const IlustraFoto3x4Errada = () => (
  <svg viewBox="0 0 120 130" className="w-full h-auto text-red-600" aria-hidden="true">
    <rect x="22" y="24" width="76" height="82" rx="4" className="fill-white stroke-current" strokeWidth="2" />
    <rect x="34" y="36" width="52" height="58" rx="3" className="fill-current opacity-10" />
    <circle cx="60" cy="58" r="11" className="fill-none stroke-current opacity-60" strokeWidth="2" />
    <path d="M42 94 C46 78, 74 78, 78 94" className="fill-none stroke-current opacity-60" strokeWidth="2" />
    <path d="M22 24 L98 106" className="stroke-current opacity-30" strokeWidth="2" strokeDasharray="5 5" />
  </svg>
);

/* ------------------------------------------------------------------ */

const Cartao = ({
  ok,
  titulo,
  texto,
  children,
}: {
  ok: boolean;
  titulo: string;
  texto: string;
  children: React.ReactNode;
}) => (
  <div
    className={`rounded-xl border p-3 ${
      ok ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60"
    }`}
  >
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
          ok ? "bg-emerald-600" : "bg-red-500"
        }`}
      >
        {ok ? (
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        ) : (
          <X className="h-3 w-3 text-white" strokeWidth={3} />
        )}
      </span>
      <span
        className={`text-xs font-semibold uppercase tracking-wide ${
          ok ? "text-emerald-800" : "text-red-700"
        }`}
      >
        {ok ? "Assim sim" : "Assim não"}
      </span>
    </div>
    <div className="mt-2 px-3">{children}</div>
    <p className="mt-2 text-sm font-medium text-foreground">{titulo}</p>
    <p className="text-xs text-muted-foreground leading-snug">{texto}</p>
  </div>
);

const GuiaEnvio = () => {
  const [aberto, setAberto] = useState(true);

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zampieri-cream">
            <Lightbulb className="h-4 w-4 text-zampieri-green-dark" />
          </span>
          <span>
            <span className="block font-serif text-base font-bold text-zampieri-green-dark">
              Como fotografar e enviar
            </span>
            <span className="block text-xs text-muted-foreground">
              1 minuto de leitura — evita ter que reenviar depois.
            </span>
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
            aberto ? "rotate-180" : ""
          }`}
        />
      </button>

      {aberto && (
        <div className="px-4 pb-5 space-y-5">
          <div className="flex items-start gap-3 rounded-lg bg-zampieri-cream/60 p-3">
            <FileDown className="h-5 w-5 shrink-0 text-zampieri-green-dark mt-0.5" />
            <p className="text-sm text-foreground">
              <strong>Sempre que existir, prefira o PDF original.</strong> Conta de luz baixada no
              site da Enel, CNH exportada no app CNH Digital, comprovantes do internet banking,
              histórico escolar em PDF. Documento digital original é sempre melhor que foto.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fotos de documentos em papel
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Cartao
                ok
                titulo="De cima, bem reto"
                texto="Apoie o documento numa mesa e fotografe com o celular paralelo ao papel."
              >
                <IlustraCerta />
              </Cartao>
              <Cartao
                ok={false}
                titulo="De lado, torto"
                texto="Foto angulada distorce o texto e costuma ser recusada."
              >
                <IlustraAngulada />
              </Cartao>
              <Cartao
                ok
                titulo="Documento inteiro"
                texto="As quatro bordas devem aparecer, com uma folga em volta."
              >
                <IlustraInteiro />
              </Cartao>
              <Cartao
                ok={false}
                titulo="Cortado na borda"
                texto="Se faltar um pedaço ou um carimbo, o documento não vale."
              >
                <IlustraCortado />
              </Cartao>
              <Cartao
                ok
                titulo="Boa luz, sem brilho"
                texto="Luz natural, sem flash. Todo o texto precisa estar legível."
              >
                <IlustraLuz />
              </Cartao>
              <Cartao
                ok={false}
                titulo="Sombra ou reflexo"
                texto="A sua própria sombra ou o reflexo do flash escondem informações."
              >
                <IlustraSombra />
              </Cartao>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Foto 3x4 do aluno
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Cartao
                ok
                titulo="Pode ser pelo celular"
                texto="Rosto centralizado, de frente, fundo claro e sem boné ou óculos escuros. Não precisa ir a um estúdio."
              >
                <IlustraSelfie />
              </Cartao>
              <Cartao
                ok={false}
                titulo="Foto de foto"
                texto="Não precisa escanear uma 3x4 impressa — fotografar o papel deixa a imagem sem nitidez."
              >
                <IlustraFoto3x4Errada />
              </Cartao>
            </div>
          </div>

          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {[
              "Frente e verso: envie os dois quando o documento tiver informações atrás.",
              "Arquivos em PDF, JPG ou PNG, com até 10 MB cada.",
              "Confira se dá para ler nomes, números e datas antes de enviar.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GuiaEnvio;
