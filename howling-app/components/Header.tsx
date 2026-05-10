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
    <header className="border-b border-border-soft bg-bg/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo coroa */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <svg
            width="32"
            height="32"
            viewBox="0 0 40 40"
            className="transition-transform group-hover:scale-105"
            aria-label="D7 Ultimate Club"
          >
            <path
              d="M6 28 L8 14 L14 22 L20 10 L26 22 L32 14 L34 28 Z"
              fill="#00e5b4"
              stroke="#00e5b4"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <rect x="6" y="30" width="28" height="3" fill="#00e5b4" />
          </svg>
          <span className="text-xl font-black tracking-tight">
            <span className="text-text">D7</span>
            <span className="text-text-soft font-bold ml-1.5">Ultimate Club</span>
          </span>
        </Link>

        {/* Menu de navegacao */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-text-soft hover:text-accent text-sm font-medium transition-colors">
            Início
          </Link>
          <Link href="/torneios" className="text-text-soft hover:text-accent text-sm font-medium transition-colors">
            Torneios
          </Link>
          {player && (
            <Link href="/perfil" className="text-text-soft hover:text-accent text-sm font-medium transition-colors">
              Meu perfil
            </Link>
          )}
        </nav>

        {/* Area de usuario */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-32 h-10 bg-bg-card rounded animate-pulse"></div>
          ) : player ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-3 px-3 py-1.5 bg-bg-card hover:bg-bg-hover border border-border rounded-lg transition-colors"
              >
                {getProfileIconUrl(player.profile_icon_id) && !imageError ? (
                  <img
                    src={getProfileIconUrl(player.profile_icon_id)!}
                    alt={player.riot_game_name}
                    className="w-8 h-8 rounded bg-bg"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-8 h-8 bg-accent rounded flex items-center justify-center font-bold text-bg">
                    {player.riot_game_name[0]}
                  </div>
                )}

                <div className="text-left">
                  <p className="text-sm font-bold">
                    {player.riot_game_name}#{player.riot_tag_line}
                  </p>
                  <p className="text-xs text-text-soft">
                    {getRankDisplay()}
                  </p>
                </div>

                <svg className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-bg-card border border-border rounded-lg shadow-2xl overflow-hidden z-50">
                  <div className="p-3 border-b border-border">
                    <p className="text-xs text-text-dim uppercase">Logado como</p>
                    <p className="text-sm font-bold truncate">{player.riot_game_name}#{player.riot_tag_line}</p>
                    <p className="text-xs text-text-soft">Level {player.summoner_level}</p>
                  </div>

                  <Link
                    href="/perfil"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm hover:bg-bg-hover transition-colors"
                  >
                    Meu perfil
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-danger/10 text-danger transition-colors border-t border-border"
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
                className="px-4 py-2 text-sm font-medium text-text-soft hover:text-text transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="px-4 py-2 text-sm font-bold bg-accent hover:bg-accent-deep text-bg rounded transition-colors"
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