import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RIOT_API_KEY = process.env.RIOT_API_KEY!;

const AMERICAS_BASE = 'https://americas.api.riotgames.com';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }
    const token = authHeader.substring(7);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Token invalido' }, { status: 401 });

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('puuid, riot_game_name')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!player?.puuid) {
      return NextResponse.json({ error: 'PUUID nao encontrado' }, { status: 404 });
    }

    // Pega 10 partidas recentes SEM filtrar queue
    const idsRes = await fetch(
      `${AMERICAS_BASE}/lol/match/v5/matches/by-puuid/${player.puuid}/ids?count=10`,
      { headers: { 'X-Riot-Token': RIOT_API_KEY }, cache: 'no-store' }
    );

    if (!idsRes.ok) {
      return NextResponse.json({
        error: `Riot API: ${idsRes.status}`,
        body: await idsRes.text(),
      }, { status: 500 });
    }

    const matchIds: string[] = await idsRes.json();

    if (!Array.isArray(matchIds) || matchIds.length === 0) {
      return NextResponse.json({ message: 'Nenhuma partida encontrada na Riot API' });
    }

    const partidas: any[] = [];
    for (const matchId of matchIds.slice(0, 8)) {
      try {
        const detRes = await fetch(
          `${AMERICAS_BASE}/lol/match/v5/matches/${matchId}`,
          { headers: { 'X-Riot-Token': RIOT_API_KEY }, cache: 'no-store' }
        );
        const match = await detRes.json();
        const p = match.info?.participants?.find((x: any) => x.puuid === player.puuid);

        partidas.push({
          matchId,
          queueId: match.info?.queueId,
          gameMode: match.info?.gameMode,
          mapId: match.info?.mapId,
          gameType: match.info?.gameType,
          jogadoEm: new Date(match.info?.gameStartTimestamp).toLocaleString('pt-BR'),
          duracao_min: Math.round((match.info?.gameDuration || 0) / 60),
          campeao: p?.championName,
          kda: `${p?.kills}/${p?.deaths}/${p?.assists}`,
          dano: p?.totalDamageDealtToChampions,
          resultado: p?.win ? 'VITORIA' : 'DERROTA',
        });
      } catch (e: any) {
        partidas.push({ matchId, erro: e.message });
      }
    }

    return NextResponse.json({
      jogador: player.riot_game_name,
      totalEncontradas: matchIds.length,
      partidas,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}