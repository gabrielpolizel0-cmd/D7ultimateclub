export type TournamentStatus = "live" | "open" | "soon" | "closed" | "completed";
export type TournamentType = "daily" | "weekly" | "monthly" | "sponsored";
export type GameMode = "ARAM" | "ARAM_MAYHEM" | "ARENA" | "BRAWL" | "SR";

export interface Tournament {
  slug: string;
  name: string;
  description: string;
  type: TournamentType;
  mode: GameMode;
  status: TournamentStatus;
  startsAt: string;
  prizePool: number;
  registeredTeams: number;
  maxTeams: number;
  entryFee: number;
  lpMultiplier: number;
  format: string;
}

export type RankTier = "IRON" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND" | "MASTER" | "GRANDMASTER" | "CHALLENGER";

export interface Player {
  riotId: string;
  displayName: string;
  city: string;
  state: string;
  rank: {
    tier: RankTier;
    division: string;
    lp: number;
    position: number;
    totalPlayers: number;
  };
  stats: {
    wins: number;
    losses: number;
    winrate: number;
    avgKda: number;
    mvps: number;
    totalMatches: number;
  };
}

export interface MatchHistory {
  id: string;
  champion: string;
  championAbbr: string;
  result: "win" | "loss";
  mode: GameMode;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  healing?: number;
  lpChange: number;
  playedAt: string;
  championColor: string;
}

export interface LeaderboardEntry {
  position: number;
  riotId: string;
  displayName: string;
  city: string;
  tier: RankTier;
  division?: string;
  lp: number;
  winrate: number;
  matches: number;
  avatarColor: string;
}
