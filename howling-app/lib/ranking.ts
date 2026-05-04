import { supabase } from './supabaseClient';
import type { MatchSummary } from './riot';

// ============================================
// CONSTANTES DE PONTOS
// ============================================

const POINTS_WIN = 18;
const POINTS_LOSS = -12;

const QUALIFICATION_MATCHES_REQUIRED = 10;
const QUALIFICATION_MULTIPLIER = 2;

// ============================================
// TIERS E DIVISOES
// ============================================

export const TIER_THRESHOLDS = [
  { tier: 'BRONZE',   minPoints: 0    },
  { tier: 'SILVER',   minPoints: 500  },
  { tier: 'GOLD',     minPoints: 1000 },
  { tier: 'PLATINUM', minPoints: 1500 },
  { tier: 'DIAMOND',  minPoints: 2000 },
  { tier: 'MASTER',   minPoints: 2500 },
  { tier: 'ULTIMATE', minPoints: 3000 },
] as const;

export type Tier = typeof TIER_THRESHOLDS[number]['tier'];
export type Division = 'I' | 'II' | 'III' | 'IV';

const DIVISIONS_PER_TIER = 4;
const POINTS_PER_DIVISION = 125; // 500 / 4 = 125 pts entre divisoes

export interface RankInfo {
  tier: Tier | 'UNRANKED';
  division: Division | null;
  points: number;
  isQualifying: boolean;
  qualificationProgress: number; // 0 a 10
}

/**
 * Calcula o tier e divisao baseado em pontos totais.
 * MASTER e ULTIMATE nao tem divisoes (so o tier).
 */
export function getTierAndDivision(points: number): { tier: Tier; division: Division | null } {
  // ULTIMATE: 3000+ (sem divisao)
  if (points >= 3000) return { tier: 'ULTIMATE', division: null };

  // MASTER: 2500-2999 (sem divisao)
  if (points >= 2500) return { tier: 'MASTER', division: null };

  // Demais tiers tem 4 divisoes (IV, III, II, I)
  // Cada tier tem 500 pontos, divididos em 4 = 125 pts cada
  const tierData = [...TIER_THRESHOLDS]
    .reverse()
    .find((t) => points >= t.minPoints && t.tier !== 'MASTER' && t.tier !== 'ULTIMATE');

  if (!tierData) {
    return { tier: 'BRONZE', division: 'IV' };
  }

  const pointsInTier = points - tierData.minPoints;
  const divisionIndex = Math.floor(pointsInTier / POINTS_PER_DIVISION);

  // 0 = IV, 1 = III, 2 = II, 3 = I
  const divisions: Division[] = ['IV', 'III', 'II', 'I'];
  const division = divisions[Math.min(divisionIndex, 3)];

  return { tier: tierData.tier, division };
}

/**
 * Quantos pontos faltam pra subir de divisao/tier.
 */
export function getNextTierProgress(points: number): {
  nextTierLabel: string;
  pointsNeeded: number;
  percentInCurrent: number;
} {
  if (points >= 3000) {
    return {
      nextTierLabel: 'D7 ULTIMATE alcançado!',
      pointsNeeded: 0,
      percentInCurrent: 100,
    };
  }

  // Encontra o proximo threshold
  const next = TIER_THRESHOLDS.find((t) => t.minPoints > points);
  if (!next) {
    return {
      nextTierLabel: 'D7 ULTIMATE alcançado!',
      pointsNeeded: 0,
      percentInCurrent: 100,
    };
  }

  const current = [...TIER_THRESHOLDS].reverse().find((t) => t.minPoints <= points);
  const currentMin = current?.minPoints || 0;

  // Se ainda esta dentro de um tier com divisoes, calcula divisao
  if (points < 2500) {
    const pointsInTier = points - currentMin;
    const currentDivisionIndex = Math.floor(pointsInTier / POINTS_PER_DIVISION);
    const nextDivisionThreshold = currentMin + (currentDivisionIndex + 1) * POINTS_PER_DIVISION;
    const pointsToNextDivision = nextDivisionThreshold - points;
    const percentInDivision = ((pointsInTier % POINTS_PER_DIVISION) / POINTS_PER_DIVISION) * 100;

    const divisions: Division[] = ['IV', 'III', 'II', 'I'];
    const nextDivisionLabel = currentDivisionIndex < 3
      ? `${current?.tier} ${divisions[currentDivisionIndex + 1]}`
      : `${next.tier} IV`;

    return {
      nextTierLabel: nextDivisionLabel,
      pointsNeeded: pointsToNextDivision,
      percentInCurrent: percentInDivision,
    };
  }

  // MASTER -> ULTIMATE (sem divisoes)
  return {
    nextTierLabel: 'D7 ULTIMATE',
    pointsNeeded: next.minPoints - points,
    percentInCurrent: ((points - currentMin) / (next.minPoints - currentMin)) * 100,
  };
}

// ============================================
// CALCULO DE PONTOS POR PARTIDA
// ============================================

/**
 * Calcula quantos pontos uma partida da/tira.
 */
export function calculatePointsForMatch(
  match: MatchSummary,
  isQualification: boolean
): number {
  let points = match.win ? POINTS_WIN : POINTS_LOSS;

  // Bonus de KDA
  const kda = match.deaths === 0 
    ? (match.kills + match.assists) // perfeita = soma direta
    : (match.kills + match.assists) / match.deaths;

  if (kda >= 6.0) points += 12;
  else if (kda >= 4.0) points += 8;
  else if (kda >= 2.5) points += 4;
  else if (kda >= 1.5) points += 0;
  else if (kda >= 0.8) points -= 3;
  else points -= 6;

  // Bonus de assists altas (ARAM = trabalho em equipe)
  if (match.assists >= 20) points += 6;
  else if (match.assists >= 15) points += 3;

  // Multiplicador de qualificacao
  if (isQualification) {
    points *= QUALIFICATION_MULTIPLIER;
  }

  return points;
}

