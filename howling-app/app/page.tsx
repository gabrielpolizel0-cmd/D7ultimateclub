import Link from "next/link";
import TournamentCard from "@/components/TournamentCard";
import LeaderboardRow from "@/components/LeaderboardRow";
import MatchRow from "@/components/MatchRow";
import LPChart from "@/components/LPChart";
import { tournaments } from "@/data/tournaments";
import { leaderboard, currentPlayer, recentMatches, lpHistory } from "@/data/players";

export default function HomePage() {
  const featuredTournaments = tournaments.slice(0, 3);
  const topLeaderboard = leaderboard.slice(0, 7);
  const lastThree = recentMatches.slice(0, 3);
  const initials = currentPlayer.displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <>
      {/* Hero */}
      <section className="pt-14 pb-10">
        <div className="container-custom grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-stretch">
          {/* Hero principal */}
          <div className="bg-gradient-to-br from-bg-elevated to-bg-card border border-border rounded-2xl p-10 relative overflow-hidden">
            <div
              className="absolute -top-1/2 -right-1/3 w-[600px] h-[600px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(0,229,180,0.25) 0%, transparent 60%)",
              }}
            />
            <span className="relative inline-flex items-center gap-1.5 px-3 py-1 bg-accent/15 border border-accent rounded-full text-[11px] font-semibold text-accent uppercase tracking-wider mb-6">
              ● Plataforma brasileira
            </span>
            <h1 className="relative text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight mb-4">
              Ranking nacional
              <br />
              de{" "}
              <span className="bg-gradient-to-br from-accent to-accent-deep bg-clip-text text-transparent">
                ARAM
              </span>{" "}
              e modos rápidos
            </h1>
            <p className="relative text-text-soft text-base md:text-lg max-w-xl mb-8">
              Conecte sua conta Riot, jogue como sempre joga, e veja seu ranking subir. Torneios
              diários, semanais e ligas mensais com premiação real.
            </p>
            <div className="relative flex gap-4 sm:gap-8 flex-wrap">
              <div>
                <div className="text-2xl md:text-3xl font-extrabold tracking-tight leading-none">
                  12.847
                </div>
                <div className="text-xs text-text-soft mt-1.5 uppercase tracking-wider font-medium">
                  Jogadores ativos
                </div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-extrabold tracking-tight leading-none">428</div>
                <div className="text-xs text-text-soft mt-1.5 uppercase tracking-wider font-medium">
                  Torneios este mês
                </div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-extrabold tracking-tight leading-none">
                  R$ 24k
                </div>
                <div className="text-xs text-text-soft mt-1.5 uppercase tracking-wider font-medium">
                  Em premiação
                </div>
              </div>
            </div>
          </div>

          {/* Próximo torneio */}
          <div className="bg-bg-elevated border border-border rounded-2xl p-6 flex flex-col">
            <div className="font-mono text-[11px] text-text-dim uppercase tracking-widest mb-4">
              Próximo torneio · Daily Howling
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="text-lg font-bold mb-1">Daily ARAM #142</div>
                <div className="text-[13px] text-text-soft mb-3">Hoje · 19:00 · 16 times · Grátis</div>
                <div className="flex gap-2 mb-5">
                  <div className="bg-bg-card border border-border rounded-lg py-3 flex-1 text-center">
                    <div className="font-mono text-2xl font-bold text-accent leading-none">02</div>
                    <div className="text-[10px] text-text-dim mt-1 uppercase">horas</div>
                  </div>
                  <div className="bg-bg-card border border-border rounded-lg py-3 flex-1 text-center">
                    <div className="font-mono text-2xl font-bold text-accent leading-none">14</div>
                    <div className="text-[10px] text-text-dim mt-1 uppercase">min</div>
                  </div>
                  <div className="bg-bg-card border border-border rounded-lg py-3 flex-1 text-center">
                    <div className="font-mono text-2xl font-bold text-accent leading-none">37</div>
                    <div className="text-[10px] text-text-dim mt-1 uppercase">seg</div>
                  </div>
                </div>
              </div>
              <div>
                <button className="btn-primary w-full">Inscrever meu time</button>
                <div className="text-center mt-2.5 text-xs text-text-soft">14 vagas restantes</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Torneios destaque */}
      <section className="py-8">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Torneios em destaque</h2>
            <Link href="/torneios" className="text-text-soft hover:text-accent text-sm font-medium">
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredTournaments.map((t) => (
              <TournamentCard key={t.slug} tournament={t} />
            ))}
          </div>
        </div>
      </section>

      {/* Perfil + stats */}
      <section className="py-8">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Seu desempenho</h2>
            <Link href="/perfil" className="text-text-soft hover:text-accent text-sm font-medium">
              Perfil completo →
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-5">
            {/* Profile card */}
            <div className="bg-bg-elevated border border-border rounded-2xl p-7 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 right-0 h-20 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(95, 201, 201, 0.12), transparent)",
                }}
              />
              <div className="flex items-center gap-4 mb-6 relative">
                <div
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-rank-diamond to-rank-master flex items-center justify-center font-extrabold text-2xl border-2 border-rank-plat"
                  style={{ boxShadow: "0 0 20px rgba(95, 201, 201, 0.3)" }}
                >
                  {initials}
                </div>
                <div>
                  <div className="text-xl font-extrabold tracking-tight">
                    {currentPlayer.displayName}
                  </div>
                  <div className="font-mono text-xs text-text-soft mt-0.5">
                    {currentPlayer.riotId} · {currentPlayer.city}
                  </div>
                </div>
              </div>

              <div className="bg-bg-card border border-border rounded-xl p-4 mb-4 text-center relative">
                <div className="font-mono text-[11px] uppercase tracking-widest text-text-dim mb-1">
                  Ranking Howling · Nacional
                </div>
                <div className="text-2xl md:text-3xl font-extrabold text-rank-plat tracking-tight leading-tight">
                  {currentPlayer.rank.tier === "PLATINUM" ? "PLATINA" : currentPlayer.rank.tier}{" "}
                  {currentPlayer.rank.division}
                </div>
                <div className="font-mono text-[13px] text-text-soft mt-1.5">
                  {currentPlayer.rank.lp.toLocaleString("pt-BR")} LP
                </div>
                <div className="text-xs text-text-soft mt-2">
                  #<strong className="text-accent font-mono">
                    {currentPlayer.rank.position.toLocaleString("pt-BR")}
                  </strong>{" "}
                  de{" "}
                  <strong className="text-accent font-mono">
                    {currentPlayer.rank.totalPlayers.toLocaleString("pt-BR")}
                  </strong>{" "}
                  · top{" "}
                  {Math.round((currentPlayer.rank.position / currentPlayer.rank.totalPlayers) * 100)}%
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 relative">
                <Stat
                  label="Vitórias / Derrotas"
                  value={
                    <>
                      <span className="text-accent">{currentPlayer.stats.wins}</span> /{" "}
                      <span className="text-danger">{currentPlayer.stats.losses}</span>
                    </>
                  }
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
              </div>
            </div>

            {/* Stats panel */}
            <div className="bg-bg-elevated border border-border rounded-2xl p-7">
              <div className="flex gap-1 mb-5 p-1 bg-bg-card rounded-lg w-fit">
                <span className="px-3.5 py-1.5 text-[13px] font-semibold rounded-md bg-bg-elevated text-text">
                  Histórico LP
                </span>
                <span className="px-3.5 py-1.5 text-[13px] font-semibold rounded-md text-text-soft cursor-pointer hover:text-text">
                  Partidas recentes
                </span>
                <span className="hidden sm:inline px-3.5 py-1.5 text-[13px] font-semibold rounded-md text-text-soft cursor-pointer hover:text-text">
                  Campeões
                </span>
              </div>

              <div className="h-44 bg-bg-card border border-border-soft rounded-lg p-4 mb-4">
                <LPChart data={lpHistory} />
              </div>

              <div className="flex flex-col gap-1.5">
                {lastThree.map((m) => (
                  <MatchRow key={m.id} match={m} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="py-8">
        <div className="container-custom">
          <div className="bg-bg-elevated border border-border rounded-2xl overflow-hidden">
            <div className="px-7 py-5 border-b border-border-soft flex justify-between items-center flex-wrap gap-3">
              <div>
                <div className="text-lg font-bold">Leaderboard nacional</div>
                <div className="text-xs text-text-soft mt-0.5">Atualizado em tempo real</div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {["ARAM", "SR", "Arena", "Geral"].map((f) => (
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

            {topLeaderboard.map((entry) => (
              <LeaderboardRow key={entry.position} entry={entry} />
            ))}

            <div className="px-7 py-4 text-center">
              <Link href="/ranking" className="text-accent text-sm font-medium hover:underline">
                Ver leaderboard completo →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
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
