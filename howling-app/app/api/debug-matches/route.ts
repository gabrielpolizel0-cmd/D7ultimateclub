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
      .select('puuid')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!player?.puuid) {
      return NextResponse.json({ error: 'PUUID nao encontrado' }, { status: 404 });
    }

    // Pega ULTIMAS 20 partidas SEM filtrar por queue
    const idsRes = await fetch(
      `${AMERICAS_BASE}/lol/match/v5/matches/by-puuid/${player.puuid}/ids?count=20`,
      { headers: { 'X-Riot-Token': RIOT_API_KEY }, cache: 'no-store' }
    );
    const matchIds: string[] = await idsRes.json();

    // Busca detalhes de cada uma e extrai o queue ID + queue name
    const debug: any[] = [];
    for (const matchId of matchIds.slice(0, 10)) {
      const detRes = await fetch(
        `${AMERICAS_BASE}/lol/match/v5/matches/${matchId}`,
        { headers: { 'X-Riot-Token': RIOT_API_KEY }, cache: 'no-store' }
      );
      const match = await detRes.json();
      const participant = match.info?.participants?.find((p: any) => p.puuid === player.puuid);
      
      debug.push({
        matchId,
        queueId: match.info?.queueId,
        gameMode: match.info?.gameMode,
        gameType: match.info?.gameType,
        mapId: match.info?.mapId,
        playedAt: new Date(match.info?.gameStartTimestamp).toLocaleString('pt-BR'),
        champion: participant?.championName,
        kda: `${participant?.kills}/${participant?.deaths}/${participant?.assists}`,
        win: participant?.win,
      });
    }

    return NextResponse.json({ debug });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}