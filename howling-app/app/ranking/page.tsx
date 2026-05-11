'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface Player {
  id: string;
  riot_game_name: string;
  riot_tag_line: string;
  summoner_level: number;
  profile_icon_id: number | null;
  pix_key: string | null;
  pix_key_type: string | null;
}

interface RankingPlayer {
  id: string;
  riot_game_name: string;
  riot_tag_line: string;
  d7_points: number;
  profile_icon_id: number | null;
}

// Cores por tier
const TIER_COLORS: Record<string, string> = {
  ULTIMATE: 'text-fuchsia-400',
  MASTER: 'text-purple-400',
  DIAMOND: 'text-cyan-300',
  PLATINUM: 'text-teal-300',
  GOLD: 'text-yellow-400',
  SILVER: 'text-gray-300',
  BRONZE: 'text-orange-400',
  UNRANKED: 'text-gray-500',
};

function getTierFromPoints(points: number): string {
  if (points >= 1000) return 'ULTIMATE';
  if (points >= 750) return 'MASTER';
  if (points >= 500) return 'DIAMOND';
  if (points >= 300) return 'PLATINUM';
  if (points >= 150) return 'GOLD';
  if (points >= 50) return 'SILVER';
  if (points > 0) return 'BRONZE';
  return 'UNRANKED';
}

function getProfileIconUrl(iconId: number | null): string | null {
  if (!iconId) return null;
  return `https://ddragon.leagueoflegends.com/cdn/16.9.1/img/profileicon/${iconId}.png`;
}

