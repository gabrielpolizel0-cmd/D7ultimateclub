import Link from 'next/link';
import { supabase, Tournament } from '@/lib/supabaseClient';

// Sem cache — sempre busca dados frescos
export const dynamic = 'force-dynamic';

// Tipo estendido pra incluir entry_fee (existe no banco mas não no tipo base)
type TournamentWithFee = Tournament & { entry_fee?: number | null };

async function getTournaments(): Promise<TournamentWithFee[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Erro ao buscar torneios:', error);
    return [];
  }

  return data || [];
}

function formatDate(dateString: string) {
  const d = new Date(dateString);
  const dia = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const hora = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { dia, hora };
}

function diasAteEvento(dateString: string): number {
  const agora = new Date();
  const evento = new Date(dateString);
  const ms = evento.getTime() - agora.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function statusInfo(status: string) {
  const map: Record<string, { text: string; cls: string }> = {
    upcoming:  { text: 'INSCRIÇÕES ABERTAS', cls: 'bg-accent/10 text-accent border-accent/30' },
    live:      { text: 'AO VIVO',            cls: 'bg-danger/10 text-danger border-danger/30' },
    finished:  { text: 'FINALIZADO',         cls: 'bg-bg-card text-text-dim border-border' },
    cancelled: { text: 'CANCELADO',          cls: 'bg-warning/10 text-warning border-warning/30' },
  };
  return map[status] || { text: status, cls: 'bg-bg-card text-text-dim border-border' };
}

function formatLabel(format: string): string {
  const f = (format || '').toLowerCase();
  if (f.includes('round_robin')) return 'Pontos corridos';
  if (f.includes('bo3')) return 'Eliminatória BO3';
  return 'Eliminatória';
}

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default async function TorneiosPage() {
  const tournaments = await getTournaments();

  return (
    <div className="min-h-screen bg-bg text-text relative">
      <div className="glow-bg" />

      <div className="container-custom py-12 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent text-xs font-bold rounded-full border border-accent/30">
              <span className="w-1.5 h-1.5 bg-accent rounded-full pulse-dot" />
              CALENDÁRIO 2026
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-3">🏆 Torneios</h1>
          <p className="text-text-soft">
            {tournaments.length === 0
              ? 'Nenhum torneio cadastrado ainda.'
              : `${tournaments.length} torneio${tournaments.length > 1 ? 's' : ''} de ARAM Desordem com inscrições abertas.`}
          </p>
        </div>

        {/* Cards */}
        {tournaments.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-5xl mb-3">🦗</p>
            <p className="text-text-soft">Nenhum torneio no momento. Volta depois!</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {tournaments.map((t) => {
              const st = statusInfo(t.status);
              const { dia, hora } = formatDate(t.start_date);
              const dias = diasAteEvento(t.start_date);
              const inscricao = Number(t.entry_fee || 0);
              const premio = Number(t.prize_pool || 0);

              return (
                <Link
                  key={t.id}
                  href={`/torneios/${t.id}`}
                  className="group relative block bg-bg-card border border-border rounded-xl p-6 hover:border-accent/60 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(0,229,180,0.15)] transition-all duration-200"
                >
                  {/* Badges topo */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full border ${st.cls}`}>
                      {t.status === 'upcoming' && (
                        <span className="w-1.5 h-1.5 bg-accent rounded-full pulse-dot" />
                      )}
                      {st.text}
                    </span>
                    {t.status === 'upcoming' && dias <= 30 && (
                      <span className="text-xs font-bold text-warning whitespace-nowrap">
                        {dias === 0 ? 'HOJE' : dias === 1 ? 'AMANHÃ' : `em ${dias} dias`}
                      </span>
                    )}
                  </div>

                  {/* Título */}
                  <h2 className="text-2xl font-black mb-2 group-hover:text-accent transition-colors">
                    {t.name}
                  </h2>

                  {/* Descrição */}
                  {t.description && (
                    <p className="text-sm text-text-soft mb-5 line-clamp-2">
                      {t.description}
                    </p>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div>
                      <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                        Formato
                      </p>
                      <p className="text-sm font-bold">{formatLabel(t.format)}</p>
                      <p className="text-xs text-text-soft">{t.max_teams} times</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                        Inscrição
                      </p>
                      <p className="text-sm font-bold">R$ {fmt(inscricao)}</p>
                      <p className="text-xs text-text-soft">por jogador</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">
                        Prêmio
                      </p>
                      <p className="text-sm font-black text-accent">R$ {fmt(premio)}</p>
                      <p className="text-xs text-text-soft">ao campeão</p>
                    </div>
                  </div>

                  {/* Footer com data + CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-border-soft">
                    <div>
                      <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">
                        📅 Início
                      </p>
                      <p className="text-sm font-bold capitalize">{dia}</p>
                      <p className="text-xs text-text-soft">{hora}</p>
                    </div>
                    <div className="flex items-center gap-2 text-accent font-bold text-sm group-hover:gap-3 transition-all">
                      Ver torneio
                      <span className="text-lg">→</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}