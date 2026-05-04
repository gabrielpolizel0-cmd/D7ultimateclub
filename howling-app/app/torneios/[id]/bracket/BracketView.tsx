'use client';

import { useState } from 'react';
import { advanceWinner } from '@/lib/bracket';

interface Player {
  id: string;
  riot_game_name: string;
  riot_tag_line: string;
  profile_icon_id: number | null;
}

interface Match {
  id: string;
  round: number;
  match_order: number;
  status: string;
  winner_id: string | null;
  player1: Player | Player[] | null;
  player2: Player | Player[] | null;
}

interface Props {
  matches: Match[];
  tournamentId: string;
}

function getProfileIconUrl(iconId: number | null) {
  if (!iconId) return null;
  return `https://ddragon.leagueoflegends.com/cdn/16.9.1/img/profileicon/${iconId}.png`;
}

function normalizePlayer(player: Player | Player[] | null): Player | null {
  if (!player) return null;
  if (Array.isArray(player)) return player[0] ?? null;
  return player;
}

function getRoundName(round: number, totalRounds: number) {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semifinal';
  if (fromEnd === 2) return 'Quartas de Final';
  if (fromEnd === 3) return 'Oitavas de Final';
  return 'Rodada ' + round;
}

export default function BracketView({ matches, tournamentId }: Props) {
  const [updatingMatchId, setUpdatingMatchId] = useState<string | null>(null);

  const rounds: Record<number, Match[]> = {};
  matches.forEach((m) => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  const totalRounds = Math.max(...roundNumbers);

  // Identifica o campeao (winner da ultima rodada)
  const finalMatch = rounds[totalRounds]?.[0];
  const champion = finalMatch?.winner_id
    ? (normalizePlayer(finalMatch.player1)?.id === finalMatch.winner_id
        ? normalizePlayer(finalMatch.player1)
        : normalizePlayer(finalMatch.player2))
    : null;

  async function handleSetWinner(match: Match, winner: Player) {
    if (match.status === 'finished' || match.status === 'walkover') {
      if (!confirm('Essa partida ja tem vencedor. Trocar mesmo?')) return;
    }

    setUpdatingMatchId(match.id);
    try {
      await advanceWinner(match.id, winner.id);
      window.location.reload();
    } catch (e: any) {
      console.error('[bracket] erro:', e);
      alert('Erro ao marcar vencedor: ' + e.message);
      setUpdatingMatchId(null);
    }
  }

  function PlayerSlot({ player, match, isWinner }: {
    player: Player | null;
    match: Match;
    isWinner: boolean;
  }) {
    const isUpdating = updatingMatchId === match.id;
    const canClick = !!player && match.status !== 'walkover';

    if (!player) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 border border-gray-800 rounded text-gray-600 text-xs italic">
          aguardando...
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => {
          if (canClick) handleSetWinner(match, player);
        }}
        disabled={isUpdating}
        className={
          'w-full flex items-center gap-2 px-3 py-2 border rounded text-left transition-colors cursor-pointer ' +
          (isWinner
            ? 'bg-emerald-900/30 border-emerald-600 font-bold'
            : 'bg-gray-900 border-gray-800 hover:border-emerald-500 hover:bg-gray-800') +
          (isUpdating ? ' opacity-50' : '')
        }
      >
        {getProfileIconUrl(player.profile_icon_id) ? (
          <img
            src={getProfileIconUrl(player.profile_icon_id)!}
            alt={player.riot_game_name}
            className="w-6 h-6 rounded bg-gray-800"
          />
        ) : (
          <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center text-xs font-bold text-black">
            {player.riot_game_name[0]}
          </div>
        )}
        <span className="text-sm flex-1 truncate">
          {player.riot_game_name}
          <span className="text-gray-500">#{player.riot_tag_line}</span>
        </span>
        {isWinner && <span className="text-emerald-400">✓</span>}
      </button>
    );
  }

  return (
    <div>
      {champion && (
        <div className="mb-6 p-6 bg-gradient-to-r from-yellow-900/40 to-emerald-900/40 border-2 border-yellow-500 rounded-lg text-center">
          <p className="text-sm text-yellow-400 uppercase tracking-wider mb-2">CAMPEAO</p>
          <p className="text-3xl font-bold">
            {champion.riot_game_name}
            <span className="text-yellow-500/60">#{champion.riot_tag_line}</span>
          </p>
        </div>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {roundNumbers.map((round) => (
            <div key={round} className="flex flex-col gap-3 min-w-[280px]">
              <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">
                {getRoundName(round, totalRounds)}
              </h3>
              <div className="flex flex-col gap-3">
                {rounds[round].map((match) => {
                  const p1 = normalizePlayer(match.player1);
                  const p2 = normalizePlayer(match.player2);

                  return (
                    <div
                      key={match.id}
                      className="p-3 bg-gray-900/50 border border-gray-800 rounded space-y-2"
                    >
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span>Match #{match.match_order}</span>
                        <span
                          className={
                            match.status === 'finished'
                              ? 'text-emerald-400'
                              : match.status === 'walkover'
                              ? 'text-yellow-400'
                              : 'text-gray-500'
                          }
                        >
                          {match.status}
                        </span>
                      </div>
                      <PlayerSlot
                        player={p1}
                        match={match}
                        isWinner={match.winner_id === p1?.id}
                      />
                      <div className="text-center text-xs text-gray-600">vs</div>
                      <PlayerSlot
                        player={p2}
                        match={match}
                        isWinner={match.winner_id === p2?.id}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}