export default function PerfilPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('email');
  const [savingPix, setSavingPix] = useState(false);
  const [pixSaved, setPixSaved] = useState(false);

  // Ranking
  const [topPlayers, setTopPlayers] = useState<RankingPlayer[]>([]);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [myPoints, setMyPoints] = useState<number>(0);
  const [iJaJoguei, setIJaJoguei] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: playerData } = await supabase
      .from('players')
      .select('id, riot_game_name, riot_tag_line, summoner_level, profile_icon_id, pix_key, pix_key_type')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!playerData) {
      router.push('/');
      return;
    }

    setPlayer(playerData);
    setPixKey(playerData.pix_key || '');
    setPixKeyType(playerData.pix_key_type || 'email');

    // ===== Carrega ranking =====
    // Pega ids dos jogadores que ja jogaram pelo menos 1 partida
    const { data: matchesData } = await supabase
      .from('aram_matches')
      .select('player_id');

    const playerIdsWhoPlayed = Array.from(new Set((matchesData || []).map(m => m.player_id)));

    // Verifica se EU joguei
    const meJaJoguei = playerIdsWhoPlayed.includes(playerData.id);
    setIJaJoguei(meJaJoguei);

    if (playerIdsWhoPlayed.length > 0) {
      // Top 10 dos que jogaram
      const { data: topData } = await supabase
        .from('players')
        .select('id, riot_game_name, riot_tag_line, d7_points, profile_icon_id')
        .in('id', playerIdsWhoPlayed)
        .order('d7_points', { ascending: false })
        .limit(10);

      if (topData) setTopPlayers(topData);
    }

    // Meus pontos
    const { data: meData } = await supabase
      .from('players')
      .select('d7_points')
      .eq('id', playerData.id)
      .maybeSingle();

    const points = meData?.d7_points || 0;
    setMyPoints(points);

    if (meJaJoguei) {
      // Conta quantos dos que jogaram tem mais pontos que eu
      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .in('id', playerIdsWhoPlayed)
        .gt('d7_points', points);

      setMyPosition((count || 0) + 1);
    } else {
      setMyPosition(null);
    }

    setLoading(false);
  }

  async function handleSavePix() {
    if (!player) return;
    setSavingPix(true);
    setPixSaved(false);

    const { error } = await supabase
      .from('players')
      .update({
        pix_key: pixKey || null,
        pix_key_type: pixKey ? pixKeyType : null,
      })
      .eq('id', player.id);

    if (!error) {
      setPixSaved(true);
      setTimeout(() => setPixSaved(false), 3000);
    }
    setSavingPix(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Carregando perfil...</p>
      </div>
    );
  }

  if (!player) return null;

  const myTier = getTierFromPoints(myPoints);
  const myTierColor = TIER_COLORS[myTier];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Cabecalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Meu Perfil</h1>
          <p className="text-gray-400 text-sm">
            {player.riot_game_name}#{player.riot_tag_line} · Level {player.summoner_level}
          </p>
        </div>

        {/* ===== D7 RANKING - novo bloco com dados reais ===== */}
        <div className="mb-8 p-6 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-400/80 mb-1">D7 Ranking</p>
              <h2 className="text-xl font-bold">Leaderboard nacional</h2>
            </div>
            <Link
              href="/ranking"
              className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              Ver ranking completo →
            </Link>
          </div>

          {/* Minha posicao destacada */}
          {iJaJoguei && myPosition !== null ? (
            <div className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-emerald-400/80 uppercase tracking-wider mb-1">Sua posição</p>
                  <p className="text-3xl font-black">#{myPosition}</p>
                </div>
                <div className="flex-1 border-l border-emerald-500/20 pl-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Tier</p>
                  <p className={`text-lg font-bold uppercase ${myTierColor}`}>{myTier}</p>
                </div>
                <div className="border-l border-emerald-500/20 pl-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Pontos</p>
                  <p className="text-2xl font-black font-mono">{myPoints}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-5 p-4 bg-gray-900/50 border border-gray-800 rounded-lg text-center">
              <p className="text-sm text-gray-400">
                Você ainda não jogou nenhuma partida. Jogue em torneios pra entrar no ranking!
              </p>
            </div>
          )}

          {/* Top 10 */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Top 10 Brasil</p>

            {topPlayers.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Ainda não há jogadores no ranking.
              </div>
            ) : (
              <div className="space-y-1">
                {topPlayers.map((p, index) => {
                  const position = index + 1;
                  const isMe = p.id === player.id;
                  const tier = getTierFromPoints(p.d7_points);
                  const tierColor = TIER_COLORS[tier];
                  const iconUrl = getProfileIconUrl(p.profile_icon_id);

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded ${
                        isMe
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : 'hover:bg-gray-800/50'
                      } transition-colors`}
                    >
                      {/* Posicao */}
                      <div className="w-7 text-center font-mono text-sm font-bold">
                        {position <= 3 ? (
                          <span className={
                            position === 1 ? 'text-yellow-400' :
                            position === 2 ? 'text-gray-300' :
                            'text-orange-400'
                          }>
                            {position}
                          </span>
                        ) : (
                          <span className="text-gray-500">{position}</span>
                        )}
                      </div>

                      {/* Icone */}
                      {iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={iconUrl}
                          alt={p.riot_game_name}
                          className="w-8 h-8 rounded bg-gray-800 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {p.riot_game_name[0]}
                        </div>
                      )}

                      {/* Nome */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">
                          {p.riot_game_name}
                          {isMe && <span className="ml-2 text-xs text-emerald-400">(você)</span>}
                        </p>
                        <p className={`text-[10px] uppercase tracking-wider font-bold ${tierColor}`}>
                          {tier}
                        </p>
                      </div>

                      {/* Pontos */}
                      <div className="font-mono font-bold text-sm shrink-0">
                        {p.d7_points} <span className="text-xs text-gray-500">pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Meus campeonatos - placeholder vazio */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Meus campeonatos</h2>
          <div className="p-8 bg-gray-900/30 border border-dashed border-gray-800 rounded-2xl text-center">
            <p className="text-sm text-gray-400 mb-1">
              Você ainda não participou de nenhum campeonato.
            </p>
            <p className="text-xs text-gray-500">
              Entre em um torneio na aba{' '}
              <Link href="/torneios" className="text-emerald-400 hover:underline">
                Torneios
              </Link>{' '}
              para começar.
            </p>
          </div>
        </div>

        {/* Chave PIX */}
        <div className="mb-8 p-6 bg-gray-900/50 border border-gray-800 rounded-lg">
          <h2 className="text-xl font-bold mb-1">Chave PIX</h2>
          <p className="text-sm text-gray-400 mb-4">
            Cadastre sua chave PIX pra receber premiações de torneios.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 mb-3">
            <select
              value={pixKeyType}
              onChange={(e) => setPixKeyType(e.target.value)}
              className="px-4 py-2 bg-black border border-gray-700 rounded text-white"
            >
              <option value="email">E-mail</option>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="phone">Telefone</option>
              <option value="random">Chave aleatória</option>
            </select>
            <input
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="Sua chave PIX"
              className="px-4 py-2 bg-black border border-gray-700 rounded text-white"
            />
          </div>

          <button
            onClick={handleSavePix}
            disabled={savingPix}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 text-white text-sm font-medium rounded transition-colors"
          >
            {savingPix ? 'Salvando...' : 'Salvar chave PIX'}
          </button>

          {pixSaved && (
            <span className="ml-3 text-emerald-400 text-sm">Chave salva!</span>
          )}
        </div>

        <Link href="/" className="text-emerald-400 text-sm hover:underline">
          ← Voltar pro inicio
        </Link>
      </div>
    </div>
  );
}