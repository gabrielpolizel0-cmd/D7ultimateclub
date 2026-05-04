import { supabase } from './supabaseClient';

export interface SignUpData {
  email: string;
  password: string;
  gameName: string;
  tagLine: string;
}

/**
 * Cadastra um novo usuário:
 * 1. Valida o Riot ID
 * 2. Cria conta no Supabase Auth
 * 3. Faz login imediato (pra ter sessão)
 * 4. Cria registro de player vinculado
 */
export async function signUp({ email, password, gameName, tagLine }: SignUpData) {
  // 1. Valida o Riot ID via API Riot (chamada via nosso backend)
  const riotRes = await fetch(`/api/player?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`);
  if (!riotRes.ok) {
    const errText = await riotRes.text();
    throw new Error(`Riot ID inválido ou não encontrado. Detalhes: ${errText}`);
  }
  const riotData = await riotRes.json();

  // 2. Verifica se esse PUUID já tá cadastrado em outro player
  const { data: existing } = await supabase
    .from('players')
    .select('id')
    .eq('puuid', riotData.account.puuid)
    .maybeSingle();

  if (existing) {
    throw new Error('Esse Riot ID já está cadastrado em outra conta!');
  }

  // 3. Cria conta no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    throw new Error(`Erro ao criar conta: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('Erro inesperado ao criar conta.');
  }

  // 4. Faz login imediato pra propagar o token JWT na sessão
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(`Conta criada mas falha no login automático: ${signInError.message}`);
  }

  // 5. Agora SIM cria registro de player vinculado (já com sessão ativa)
  const { error: playerError } = await supabase.from('players').insert({
    auth_user_id: authData.user.id,
    puuid: riotData.account.puuid,
    riot_game_name: riotData.account.gameName,
    riot_tag_line: riotData.account.tagLine,
    summoner_level: riotData.summoner?.summonerLevel ?? null,
    profile_icon_id: riotData.summoner?.profileIconId ?? null,
    current_tier: riotData.ranked?.[0]?.tier ?? null,
    current_rank: riotData.ranked?.[0]?.rank ?? null,
    current_lp: riotData.ranked?.[0]?.leaguePoints ?? 0,
    total_wins: riotData.ranked?.[0]?.wins ?? 0,
    total_losses: riotData.ranked?.[0]?.losses ?? 0,
  });

  if (playerError) {
    console.error('Erro ao criar player:', playerError);
    throw new Error(`Erro ao salvar dados do jogador: ${playerError.message}`);
  }

  return { user: authData.user, riotData };
}

/**
 * Login com email e senha
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Logout
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Pega o usuário logado atualmente (e dados do player)
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  return { user, player };
}