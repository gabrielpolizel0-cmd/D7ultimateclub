'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getNextTierProgress } from '@/lib/ranking';

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
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('email');
  const [savingPix, setSavingPix] = useState(false);
  const [pixSaved, setPixSaved] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);

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

  async function handleDebug() {
    setDebugLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Voce precisa estar logado');
        return;
      }

      const res = await fetch('/api/debug-queues', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      console.log('==== DEBUG QUEUES ====');
      console.log(data);
      console.log('======================');

      // Mostra um resumo no alert (compacto)
      const resumo = data.partidas
        ? data.partidas.map((p: any) =>
            `Q${p.queueId} | ${p.gameMode} | ${p.campeao} ${p.kda} | ${p.jogadoEm}`
          ).join('\n')
        : JSON.stringify(data, null, 2);

      alert('Resultado (veja tambem o Console F12):\n\n' + resumo);
    } catch (e: any) {
      alert('Erro: ' + e.message);
    } finally {
      setDebugLoading(false);
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

  const tierColor = TIER_COLORS[player.d7_tier] || TIER_COLORS.UNRANKED;
  const progress = !isQualifying ? getNextTierProgress(player.d7_points) : null;

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

        {/* Card de Rank */}
        <div className={`mb-8 p-8 bg-gray-900/50 border-2 rounded-2xl ${tierColor}`}>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">D7 Rank · ARAM Desordem</p>

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

        {/* Botoes de a‪ção */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 text-black font-bold rounded-lg transition-colors"
          >
            {syncing ? 'Sincronizando partidas...' : 'Atualizar minhas partidas'}
          </button>

          <button
            onClick={handleDebug}
            disabled={debugLoading}
            className="px-4 py-3 bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors"
          >
            {debugLoading ? 'Buscando...' : '🔍 Debug Queues'}
          </button>
        </div>

        {player.last_match_synced_at && (
          <p className="text-xs text-gray-500 -mt-6 mb-6">
            Última sincronização: {new Date(player.last_match_synced_at).toLocaleString('pt-BR')}
          </p>
        )}

        {syncMessage && (
          <div className={`mb-6 p-3 rounded-lg text-sm ${
            syncMessage.startsWith('Erro')
              ? 'bg-red-900/30 border border-red-700 text-red-300'
              : 'bg-emerald-900/30 border border-emerald-700 text-emerald-300'
          }`}>
            {syncMessage}
          </div>
        )}

        {/* Estatisticas ARAM */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Estatísticas ARAM Desordem</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Partidas" value={String(totalMatches)} />
            <Stat label="Vitórias" value={String(player.aram_total_wins)} color="text-emerald-400" />
            <Stat label="Derrotas" value={String(player.aram_total_losses)} color="text-red-400" />
            <Stat label="Win Rate" value={`${winrate}%`} />
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

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${color || 'text-white'}`}>{value}</p>
    </div>
  );
}