// ============================================
// PROCESSAMENTO E PERSISTENCIA
// ============================================

interface PlayerForRanking {
  id: string;
  d7_points: number;
  qualification_matches_played: number;
  aram_total_wins: number;
  aram_total_losses: number;
}

/**
 * Processa uma lista de novas partidas, salva no banco, e atualiza o player.
 * Retorna o estado final do player.
 */
export async function processNewMatches(
  playerId: string,
  matches: MatchSummary[]
): Promise<{
  matchesAdded: number;
  pointsGained: number;
  finalPoints: number;
  finalTier: Tier | 'UNRANKED';
  finalDivision: Division | null;
  qualificationCompleted: boolean;
}> {
  if (matches.length === 0) {
    return {
      matchesAdded: 0,
      pointsGained: 0,
      finalPoints: 0,
      finalTier: 'UNRANKED',
      finalDivision: null,
      qualificationCompleted: false,
    };
  }

  // Pega estado atual do player
  const { data: player, error: playerErr } = await supabase
    .from('players')
    .select('id, d7_points, qualification_matches_played, aram_total_wins, aram_total_losses')
    .eq('id', playerId)
    .single<PlayerForRanking>();

  if (playerErr || !player) {
    throw new Error(`Player nao encontrado: ${playerErr?.message}`);
  }

  // Ordena partidas da mais antiga pra mais recente
  // (importante: pontos sao cumulativos, ordem importa)
  const sortedMatches = [...matches].sort(
    (a, b) => a.playedAt.getTime() - b.playedAt.getTime()
  );

  let currentPoints = player.d7_points;
  let qualMatches = player.qualification_matches_played;
  let totalWins = player.aram_total_wins;
  let totalLosses = player.aram_total_losses;
  let pointsGained = 0;

  const matchesToInsert: any[] = [];

  for (const match of sortedMatches) {
    const isQualification = qualMatches < QUALIFICATION_MATCHES_REQUIRED;
    const pointsChange = calculatePointsForMatch(match, isQualification);

    currentPoints = Math.max(0, currentPoints + pointsChange); // nao deixa negativo
    pointsGained += pointsChange;

    if (match.win) totalWins++;
    else totalLosses++;

    if (isQualification) qualMatches++;

    const kda = match.deaths === 0
      ? match.kills + match.assists
      : (match.kills + match.assists) / match.deaths;

    matchesToInsert.push({
      player_id: playerId,
      riot_match_id: match.matchId,
      queue_id: match.queueId,
      played_at: match.playedAt.toISOString(),
      duration_seconds: match.durationSeconds,
      champion_id: match.championId,
      champion_name: match.championName,
      kills: match.kills,
      deaths: match.deaths,
      assists: match.assists,
      kda: parseFloat(kda.toFixed(2)),
      damage_dealt: match.damageDealt,
      damage_taken: match.damageTaken,
      gold_earned: match.goldEarned,
      result: match.win ? 'win' : 'loss',
      was_qualification: isQualification,
      points_change: pointsChange,
      points_after: currentPoints,
    });
  }

  // Insere todas as partidas (com onConflict: ignora duplicatas)
  const { error: insertErr } = await supabase
    .from('aram_matches')
    .upsert(matchesToInsert, { onConflict: 'player_id,riot_match_id', ignoreDuplicates: true });

  if (insertErr) {
    throw new Error(`Erro ao salvar partidas: ${insertErr.message}`);
  }

  // Calcula tier final
  const isStillQualifying = qualMatches < QUALIFICATION_MATCHES_REQUIRED;
  let finalTier: Tier | 'UNRANKED' = 'UNRANKED';
  let finalDivision: Division | null = null;

  if (!isStillQualifying) {
    const tierInfo = getTierAndDivision(currentPoints);
    finalTier = tierInfo.tier;
    finalDivision = tierInfo.division;
  }

  // Atualiza o player
  const { error: updateErr } = await supabase
    .from('players')
    .update({
      d7_points: currentPoints,
      d7_tier: finalTier,
      d7_division: finalDivision,
      qualification_matches_played: qualMatches,
      aram_total_wins: totalWins,
      aram_total_losses: totalLosses,
      last_match_synced_at: new Date().toISOString(),
    })
    .eq('id', playerId);

  if (updateErr) {
    throw new Error(`Erro ao atualizar player: ${updateErr.message}`);
  }

  const qualificationJustCompleted =
    player.qualification_matches_played < QUALIFICATION_MATCHES_REQUIRED &&
    qualMatches >= QUALIFICATION_MATCHES_REQUIRED;

  return {
    matchesAdded: matchesToInsert.length,
    pointsGained,
    finalPoints: currentPoints,
    finalTier,
    finalDivision,
    qualificationCompleted: qualificationJustCompleted,
  };
}

/**
 * Pega o estado completo do rank do jogador (pra exibir no perfil).
 */
export async function getPlayerRankInfo(playerId: string): Promise<RankInfo | null> {
  const { data: player } = await supabase
    .from('players')
    .select('d7_points, d7_tier, d7_division, qualification_matches_played')
    .eq('id', playerId)
    .single();

  if (!player) return null;

  const isQualifying = player.qualification_matches_played < QUALIFICATION_MATCHES_REQUIRED;

  return {
    tier: player.d7_tier as Tier | 'UNRANKED',
    division: player.d7_division as Division | null,
    points: player.d7_points,
    isQualifying,
    qualificationProgress: player.qualification_matches_played,
  };
}