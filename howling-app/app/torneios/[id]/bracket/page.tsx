import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import BracketView from './BracketView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

async function getTournamentWithMatches(id: string) {
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (!tournament) return null;

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      id,
      round,
      match_order,
      status,
      winner_id,
      player1:players!matches_player1_id_fkey(id, riot_game_name, riot_tag_line, profile_icon_id),
      player2:players!matches_player2_id_fkey(id, riot_game_name, riot_tag_line, profile_icon_id)
    `)
    .eq('tournament_id', id)
    .order('round', { ascending: true })
    .order('match_order', { ascending: true });

  return { tournament, matches: matches || [] };
}

export default async function BracketPage({ params }: PageProps) {
  const data = await getTournamentWithMatches(params.id);
  
  if (!data) notFound();
  
  const { tournament, matches } = data;

  if (matches.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <p className="text-6xl mb-4">🎮</p>
          <h1 className="text-3xl font-bold mb-2">Bracket ainda não foi gerado</h1>
          <p className="text-gray-400 mb-6">
            O administrador precisa fechar as inscrições e gerar o bracket primeiro.
          </p>
          <a href={`/torneios/${params.id}`} className="text-emerald-400 hover:underline">
            ← Voltar pro torneio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <a href={`/torneios/${params.id}`} className="text-emerald-400 hover:underline text-sm">
            ← {tournament.name}
          </a>
          <h1 className="text-3xl font-bold mt-2">🏆 Bracket</h1>
          <p className="text-gray-400 text-sm mt-1">
            Eliminação simples • Clica nos jogadores pra marcar o vencedor
          </p>
        </div>

        <BracketView matches={matches} tournamentId={params.id} />
      </div>
    </div>
  );
}