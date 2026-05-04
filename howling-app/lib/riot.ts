const RIOT_API_KEY = process.env.RIOT_API_KEY;

if (!RIOT_API_KEY) {
  console.warn('[riot.ts] RIOT_API_KEY nao configurada - rotas que dependem dela vao falhar');
}

const AMERICAS_BASE = 'https://americas.api.riotgames.com';
const BR1_BASE = 'https://br1.api.riotgames.com';

// ARAM Mayhem (ARAM Desordem em PT-BR) - queue oficial da Riot
const ARAM_QUEUE_ID = 2400;

interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

interface RiotSummoner {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

interface RiotLeagueEntry {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  summonerId: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

export interface MatchSummary {
  matchId: string;
  queueId: number;
  playedAt: Date;
  durationSeconds: number;
  championId: number;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: number;
  damageTaken: number;
  goldEarned: number;
  win: boolean;
}

export interface FullPlayerData {
  account: RiotAccount;
  summoner: RiotSummoner;
  ranked: RiotLeagueEntry | null;
}

async function riotFetch(url: string) {
  if (!RIOT_API_KEY) {
    throw new Error('RIOT_API_KEY nao configurada no .env.local');
  }

  const res = await fetch(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Riot API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ============================================
// FUNCOES DE CONTA E PERFIL
// ============================================

export async function getAccountByRiotId(gameName: string, tagLine: string): Promise<RiotAccount> {
  const url = `${AMERICAS_BASE}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
    gameName
  )}/${encodeURIComponent(tagLine)}`;
  return riotFetch(url);
}

export async function getSummonerByPuuid(puuid: string): Promise<RiotSummoner> {
  const url = `${BR1_BASE}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  return riotFetch(url);
}

export async function getRankedBySummonerId(summonerId: string): Promise<RiotLeagueEntry | null> {
  const url = `${BR1_BASE}/lol/league/v4/entries/by-summoner/${summonerId}`;
  const entries: RiotLeagueEntry[] = await riotFetch(url);
  const soloDuo = entries.find((e) => e.queueType === 'RANKED_SOLO_5x5');
  return soloDuo || null;
}

export async function getFullPlayerData(gameName: string, tagLine: string): Promise<FullPlayerData> {
  const account = await getAccountByRiotId(gameName, tagLine);
  const summoner = await getSummonerByPuuid(account.puuid);

  let ranked: RiotLeagueEntry | null = null;
  try {
    if (summoner.id) {
      ranked = await getRankedBySummonerId(summoner.id);
    }
  } catch (e) {
    console.warn('[riot.ts] erro ao buscar ranked, ignorando:', e);
  }

  return { account, summoner, ranked };
}

// ============================================
// FUNCOES DE PARTIDAS ARAM DESORDEM (Mayhem)
// ============================================

/**
 * Pega os IDs das ultimas partidas ARAM Desordem do jogador.
 */
export async function getAramMatchIds(
  puuid: string,
  count: number = 20,
  startTime?: number
): Promise<string[]> {
  let url = `${AMERICAS_BASE}/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=${ARAM_QUEUE_ID}&count=${count}`;

  if (startTime) {
    url += `&startTime=${startTime}`;
  }

  return riotFetch(url);
}

/**
 * Pega detalhes de uma partida especifica.
 */
export async function getMatchDetails(matchId: string): Promise<any> {
  const url = `${AMERICAS_BASE}/lol/match/v5/matches/${matchId}`;
  return riotFetch(url);
}

/**
 * Pega detalhes de uma partida e extrai SO os dados do jogador especifico.
 */
export async function getMatchSummaryForPlayer(
  matchId: string,
  puuid: string
): Promise<MatchSummary | null> {
  const match = await getMatchDetails(matchId);

  const participant = match.info.participants.find((p: any) => p.puuid === puuid);

  if (!participant) {
    console.warn(`[riot.ts] jogador ${puuid} nao encontrado na partida ${matchId}`);
    return null;
  }

  return {
    matchId,
    queueId: match.info.queueId,
    playedAt: new Date(match.info.gameStartTimestamp),
    durationSeconds: match.info.gameDuration,
    championId: participant.championId,
    championName: participant.championName,
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    damageDealt: participant.totalDamageDealtToChampions,
    damageTaken: participant.totalDamageTaken,
    goldEarned: participant.goldEarned,
    win: participant.win,
  };
}

/**
 * Pega resumos de varias partidas em paralelo.
 */
export async function getMatchSummaries(
  matchIds: string[],
  puuid: string
): Promise<MatchSummary[]> {
  const promises = matchIds.map((id) =>
    getMatchSummaryForPlayer(id, puuid).catch((e) => {
      console.warn(`[riot.ts] erro pegando match ${id}:`, e.message);
      return null;
    })
  );

  const results = await Promise.all(promises);
  return results.filter((r): r is MatchSummary => r !== null);
}