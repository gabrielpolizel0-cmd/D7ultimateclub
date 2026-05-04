'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getTierAndDivision, getNextTierProgress } from '@/lib/ranking';

interface Player {
  id: string;
  riot_game_name: string;
  riot_tag_line: string;
  summoner_level: number;
  profile_icon_id: number | null;
  d7_points: number;
  d7_tier: string;
  d7_division: string | null;
  qualification_matches_played: number;
  aram_total_wins: number;
  aram_total_losses: number;
  last_match_synced_at: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
}

interface AramMatch {
  id: string;
  riot_match_id: string;
  played_at: string;
  duration_seconds: number;
  champion_name: string | null;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  result: string;
  was_qualification: boolean;
  points_change: number;
  points_after: number;
}

const TIER_COLORS: Record<string, string> = {
  UNRANKED: 'text-gray-500 border-gray-700',
  BRONZE: 'text-orange-700 border-orange-700',
  SILVER: 'text-gray-300 border-gray-400',
  GOLD: 'text-yellow-500 border-yellow-500',
  PLATINUM: 'text-cyan-400 border-cyan-400',
  DIAMOND: 'text-blue-400 border-blue-400',
  MASTER: 'text-purple-400 border-purple-400',
  ULTIMATE: 'text-emerald-400 border-emerald-400',
};

export default function PerfilPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [matches, setMatches] = useState<AramMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('email');
  const [savingPix, setSavingPix] = useState(false);
  const [pixSaved, setPixSaved] = useState(false);

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
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!playerData) {
      router.push('/');
      return;
    }

    setPlayer(playerData);
    setPixKey(playerData.pix_key || '');
    setPixKeyType(playerData.pix_key_type || 'email');

    // Carrega ultimas 20 partidas
    const { data: matchesData } = await supabase
      .from('aram_matches')
      .select('*')
      .eq('player_id', playerData.id)
      .order('played_at', { ascending: false })
      .limit(20);

    setMatches(matchesData || []);
    setLoading(false);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Voce precisa estar logado');

      const res = await fetch('/api/sync-matches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erro ao sincronizar');
      }

      setSyncMessage(result.message);
      await loadProfile();
    } catch (e: any) {
      setSyncMessage(`Erro: ${e.message}`);
    } finally {
      setSyncing(false);
    }
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

  const isQualifying = player.qualification_matches_played < 10;
  const totalMatches = player.aram_total_wins + player.aram_total_losses;
  const winrate = totalMatches > 0
    ? ((player.aram_total_wins / totalMatches) * 100).toFixed(1)
    : '0.0';

  const avgKda = matches.length > 0
    ? (matches.reduce((sum, m) => sum + Number(m.kda), 0) / matches.length).toFixed(2)
    : '0.00';

  const tierColor = TIER_COLORS[player.d7_tier] || TIER_COLORS.UNRANKED;
  const progress = !isQualifying ? getNextTierProgress(player.d7_points) : null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Cabecalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Meu Perfil</h1>
          <p className="text-gray-400 text-sm">
            {player.riot_game_name}#{player.riot_tag_line} · Level {player.summoner_level}
          </p>
        </div>

        {/* Card de Rank */}
        <div className={`mb-8 p-8 bg-gray-900/50 border-2 rounded-2xl ${tierColor}`}>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">D7 Rank</p>

          {isQualifying ? (
            <div>
              <h2 className="text-3xl font-extrabold mb-3">EM QUALIFICAÇÃO</h2>
              <div className="w-full bg-gray-800 rounded-full h-3 mb-2">
                <div
                  className="bg-emerald-500 h-3 rounded-full transition-all"
                  style={{ width: `${(player.qualification_matches_played / 10) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400">
                <span className="font-bold text-white">{player.qualification_matches_played}/10</span> partidas
                qualificatorias jogadas
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Faltam {10 - player.qualification_matches_played} partidas pra descobrir seu rank no D7!
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-4xl font-extrabold mb-1">
                {player.d7_tier} {player.d7_division || ''}
              </h2>
              <p className="text-2xl font-mono mb-3">{player.d7_points} pts</p>
              {progress && progress.pointsNeeded > 0 && (
                <>
                  <p className="text-xs text-gray-400 mb-2">
                    Próximo: <span className="text-white font-bold">{progress.nextTierLabel}</span>
                    {' · '}faltam {progress.pointsNeeded} pts
                  </p>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${progress.percentInCurrent}%` }}
                    ></div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Botao de sincronizar */}
        <div className="mb-8">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 text-black font-bold rounded-lg transition-colors"
          >
            {syncing ? 'Sincronizando partidas...' : 'Atualizar minhas partidas'}
          </button>
          {player.last_match_synced_at && (
            <p className="text-xs text-gray-500 mt-2">
              Última sincronização: {new Date(player.last_match_synced_at).toLocaleString('pt-BR')}
            </p>
          )}
          {syncMessage && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${
              syncMessage.startsWith('Erro')
                ? 'bg-red-900/30 border border-red-700 text-red-300'
                : 'bg-emerald-900/30 border border-emerald-700 text-emerald-300'
            }`}>
              {syncMessage}
            </div>
          )}
        </div>

        {/* Estatisticas ARAM */}
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Partidas" value={String(totalMatches)} />
          <Stat label="Vitórias" value={String(player.aram_total_wins)} color="text-emerald-400" />
          <Stat label="Derrotas" value={String(player.aram_total_losses)} color="text-red-400" />
          <Stat label="Win Rate" value={`${winrate}%`} />
        </div>

        {/* Ultimas Partidas */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Últimas partidas ARAM</h2>
          {matches.length === 0 ? (
            <div className="p-8 bg-gray-900/50 border border-gray-800 rounded-lg text-center">
              <p className="text-gray-400 text-sm">
                Nenhuma partida sincronizada ainda. Clica em &quot;Atualizar minhas partidas&quot; pra puxar
                seu histórico do LoL.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {matches.map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </div>
          )}
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

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${color || 'text-white'}`}>{value}</p>
    </div>
  );
}

function MatchRow({ match }: { match: AramMatch }) {
  const isWin = match.result === 'win';
  const date = new Date(match.played_at);
  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const minutes = Math.floor(match.duration_seconds / 60);

  return (
    <div className={`p-3 border rounded-lg flex items-center gap-3 ${
      isWin ? 'bg-emerald-900/10 border-emerald-900/40' : 'bg-red-900/10 border-red-900/40'
    }`}>
      <div className={`w-2 h-12 rounded ${isWin ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
      <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
        <div>
          <p className={`font-bold ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
            {isWin ? 'VITÓRIA' : 'DERROTA'}
          </p>
          <p className="text-xs text-gray-500">{dateStr} {timeStr}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Campeão</p>
          <p className="font-medium">{match.champion_name || '?'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">KDA</p>
          <p className="font-mono">
            {match.kills}/{match.deaths}/{match.assists}{' '}
            <span className="text-gray-500">({Number(match.kda).toFixed(2)})</span>
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Duração</p>
          <p className="font-mono">{minutes}min</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">
            Pontos {match.was_qualification && <span className="text-yellow-400">(Q)</span>}
          </p>
          <p className={`font-mono font-bold ${
            match.points_change > 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {match.points_change > 0 ? '+' : ''}
            {match.points_change}
          </p>
        </div>
      </div>
    </div>
  );
}