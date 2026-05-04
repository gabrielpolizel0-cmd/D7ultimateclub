const RIOT_API_KEY = process.env.RIOT_API_KEY!;

if (!RIOT_API_KEY) {
  throw new Error('RIOT_API_KEY não configurada no .env.local');
}

// Regiões da Riot (BR1 = Brasil, AMERICAS = continente)
const PLATFORM_BR1 = 'https://br1.api.riotgames.com';
const REGIONAL_AMERICAS = 'https://americas.api.riotgames.com';

interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

interface SummonerData {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
}

interface RankedEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

/**
 * Busca conta Riot pelo Riot ID (gameName#tagLine)
 */
export async function getAccountByRiotId(gameName: string, tagLine: string): Promise<RiotAccount> {
  const url = `${REGIONAL_AMERICAS}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  
  const response = await fetch(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY },
  });

  if (!response.ok) {
    throw new Error(`Riot API error: ${response.status} - ${await response.text()}`);
  }

  return response.json();
}

/**
 * Busca dados de summoner pelo PUUID
 */
export async function getSummonerByPuuid(puuid: string): Promise<SummonerData> {
  const url = `${PLATFORM_BR1}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  
  const response = await fetch(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY },
  });

  if (!response.ok) {
    throw new Error(`Riot API error: ${response.status} - ${await response.text()}`);
  }

  return response.json();
}

/**
 * Busca o rank do jogador (Solo/Duo, Flex, etc.)
 */
export async function getRankedBySummonerId(summonerId: string): Promise<RankedEntry[]> {
  const url = `${PLATFORM_BR1}/lol/league/v4/entries/by-summoner/${summonerId}`;
  
  const response = await fetch(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY },
  });

  if (!response.ok) {
    throw new Error(`Riot API error: ${response.status} - ${await response.text()}`);
  }

  return response.json();
}

/**
 * Função "tudo em um" com DEBUG: pega Riot ID e retorna tudo do jogador
 */
export async function getFullPlayerData(gameName: string, tagLine: string) {
  console.log('🔍 [1/3] Buscando conta:', gameName, '#', tagLine);
  const account = await getAccountByRiotId(gameName, tagLine);
  console.log('✅ [1/3] Conta encontrada:', account);
  
  console.log('🔍 [2/3] Buscando summoner com PUUID:', account.puuid);
  let summoner = null;
  try {
    summoner = await getSummonerByPuuid(account.puuid);
    console.log('✅ [2/3] Summoner encontrado:', summoner);
  } catch (e: any) {
    console.error('❌ [2/3] Erro ao buscar summoner:', e.message);
    return { account, summoner: null, ranked: [], debug: 'Falha em summoner-v4 (BR1)' };
  }
  
  console.log('🔍 [3/3] Buscando ranked com ID:', summoner.id);
  let ranked: RankedEntry[] = [];
  try {
    ranked = await getRankedBySummonerId(summoner.id);
    console.log('✅ [3/3] Ranked encontrado:', ranked);
  } catch (e: any) {
    console.error('❌ [3/3] Erro ao buscar ranked:', e.message);
    return { account, summoner, ranked: [], debug: 'Falha em league-v4 (BR1)' };
  }
  
  return { account, summoner, ranked };
}