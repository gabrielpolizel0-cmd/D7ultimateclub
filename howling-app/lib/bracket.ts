import { supabase } from './supabaseClient';

interface PlayerSeed {
  id: string;
  riot_game_name: string;
  riot_tag_line: string;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getBracketSize(playerCount: number): number {
  if (playerCount <= 1) return 1;
  return Math.pow(2, Math.ceil(Math.log2(playerCount)));
}

export async function generateBracket(tournamentId: string) {
  const { data: existing } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error('Bracket ja foi gerado para esse torneio!');
  }

  const { data: registrations, error: regError } = await supabase
    .from('registrations')
    .select('player_id, players(id, riot_game_name, riot_tag_line)')
    .eq('tournament_id', tournamentId)
    .eq('status', 'confirmed');

  if (regError) throw new Error('Erro ao buscar inscritos: ' + regError.message);
  if (!registrations || registrations.length < 2) {
    throw new Error('Minimo de 2 inscritos pra gerar bracket!');
  }

  const players: PlayerSeed[] = registrations
    .map((r: any) => Array.isArray(r.players) ? r.players[0] : r.players)
    .filter(Boolean);

  const shuffled = shuffle(players);
  const bracketSize = getBracketSize(shuffled.length);
  const totalRounds = Math.log2(bracketSize);
  const matchesPerRound = bracketSize / 2;

  const slots: (PlayerSeed | null)[] = [...shuffled];
  while (slots.length < bracketSize) {
    slots.push(null);
  }

  const matchesToInsert: any[] = [];

  // Round 1
  for (let i = 0; i < matchesPerRound; i++) {
    const player1 = slots[i * 2];
    const player2 = slots[i * 2 + 1];

    let winnerId: string | null = null;
    let status = 'pending';
    if (player1 && !player2) {
      winnerId = player1.id;
      status = 'walkover';
    } else if (!player1 && player2) {
      winnerId = player2.id;
      status = 'walkover';
    } else if (!player1 && !player2) {
      status = 'walkover';
    }

    matchesToInsert.push({
      tournament_id: tournamentId,
      round: 1,
      match_order: i + 1,
      player1_id: player1?.id ?? null,
      player2_id: player2?.id ?? null,
      winner_id: winnerId,
      status,
    });
  }

  // Rounds seguintes
  for (let round = 2; round <= totalRounds; round++) {
    const matchesThisRound = bracketSize / Math.pow(2, round);
    for (let i = 0; i < matchesThisRound; i++) {
      matchesToInsert.push({
        tournament_id: tournamentId,
        round,
        match_order: i + 1,
        player1_id: null,
        player2_id: null,
        winner_id: null,
        status: 'pending',
      });
    }
  }

  const { error: insertError } = await supabase
    .from('matches')
    .insert(matchesToInsert);

  if (insertError) throw new Error('Erro ao criar matches: ' + insertError.message);

  await supabase
    .from('tournaments')
    .update({ status: 'live' })
    .eq('id', tournamentId);

  // Propaga walkovers + handles "double bye"
  await propagateByes(tournamentId);

  return { matchesCreated: matchesToInsert.length, totalRounds, bracketSize };
}

async function propagateByes(tournamentId: string) {
  // Pega todas as matches da round 1
  const { data: round1 } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round', 1)
    .order('match_order');

  if (!round1) return;

  // Primeiro: propaga os walkovers que ja tem winner (slot vazio com 1 jogador)
  for (const match of round1) {
    if (match.status === 'walkover' && match.winner_id) {
      await advanceWinner(match.id, match.winner_id);
    }
  }

  // Segundo: trata "double bye" - quando uma match toda vazia da walkover,
  // mas a match irma tem 1 jogador, esse jogador passa direto pra round 3+
  // (o advanceWinner ja propagou pra round 2, agora se a round 2 tiver 1 slot
  // vazio porque o adversario veio de match toda vazia, vamos resolver)
  await resolveEmptySlotsInBracket(tournamentId);
}

async function resolveEmptySlotsInBracket(tournamentId: string) {
  // Busca todas as matches do torneio
  const { data: allMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round')
    .order('match_order');

  if (!allMatches) return;

  let madeProgress = true;
  let safetyLimit = 10; // Pra nao virar loop infinito

  while (madeProgress && safetyLimit > 0) {
    madeProgress = false;
    safetyLimit--;

    // Re-busca os dados atualizados
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round')
      .order('match_order');

    if (!matches) break;

    // Procura matches pending com 1 jogador preenchido e o outro slot
    // que nunca sera preenchido (porque a match anterior daquele slot
    // ja esta finished/walkover sem winner)
    for (const match of matches) {
      if (match.status !== 'pending') continue;

      const hasP1 = !!match.player1_id;
      const hasP2 = !!match.player2_id;

      if (hasP1 && !hasP2) {
        // Verifica se a match anterior do slot 2 (round - 1, match_order * 2)
        // ja terminou sem winner (entao esse slot fica vazio pra sempre)
        if (match.round > 1) {
          const prevMatchOrder = match.match_order * 2;
          const prevMatch = matches.find(
            (m) => m.round === match.round - 1 && m.match_order === prevMatchOrder
          );
          if (prevMatch && (prevMatch.status === 'walkover' || prevMatch.status === 'finished') && !prevMatch.winner_id) {
            // Walkover: P1 passa direto
            await supabase
              .from('matches')
              .update({
                status: 'walkover',
                winner_id: match.player1_id,
                finished_at: new Date().toISOString(),
              })
              .eq('id', match.id);
            await advanceWinner(match.id, match.player1_id);
            madeProgress = true;
          }
        }
      } else if (!hasP1 && hasP2) {
        if (match.round > 1) {
          const prevMatchOrder = match.match_order * 2 - 1;
          const prevMatch = matches.find(
            (m) => m.round === match.round - 1 && m.match_order === prevMatchOrder
          );
          if (prevMatch && (prevMatch.status === 'walkover' || prevMatch.status === 'finished') && !prevMatch.winner_id) {
            await supabase
              .from('matches')
              .update({
                status: 'walkover',
                winner_id: match.player2_id,
                finished_at: new Date().toISOString(),
              })
              .eq('id', match.id);
            await advanceWinner(match.id, match.player2_id);
            madeProgress = true;
          }
        }
      }
    }
  }
}

export async function advanceWinner(matchId: string, winnerId: string) {
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (matchError || !match) throw new Error('Partida nao encontrada');

  // So atualiza status pra finished se ainda esta pending
  if (match.status === 'pending') {
    await supabase
      .from('matches')
      .update({
        winner_id: winnerId,
        status: 'finished',
        finished_at: new Date().toISOString(),
      })
      .eq('id', matchId);
  }

  // Calcula a proxima match
  const nextRound = match.round + 1;
  const nextMatchOrder = Math.ceil(match.match_order / 2);

  const { data: nextMatch } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', match.tournament_id)
    .eq('round', nextRound)
    .eq('match_order', nextMatchOrder)
    .maybeSingle();

  if (!nextMatch) return;

  // Se o vencedor JA esta na proxima match, nao re-insere (idempotente)
  if (nextMatch.player1_id === winnerId || nextMatch.player2_id === winnerId) {
    return;
  }

  // Determina qual slot preencher
  const isPlayer1Slot = match.match_order % 2 === 1;
  const updateData = isPlayer1Slot
    ? { player1_id: winnerId }
    : { player2_id: winnerId };

  await supabase
    .from('matches')
    .update(updateData)
    .eq('id', nextMatch.id);
}