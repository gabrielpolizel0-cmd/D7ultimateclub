import LeaderboardRow from "@/components/LeaderboardRow";
import { leaderboard } from "@/data/players";

export default function RankingPage() {
  return (
    <div className="container-custom py-12">
      <div className="mb-10">
        <div className="font-mono text-[11px] text-text-dim uppercase tracking-widest mb-2">
          Ranking
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Leaderboard nacional</h1>
        <p className="text-text-soft mt-3 max-w-2xl">
          Os melhores jogadores brasileiros de ARAM e modos rápidos. Ranking calculado a partir de
          partidas públicas e torneios organizados.
        </p>
      </div>

      <div className="bg-bg-elevated border border-border rounded-2xl overflow-hidden">
        <div className="px-7 py-5 border-b border-border-soft flex justify-between items-center flex-wrap gap-3">
          <div>
            <div className="text-lg font-bold">Top jogadores · Brasil</div>
            <div className="text-xs text-text-soft mt-0.5">
              {leaderboard.length} jogadores no top · Atualizado em tempo real
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["ARAM", "Mayhem", "Arena", "SR", "Geral"].map((f) => (
              <span
                key={f}
                className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                  f === "ARAM"
                    ? "bg-accent/15 text-accent border border-accent"
                    : "bg-bg-card text-text-soft border border-border hover:border-text-soft"
                }`}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="hidden md:grid grid-cols-[60px_1fr_120px_80px_80px_80px] gap-4 px-7 py-2.5 bg-bg-card font-mono text-[10px] text-text-dim uppercase tracking-wider font-semibold border-b border-border-soft">
          <div>#</div>
          <div>Jogador</div>
          <div>Tier</div>
          <div className="text-right">LP</div>
          <div className="text-right">Winrate</div>
          <div className="text-right">Partidas</div>
        </div>

        {leaderboard.map((entry) => (
          <LeaderboardRow key={entry.position} entry={entry} />
        ))}
      </div>

      <div className="mt-8 bg-bg-elevated border border-border rounded-2xl p-7 text-center">
        <div className="text-base font-semibold mb-2">Quer aparecer aqui?</div>
        <div className="text-sm text-text-soft mb-5 max-w-md mx-auto">
          Conecte sua conta Riot e suas partidas de ARAM começam a contar pro ranking nacional
          automaticamente.
        </div>
        <button className="btn-primary">Conectar minha conta Riot</button>
      </div>
    </div>
  );
}
