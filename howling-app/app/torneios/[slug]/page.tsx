import { notFound } from "next/navigation";
import Link from "next/link";
import { getTournamentBySlug, tournaments } from "@/data/tournaments";

export function generateStaticParams() {
  return tournaments.map((t) => ({ slug: t.slug }));
}

const typeLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly Cup",
  monthly: "Liga Mensal",
  sponsored: "Patrocinado",
};

const modeLabels: Record<string, string> = {
  ARAM: "ARAM",
  ARAM_MAYHEM: "ARAM Mayhem",
  ARENA: "Arena",
  BRAWL: "Brawl",
  SR: "Summoner's Rift",
};

export default function TournamentDetailPage({ params }: { params: { slug: string } }) {
  const t = getTournamentBySlug(params.slug);
  if (!t) notFound();

  const fillPercent = Math.round((t.registeredTeams / t.maxTeams) * 100);
  const isLive = t.status === "live";
  const date = new Date(t.startsAt);
  const dateStr = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    weekday: "long",
  });
  const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="container-custom py-10">
      <Link
        href="/torneios"
        className="inline-block text-text-soft hover:text-accent text-sm mb-6 transition-colors"
      >
        ← Todos os torneios
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
        {/* Main */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded font-mono uppercase tracking-wider bg-accent/15 text-accent">
              {typeLabels[t.type]}
            </span>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded font-mono uppercase tracking-wider bg-rank-master/12 text-rank-master">
              {modeLabels[t.mode]}
            </span>
            {isLive && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded font-mono uppercase tracking-wider bg-danger/15 text-danger inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-danger pulse-dot"></span>
                Ao vivo
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">{t.name}</h1>
          <p className="text-text-soft text-base md:text-lg mb-8">{t.description}</p>

          {/* Bracket placeholder */}
          <div className="bg-bg-elevated border border-border rounded-2xl p-7 mb-6">
            <div className="font-mono text-[11px] text-text-dim uppercase tracking-widest mb-4">
              Bracket
            </div>
            <div className="bg-bg-card border border-border-soft rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-3 opacity-50">🏆</div>
              <div className="font-semibold mb-1">
                {isLive ? "Bracket em andamento" : "Bracket gerado quando começar"}
              </div>
              <div className="text-sm text-text-soft max-w-md">
                {isLive
                  ? "Aqui você vai acompanhar as partidas em tempo real, com link de cada match."
                  : "O chaveamento é gerado automaticamente quando o torneio iniciar."}
              </div>
            </div>
          </div>

          {/* Regras */}
          <div className="bg-bg-elevated border border-border rounded-2xl p-7">
            <div className="font-mono text-[11px] text-text-dim uppercase tracking-widest mb-4">
              Regras
            </div>
            <div className="space-y-4 text-sm">
              <Rule
                label="Formato"
                value={
                  t.format === "single_elimination"
                    ? "Eliminação simples (BO1)"
                    : t.format === "double_elimination"
                    ? "Dupla eliminação (BO1, final BO3)"
                    : "Pontos corridos (todos contra todos)"
                }
              />
              <Rule label="Tamanho do time" value="5 jogadores" />
              <Rule
                label="Multiplicador LP"
                value={`×${t.lpMultiplier} (afeta seu ranking nacional)`}
              />
              <Rule label="Anti-smurf" value="Conta deve ter elo Riot mínimo de Bronze" />
              <Rule
                label="Comunicação"
                value="Lobbies abertos pelo Discord oficial"
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="bg-bg-elevated border border-border rounded-2xl p-6 sticky top-24">
            <div className="font-mono text-[11px] text-text-dim uppercase tracking-widest mb-4">
              Inscrição
            </div>

            <div className="bg-bg-card border border-border rounded-xl p-4 mb-4 text-center">
              <div className="text-[11px] uppercase tracking-wider text-text-dim font-medium mb-1">
                Premiação total
              </div>
              <div className="text-3xl font-extrabold text-gold tracking-tight">
                {t.prizePool === 0 ? "Grátis" : `R$ ${t.prizePool.toLocaleString("pt-BR")}`}
              </div>
              {t.prizePool > 0 && (
                <div className="text-xs text-text-soft mt-1">
                  Inscrição R$ {t.entryFee.toLocaleString("pt-BR")}/time
                </div>
              )}
            </div>

            <div className="space-y-3 mb-5 text-sm">
              <Info label="Início" value={`${dateStr}, ${timeStr}`} />
              <Info label="Times" value={`${t.registeredTeams}/${t.maxTeams}`} />
            </div>

            {/* Progress bar */}
            <div className="mb-5">
              <div className="flex justify-between text-[11px] text-text-soft mb-1.5">
                <span>Vagas preenchidas</span>
                <span className="font-mono">{fillPercent}%</span>
              </div>
              <div className="h-2 bg-bg-card rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent-deep rounded-full"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>

            <button className="btn-primary w-full mb-2.5">Inscrever meu time</button>
            <button className="btn-secondary w-full">Compartilhar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 py-3 border-b border-border-soft last:border-0">
      <div className="text-text-soft text-sm">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-text-soft text-[13px]">{label}</span>
      <span className="font-medium text-[13px]">{value}</span>
    </div>
  );
}
