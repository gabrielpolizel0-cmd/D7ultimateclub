import { supabase, Tournament } from '@/lib/supabaseClient';

// Faz a página buscar dados a cada requisição (sem cache)
export const dynamic = 'force-dynamic';

async function getTournaments(): Promise<Tournament[]> {
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
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: string) {
  const labels: Record<string, { text: string; color: string }> = {
    upcoming: { text: '🟢 Em breve', color: 'text-emerald-400' },
    live: { text: '🔴 AO VIVO', color: 'text-red-400' },
    finished: { text: '⚫ Finalizado', color: 'text-gray-400' },
    cancelled: { text: '⚠️ Cancelado', color: 'text-yellow-400' },
  };
  return labels[status] || { text: status, color: 'text-gray-400' };
}

export default async function TorneiosPage() {
  const tournaments = await getTournaments();

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">🏆 Torneios</h1>
        <p className="text-gray-400 mb-8">
          {tournaments.length === 0 
            ? 'Nenhum torneio cadastrado ainda.' 
            : `${tournaments.length} torneio(s) cadastrado(s).`}
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {tournaments.map((tournament) => {
            const status = statusLabel(tournament.status);
            return (
              <div
                key={tournament.id}
                className="p-6 bg-gray-900 border border-gray-800 rounded-lg hover:border-emerald-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-2xl font-bold">{tournament.name}</h2>
                  <span className={`text-sm font-bold ${status.color}`}>
                    {status.text}
                  </span>
                </div>

                {tournament.description && (
                  <p className="text-gray-400 text-sm mb-4">
                    {tournament.description}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 uppercase text-xs">Modo</p>
                    <p className="font-bold">{tournament.game_mode}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 uppercase text-xs">Vagas</p>
                    <p className="font-bold">{tournament.max_teams} times</p>
                  </div>
                  <div>
                    <p className="text-gray-500 uppercase text-xs">Premiação</p>
                    <p className="font-bold text-emerald-400">
                      R$ {Number(tournament.prize_pool).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-xs text-gray-500">📅 INÍCIO</p>
                  <p className="font-bold">{formatDate(tournament.start_date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}