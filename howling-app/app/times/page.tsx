import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface TeamRow {
  id: string;
  name: string;
  tag: string | null;
  logo_url: string | null;
  tournament_wins: number;
  total_match_wins: number;
  total_match_losses: number;
  ranking_points: number;
  tier: string;
  member_count: number;
}

async function getTeams(): Promise<TeamRow[]> {
  const { data, error } = await supabase
    .from('team_ranking')
    .select('*')
    .order('ranking_points', { ascending: false });

  if (error) {
    console.error('Erro ao buscar times:', error);
    return [];
  }
  return (data as TeamRow[]) || [];
}

function tierColor(tier: string): string {
  const map: Record<string, string> = {
    ULTIMATE: 'text-fuchsia-400',
    MASTER:   'text-purple-400',
    DIAMOND:  'text-cyan-400',
    PLATINUM: 'text-teal-400',
    GOLD:     'text-yellow-400',
    SILVER:   'text-gray-300',
    BRONZE:   'text-orange-400',
  };
  return map[tier] || 'text-text-soft';
}

function tierBg(tier: string): string {
  const map: Record<string, string> = {
    ULTIMATE: 'bg-fuchsia-500/10 border-fuchsia-500/30',
    MASTER:   'bg-purple-500/10 border-purple-500/30',
    DIAMOND:  'bg-cyan-500/10 border-cyan-500/30',
    PLATINUM: 'bg-teal-500/10 border-teal-500/30',
    GOLD:     'bg-yellow-500/10 border-yellow-500/30',
    SILVER:   'bg-gray-500/10 border-gray-500/30',
    BRONZE:   'bg-orange-500/10 border-orange-500/30',
  };
  return map[tier] || 'bg-bg-card border-border';
}

export default async function TimesPage() {
  const teams = await getTeams();

  return (
    <div className="min-h-screen bg-bg text-text relative">
      <div className="glow-bg" />

      <div className="container-custom py-12 md:py-16">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent text-xs font-bold rounded-full border border-accent/30">
                <span className="w-1.5 h-1.5 bg-accent rounded-full pulse-dot" />
                RANKING DE TIMES
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-3">🛡️ Times</h1>
            <p className="text-text-soft">
              {teams.length === 0
                ? 'Nenhum time formado ainda. Sê o primeiro!'
                : `${teams.length} time${teams.length > 1 ? 's' : ''} disputando o topo do D7.`}
            </p>
          </div>

          <Link
            href="/times/criar"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-deep text-bg font-bold rounded-lg transition-colors"
          >
            ⚔️ Criar meu time
          </Link>
        </div>

        {/* Lista */}
        {teams.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-5xl mb-3">🦗</p>
            <p className="text-text-soft mb-4">Nenhum time formado ainda.</p>
            <Link
              href="/times/criar"
              className="inline-block px-6 py-3 bg-accent hover:bg-accent-deep text-bg font-bold rounded transition-colors"
            >
              Criar meu time
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team, idx) => {
              const winRate = team.total_match_wins + team.total_match_losses > 0
                ? Math.round((team.total_match_wins / (team.total_match_wins + team.total_match_losses)) * 100)
                : 0;

              return (
                <Link
                  key={team.id}
                  href={`/times/${team.id}`}
                  className={`block bg-bg-card border rounded-xl p-5 hover:border-accent/60 hover:-translate-y-0.5 transition-all ${tierBg(team.tier)}`}
                >
                  <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                    {/* Posição */}
                    <div className="text-2xl md:text-3xl font-black text-text-dim min-w-[3rem] text-center">
                      #{idx + 1}
                    </div>

                    {/* Logo */}
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-bg border border-border flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                      {team.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                      ) : (
                        '🛡️'
                      )}
                    </div>

                    {/* Nome + tier */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl md:text-2xl font-black truncate">
                          {team.name}
                        </h2>
                        {team.tag && (
                          <span className="text-sm text-text-soft font-mono">[{team.tag}]</span>
                        )}
                      </div>
                      <p className={`text-sm font-bold ${tierColor(team.tier)} uppercase tracking-wider`}>
                        {team.tier}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 md:gap-6 w-full md:w-auto">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-text-dim uppercase">Pontos</p>
                        <p className="text-lg md:text-xl font-black text-accent">{team.ranking_points}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-text-dim uppercase">Títulos</p>
                        <p className="text-lg md:text-xl font-black">{team.tournament_wins}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-text-dim uppercase">V/D</p>
                        <p className="text-sm md:text-base font-bold">
                          <span className="text-accent">{team.total_match_wins}</span>
                          <span className="text-text-dim">/</span>
                          <span className="text-danger">{team.total_match_losses}</span>
                        </p>
                        <p className="text-[10px] text-text-soft">{winRate}% wr</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-text-dim uppercase">Roster</p>
                        <p className="text-lg md:text-xl font-black">{team.member_count}/10</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Info sobre tier */}
        <div className="mt-12 p-5 bg-bg-card border border-border rounded-lg">
          <p className="text-sm font-bold mb-3">💡 Como funciona o ranking</p>
          <p className="text-xs text-text-soft mb-2">
            <strong>Pontos = (títulos × 100) + (vitórias × 10)</strong>
          </p>
          <div className="text-xs text-text-soft grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <div><span className="text-orange-400">●</span> BRONZE: 0+</div>
            <div><span className="text-gray-300">●</span> SILVER: 50+</div>
            <div><span className="text-yellow-400">●</span> GOLD: 150+</div>
            <div><span className="text-teal-400">●</span> PLATINUM: 300+</div>
            <div><span className="text-cyan-400">●</span> DIAMOND: 500+</div>
            <div><span className="text-purple-400">●</span> MASTER: 750+</div>
            <div><span className="text-fuchsia-400">●</span> ULTIMATE: 1000+</div>
          </div>
        </div>
      </div>
    </div>
  );
}