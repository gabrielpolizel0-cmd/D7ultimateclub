import MatchRow from "@/components/MatchRow";
import LPChart from "@/components/LPChart";
import { currentPlayer, recentMatches, lpHistory } from "@/data/players";

export default function PerfilPage() {
  const initials = currentPlayer.displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("");

  const tierName = currentPlayer.rank.tier === "PLATINUM" ? "PLATINA" : currentPlayer.rank.tier;

  return (
    <div className="container-custom py-12">
      <div className="mb-10">
        <div className="font-mono text-[11px] text-text-dim uppercase tracking-widest mb-2">
          Meu perfil
        </div>
        <div className="flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-rank-diamond to-rank-master flex items-center justify-center font-extrabold text-3xl border-2 border-rank-plat"
            style={{ boxShadow: "0 0 24px rgba(95, 201, 201, 0.35)" }}
          >
            {initials}
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {currentPlayer.displayName}
            </h1>
            <div className="font-mono text-sm text-text-soft mt-1">
              {currentPlayer.riotId} · {currentPlayer.city}, {currentPlayer.state}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        {/* Sidebar */}
        <div className="space-y-5">
          {/* Rank */}
          <div className="bg-bg-elevated border border-border rounded-2xl p-7">
            <div className="font-mono text-[11px] text-text-dim uppercase tracking-widest mb-4">
              Ranking ARAM
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-5 text-center">
              <div className="text-3xl font-extrabold text-rank-plat tracking-tight">
                {tierName} {currentPlayer.rank.division}
              </div>
              <div className="font-mono text-base text-text-soft mt-2">
                {currentPlayer.rank.lp.toLocaleString("pt-BR")} LP
              </div>
              <div className="text-sm text-text-soft mt-3">
                #
                <strong className="text-accent font-mono">
                  {currentPlayer.rank.position.toLocaleString("pt-BR")}
                </strong>{" "}
                de{" "}
                <strong className="text-accent font-mono">
                  {currentPlayer.rank.totalPlayers.toLocaleString("pt-BR")}
                </strong>
              </div>
              <div className="mt-2 text-xs text-text-dim">
                Top{" "}
                {Math.round((currentPlayer.rank.position / currentPlayer.rank.totalPlayers) * 100)}%
                nacional
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-bg-elevated border border-border rounded-2xl p-7">
            <div className="font-mono text-[11px] text-text-dim uppercase tracking-widest mb-4">
              Estatísticas
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat
                label="Vitórias"
                value={<span className="text-accent">{currentPlayer.stats.wins}</span>}
              />
              <Stat
                label="Derrotas"
                value={<span className="text-danger">{currentPlayer.stats.losses}</span>}
              />
              <Stat
                label="Winrate"
                value={<span className="text-accent">{currentPlayer.stats.winrate}%</span>}
              />
              <Stat label="KDA médio" value={currentPlayer.stats.avgKda.toFixed(2)} />
              <Stat
                label="MVPs"
                value={<span className="text-gold">{currentPlayer.stats.mvps}</span>}
              />
              <Stat label="Total partidas" value={currentPlayer.stats.totalMatches} />
            </div>
          </div>

          {/* Premium CTA */}
          <div className="bg-gradient-to-br from-rank-master/20 to-rank-diamond/10 border border-rank-master/30 rounded-2xl p-6">
            <div className="font-mono text-[11px] text-rank-master uppercase tracking-widest mb-2 font-semibold">
              ⭐ Premium
            </div>
            <div className="text-base font-bold mb-2">Desbloqueie estatísticas avançadas</div>
            <div className="text-[13px] text-text-soft mb-4">
              Histórico ilimitado, winrate por campeão, comparação com amigos e torneios exclusivos.
            </div>
            <button className="btn-primary w-full">Ver Premium · R$ 19,90/mês</button>
          </div>
        </div>

        {/* Main */}
        <div className="space-y-6">
          {/* LP Chart */}
          <div className="bg-bg-elevated border border-border rounded-2xl p-7">
            <div className="flex justify-between items-center mb-5">
              <div>
                <div className="text-lg font-bold">Evolução de LP</div>
                <div className="text-xs text-text-soft mt-0.5">Últimas 20 partidas</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-2xl font-bold text-accent">
                  +{lpHistory[lpHistory.length - 1] - lpHistory[0]}
                </div>
                <div className="text-xs text-text-soft mt-0.5">no período</div>
              </div>
            </div>
            <div className="h-56 bg-bg-card border border-border-soft rounded-lg p-4">
              <LPChart data={lpHistory} />
            </div>
          </div>

          {/* Recent matches */}
          <div className="bg-bg-elevated border border-border rounded-2xl p-7">
            <div className="text-lg font-bold mb-5">Partidas recentes</div>
            <div className="flex flex-col gap-1.5">
              {recentMatches.map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </div>
            <div className="mt-5 text-center">
              <button className="text-accent text-sm font-medium hover:underline">
                Ver mais partidas (premium) →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border-soft rounded-lg p-3">
      <div className="text-[10px] text-text-dim uppercase tracking-wider font-medium mb-1">
        {label}
      </div>
      <div className="text-lg font-bold font-mono">{value}</div>
    </div>
  );
}
