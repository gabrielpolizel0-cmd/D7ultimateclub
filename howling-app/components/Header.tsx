'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { Player } from '@/lib/supabaseClient';

export default function Header() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    async function loadPlayer() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setPlayer(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      setPlayer(data);
      setImageError(false);
      setLoading(false);
    }

    loadPlayer();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadPlayer();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push('/');
    router.refresh();
  }

  function getRankDisplay() {
    if (!player) return null;
    if (!player.current_tier) return 'UNRANKED';
    return `${player.current_tier} ${player.current_rank || ''} • ${player.current_lp} LP`;
  }

  function getProfileIconUrl(iconId: number | null) {
    if (!iconId) return null;
    return `https://ddragon.leagueoflegends.com/cdn/16.9.1/img/profileicon/${iconId}.png`;
  }

  return (
    <header className="border-b border-gray-800 bg-black">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-400 rounded flex items-center justify-center">
            <span className="text-black font-bold text-xl">D</span>
          </div>
          <span className="text-xl font-bold">D7 Ultimate Club</span>
        </Link>

        {/* Menu de navegacao */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">Inicio</Link>
          <Link href="/torneios" className="text-gray-400 hover:text-white transition-colors">Torneios</Link>
          {player && (
            <Link href="/perfil" className="text-gray-400 hover:text-white transition-colors">Meu perfil</Link>
          )}
        </nav>

        {/* Area de usuario */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-32 h-10 bg-gray-900 rounded animate-pulse"></div>
          ) : player ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-3 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg transition-colors"
              >
                {/* Icone do summoner com fallback automatico */}
                {getProfileIconUrl(player.profile_icon_id) && !imageError ? (
                  <img
                    src={getProfileIconUrl(player.profile_icon_id)!}
                    alt={player.riot_game_name}
                    className="w-8 h-8 rounded bg-gray-800"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-bold text-black">
                    {player.riot_game_name[0]}
                  </div>
                )}
                
                <div className="text-left">
                  <p className="text-sm font-bold">
                    {player.riot_game_name}#{player.riot_tag_line}
                  </p>
                  <p className="text-xs text-gray-400">
                    {getRankDisplay()}
                  </p>
                </div>

                <svg className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Menu dropdown */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl overflow-hidden z-50">
                  <div className="p-3 border-b border-gray-800">
                    <p className="text-xs text-gray-500 uppercase">Logado como</p>
                    <p className="text-sm font-bold truncate">{player.riot_game_name}#{player.riot_tag_line}</p>
                    <p className="text-xs text-gray-400">Level {player.summoner_level}</p>
                  </div>
                  
                  <Link
                    href="/perfil"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm hover:bg-gray-800 transition-colors"
                  >
                    Meu perfil
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-red-900/30 text-red-400 transition-colors border-t border-gray-800"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="px-4 py-2 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-black rounded transition-colors"
              >
                Cadastrar
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}