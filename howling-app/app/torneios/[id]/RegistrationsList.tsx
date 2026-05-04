interface Player {
  id: string;
  riot_game_name: string;
  riot_tag_line: string;
  summoner_level: number | null;
  profile_icon_id: number | null;
  current_tier: string | null;
  current_rank: string | null;
  current_lp: number;
}

interface Registration {
  id: string;
  created_at: string;
  team_name: string | null;
  status: string;
  players: Player | Player[] | null;
}

interface Props {
  registrations: Registration[];
}

function getProfileIconUrl(iconId: number | null) {
  if (!iconId) return null;
  return `https://ddragon.leagueoflegends.com/cdn/16.9.1/img/profileicon/${iconId}.png`;
}

function getRank(player: Player) {
  if (!player.current_tier) return 'UNRANKED';
  return `${player.current_tier} ${player.current_rank || ''} • ${player.current_lp} LP`;
}

export default function RegistrationsList({ registrations }: Props) {
  if (registrations.length === 0) {
    return (
      <div className="p-12 bg-gray-900 border border-gray-800 rounded-lg text-center">
        <p className="text-4xl mb-2">🦗</p>
        <p className="text-gray-400">Ninguém inscrito ainda.</p>
        <p className="text-sm text-gray-500 mt-1">Seja o primeiro!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {registrations.map((reg, index) => {
        const player = Array.isArray(reg.players) ? reg.players[0] : reg.players;
        if (!player) return null;
        
        return (
          <div
            key={reg.id}
            className="flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-emerald-500/50 transition-colors"
          >
            <div className="text-gray-500 font-bold w-8 text-center">
              {index + 1}
            </div>

            {getProfileIconUrl(player.profile_icon_id) ? (
              <img
                src={getProfileIconUrl(player.profile_icon_id)!}
                alt={player.riot_game_name}
                className="w-12 h-12 rounded bg-gray-800"
              />
            ) : (
              <div className="w-12 h-12 bg-emerald-500 rounded flex items-center justify-center font-bold text-black text-xl">
                {player.riot_game_name[0]}
              </div>
            )}

            <div className="flex-1">
              <p className="font-bold">
                {player.riot_game_name}
                <span className="text-gray-500">#{player.riot_tag_line}</span>
              </p>
              <p className="text-sm text-gray-400">
                Level {player.summoner_level} • {getRank(player)}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-gray-500 uppercase">{reg.status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}