import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos das tabelas (TypeScript)
export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  game_mode: 'ARAM' | 'NORMAL' | 'RANKED_SOLO' | 'RANKED_FLEX' | 'CUSTOM';
  start_date: string;
  max_teams: number;
  prize_pool: number;
  status: 'upcoming' | 'live' | 'finished' | 'cancelled';
  format: string;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  auth_user_id: string | null;
  puuid: string;
  riot_game_name: string;
  riot_tag_line: string;
  summoner_level: number | null;
  profile_icon_id: number | null;
  current_tier: string | null;
  current_rank: string | null;
  current_lp: number;
  total_wins: number;
  total_losses: number;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  tournament_id: string;
  player_id: string;
  team_name: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}