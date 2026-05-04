import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAramMatchIds, getMatchSummaries } from '@/lib/riot';
import { processNewMatches } from '@/lib/ranking';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Quantas partidas tentar buscar por vez (max 100 pela Riot)
const MAX_MATCHES_PER_SYNC = 20;

export async function POST(request: Request) {
  try {
    // Pega o token de autenticacao do header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }
    const token = authHeader.substring(7);

    // Cria cliente Supabase com a service role key (poder admin)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Valida o token e pega o user
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: 'Token invalido' }, { status: 401 });
    }

    // Busca o player desse user
    const { data: player, error: playerErr } = await supabaseAdmin
      .from('players')
      .select('id, puuid, riot_game_name, last_match_synced_at')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (playerErr || !player) {
      return NextResponse.json({ error: 'Jogador nao encontrado' }, { status: 404 });
    }

    if (!player.puuid) {
      return NextResponse.json({ error: 'Jogador sem PUUID cadastrado' }, { status: 400 });
    }

    // Determina startTime: se ja sincronizou antes, busca depois disso
    let startTime: number | undefined;
    if (player.last_match_synced_at) {
      startTime = Math.floor(new Date(player.last_match_synced_at).getTime() / 1000);
    }

    console.log(`[sync] sincronizando ${player.riot_game_name} (puuid ${player.puuid.slice(0, 10)}...)`);

    // 1. Pega IDs das partidas ARAM recentes
    const matchIds = await getAramMatchIds(player.puuid, MAX_MATCHES_PER_SYNC, startTime);
    console.log(`[sync] Riot retornou ${matchIds.length} partidas`);

    if (matchIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma partida ARAM nova encontrada',
        matchesAdded: 0,
        pointsGained: 0,
      });
    }

    // 2. Filtra partidas que ja estao no banco
    const { data: existing } = await supabaseAdmin
      .from('aram_matches')
      .select('riot_match_id')
      .eq('player_id', player.id)
      .in('riot_match_id', matchIds);

    const existingIds = new Set((existing || []).map((m: any) => m.riot_match_id));
    const newMatchIds = matchIds.filter((id: string) => !existingIds.has(id));

    console.log(`[sync] ${newMatchIds.length} partidas novas (${existingIds.size} ja existiam)`);

    if (newMatchIds.length === 0) {
      // Atualiza o timestamp mesmo assim
      await supabaseAdmin
        .from('players')
        .update({ last_match_synced_at: new Date().toISOString() })
        .eq('id', player.id);

      return NextResponse.json({
        success: true,
        message: 'Voce ja esta atualizado!',
        matchesAdded: 0,
        pointsGained: 0,
      });
    }

    // 3. Busca detalhes das partidas novas
    const summaries = await getMatchSummaries(newMatchIds, player.puuid);
    console.log(`[sync] ${summaries.length} partidas com detalhes obtidos`);

    // 4. Processa: salva no banco + atualiza pontos
    const result = await processNewMatches(player.id, summaries);

    console.log(`[sync] resultado:`, result);

    return NextResponse.json({
      success: true,
      message: result.qualificationCompleted
        ? `Qualificacao concluida! Voce foi colocado em ${result.finalTier}${result.finalDivision ? ' ' + result.finalDivision : ''}!`
        : `${result.matchesAdded} partidas adicionadas`,
      ...result,
    });
  } catch (error: any) {
    console.error('[sync] erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao sincronizar partidas' },
      { status: 500 }
    );
  }
}