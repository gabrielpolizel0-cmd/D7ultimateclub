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

export default function PerfilPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
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

        {/* Card "Em breve" - substitui o card de qualificacao */}
        <div className="mb-8 p-6 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <p className="text-xs uppercase tracking-widest text-emerald-400/80 mb-2">D7 Ranking</p>
          <h2 className="text-xl font-bold mb-2">Em breve</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Estamos preparando o sistema de pontos por campeonatos. Em breve você poderá
            acompanhar sua colocação no ranking nacional do D7.
          </p>
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