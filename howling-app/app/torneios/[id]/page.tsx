import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import RegistrationButton from './RegistrationButton';
import RegistrationsList from './RegistrationsList';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

async function getTournament(id: string) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !data) return null;
  return data;
}

async function getRegistrations(tournamentId: string) {
  const { data, error } = await supabase
    .from('registrations')
    .select(`
      id,
      created_at,
      team_name,
      status,
      players (
        id,
        riot_game_name,
        riot_tag_line,
        summoner_level,
        profile_icon_id,
        current_tier,
        current_rank,
        current_lp
      )
    `)
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Erro ao buscar inscrições:', error);
    return [];
  }
  return data || [];
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const tournament = await getTournament(params.id);
  
  if (!tournament) {
    notFound();
  }

  const registrations = await getRegistrations(params.id);
  const vagasRestantes = tournament.max_teams - registrations.length;
  const isFull = vagasRestantes <= 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero do torneio */}
      <div className="bg-gradient-to-b from-emerald-900/20 to-black border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">
                  {tournament.game_mode}
                </span>
                <span className="px-3 py-1 bg-gray-800 text-gray-400 text-xs font-bold rounded uppercase">
                  {tournament.status === 'upcoming' ? '🟢 Em breve' : tournament.status}
                </span>
              </div>
              <h1 className="text-4xl font-bold mb-2">{tournament.name}</h1>
              {tournament.description && (
                <p className="text-gray-400 max-w-2xl">{tournament.description}</p>
              )}
            </div>
            
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase">Premiação</p>
              <p className="text-3xl font-bold text-emerald-400">
                R$ {Number(tournament.prize_pool).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            <div>
              <p className="text-xs text-gray-500 uppercase">Início</p>
              <p className="font-bold">{formatDate(tournament.start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Inscritos</p>
              <p className="font-bold">
                {registrations.length} / {tournament.max_teams}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Vagas restantes</p>
              <p className={`font-bold ${isFull ? 'text-red-400' : 'text-emerald-400'}`}>
                {isFull ? 'LOTADO' : vagasRestantes}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Formato</p>
              <p className="font-bold capitalize">{tournament.format.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Botão de inscrição */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <RegistrationButton tournamentId={tournament.id} isFull={isFull} />
      </div>

      {/* Lista de inscritos */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-bold mb-4">
          🎮 Inscritos ({registrations.length})
        </h2>
        <RegistrationsList registrations={registrations} />
      </div>
    </div>
  );
}