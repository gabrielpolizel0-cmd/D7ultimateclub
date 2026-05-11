'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface TeamMember {
  player_id: string;
  is_captain: boolean;
  joined_at: string;
  riot_game_name: string;
  riot_tag_line: string;
  d7_points: number;
  d7_tier: string | null;
  d7_division: string | null;
}

interface Team {
  id: string;
  name: string;
  tag: string | null;
  description: string | null;
  logo_url: string | null;
  captain_id: string;
  tournament_wins: number;
  total_match_wins: number;
  total_match_losses: number;
  created_at: string;
  members: TeamMember[];
}

interface RankingInfo {
  ranking_points: number;
  tier: string;
}

interface PlayerSearchResult {
  id: string;
  riot_game_name: string;
  riot_tag_line: string;
  d7_tier: string | null;
  d7_division: string | null;
  d7_points: number;
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [ranking, setRanking] = useState<RankingInfo | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Convidar jogador
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<string[]>([]); // player IDs com convite pendente

  // Confirmação de ações
  const [confirmAction, setConfirmAction] = useState<{ type: 'kick' | 'leave' | 'delete'; targetId?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [teamId]);

  async function loadData() {
    setLoading(true);

    // Usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase
        .from('players')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (p) setCurrentPlayerId(p.id);
    }

    // Time
    const { data: teamData, error: teamErr } = await supabase
      .from('teams_with_members')
      .select('*')
      .eq('id', teamId)
      .maybeSingle();

    if (teamErr || !teamData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setTeam(teamData as Team);

    // Ranking
    const { data: r } = await supabase
      .from('team_ranking')
      .select('ranking_points, tier')
      .eq('id', teamId)
      .maybeSingle();
    if (r) setRanking(r as RankingInfo);

    // Convites pendentes desse time
    const { data: invites } = await supabase
      .from('team_invites')
      .select('invited_player_id')
      .eq('team_id', teamId)
      .eq('status', 'pending');
    if (invites) setPendingInvites(invites.map(i => i.invited_player_id));

    setLoading(false);
  }

  // ===== Buscar jogadores pra convidar =====
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      // Separa "Nome#Tag" se a pessoa colou o Riot ID completo
      const raw = searchQuery.trim();
      const hashIndex = raw.indexOf('#');

      let nameQuery = raw;
      let tagQuery = '';

      if (hashIndex >= 0) {
        nameQuery = raw.substring(0, hashIndex).trim();
        tagQuery = raw.substring(hashIndex + 1).trim();
      }

      if (nameQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      // Monta a query: sempre filtra pelo nome
      let query = supabase
        .from('players')
        .select('id, riot_game_name, riot_tag_line, d7_tier, d7_division, d7_points')
        .ilike('riot_game_name', `%${nameQuery}%`);

      // Se digitou #tag, filtra também pela tag (começa com)
      if (tagQuery.length > 0) {
        query = query.ilike('riot_tag_line', `${tagQuery}%`);
      }

      const { data } = await query.limit(8);

      // Filtra os que já são membros
      const memberIds = team?.members.map(m => m.player_id) || [];
      const filtered = (data || []).filter(p => !memberIds.includes(p.id));
      setSearchResults(filtered);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, team]);

  // ===== Ações =====
  async function handleInvite(targetPlayerId: string) {
    if (!currentPlayerId || !team) return;
    setInviting(targetPlayerId);
    setInviteMessage(null);

    // Verifica se o player já está em um time
    const { data: existing } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('player_id', targetPlayerId)
      .maybeSingle();

    if (existing) {
      setInviteMessage('Esse jogador já está em um time.');
      setInviting(null);
      return;
    }

    const { error } = await supabase
      .from('team_invites')
      .insert({
        team_id: team.id,
        invited_player_id: targetPlayerId,
        invited_by: currentPlayerId,
        status: 'pending',
      });

    if (error) {
      setInviteMessage(`Erro: ${error.message}`);
    } else {
      setInviteMessage('✓ Convite enviado!');
      setPendingInvites(prev => [...prev, targetPlayerId]);
    }
    setInviting(null);
  }

  async function handleKick(targetPlayerId: string) {
    setActionLoading(true);
    setActionError(null);
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('player_id', targetPlayerId);

    if (error) {
      setActionError(error.message);
      setActionLoading(false);
      return;
    }

    setConfirmAction(null);
    setActionLoading(false);
    await loadData();
  }

  async function handleLeave() {
    if (!currentPlayerId) return;
    setActionLoading(true);
    setActionError(null);
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('player_id', currentPlayerId);

    if (error) {
      setActionError(error.message);
      setActionLoading(false);
      return;
    }

    router.push('/times');
  }

  async function handleDelete() {
    setActionLoading(true);
    setActionError(null);
    // Por causa do CASCADE, deletar o time deleta automaticamente members, invites, etc
    const { error } = await supabase.from('teams').delete().eq('id', teamId);

    if (error) {
      setActionError(error.message);
      setActionLoading(false);
      return;
    }
    router.push('/times');
  }

  // ===== Render =====
  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !team) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-8">
        <div className="max-w-md text-center bg-bg-card border border-border rounded-lg p-8">
          <p className="text-5xl mb-4">😕</p>
          <h1 className="text-2xl font-black mb-2">Time não encontrado</h1>
          <Link href="/times" className="inline-block mt-4 px-6 py-3 bg-accent text-bg font-bold rounded">
            Ver todos os times
          </Link>
        </div>
      </div>
    );
  }

  const isCaptain = currentPlayerId === team.captain_id;
  const isMember = team.members.some(m => m.player_id === currentPlayerId);
  const memberCount = team.members.length;
  const winRate = team.total_match_wins + team.total_match_losses > 0
    ? Math.round((team.total_match_wins / (team.total_match_wins + team.total_match_losses)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="container-custom py-8 md:py-12 max-w-5xl">
        <Link href="/times" className="text-text-soft hover:text-accent text-sm mb-3 inline-block">
          ← Voltar pra lista de times
        </Link>

        {/* Header do time */}
        <div className="bg-bg-card border border-border rounded-xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Logo */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-bg border border-border flex items-center justify-center text-5xl overflow-hidden shrink-0">
              {team.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
              ) : (
                '🛡️'
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-3xl md:text-4xl font-black">{team.name}</h1>
                {team.tag && (
                  <span className="text-lg text-text-soft font-mono">[{team.tag}]</span>
                )}
              </div>
              {ranking && (
                <p className="text-accent font-bold uppercase tracking-wider mb-3">
                  {ranking.tier} · {ranking.ranking_points} pts
                </p>
              )}
              {team.description && (
                <p className="text-sm text-text-soft mb-4">{team.description}</p>
              )}

              <div className="grid grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-[10px] font-bold text-text-dim uppercase">Títulos</p>
                  <p className="text-xl font-black">{team.tournament_wins}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-dim uppercase">Vitórias</p>
                  <p className="text-xl font-black text-accent">{team.total_match_wins}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-dim uppercase">Derrotas</p>
                  <p className="text-xl font-black text-danger">{team.total_match_losses}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-dim uppercase">Win rate</p>
                  <p className="text-xl font-black">{winRate}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ações de capitão */}
        {isCaptain && (
          <div className="bg-accent/5 border border-accent/30 rounded-xl p-5 mb-6">
            <p className="text-sm font-bold text-accent mb-3">👑 Você é o capitão</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowInvite(!showInvite)}
                disabled={memberCount >= 10}
                className="px-4 py-2 bg-accent hover:bg-accent-deep text-bg font-bold rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {memberCount >= 10 ? '🚫 Time cheio (10/10)' : '➕ Convidar jogador'}
              </button>
              <button
                onClick={() => setConfirmAction({ type: 'delete' })}
                className="px-4 py-2 bg-bg border border-danger/30 text-danger hover:bg-danger/10 font-bold rounded text-sm transition-colors"
              >
                🗑️ Excluir time
              </button>
            </div>
          </div>
        )}

        {/* Painel de convite */}
        {showInvite && isCaptain && (
          <div className="bg-bg-card border border-border rounded-xl p-5 mb-6">
            <p className="text-sm font-bold mb-3">Buscar jogador pra convidar</p>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Ex: SrOtto ou SrOtto#BR1"
              className="w-full px-3 py-2 bg-bg border border-border rounded text-sm focus:border-accent outline-none mb-2"
            />
            <p className="text-xs text-text-soft mb-3">
              💡 Digite só o nome pra ver todos, ou inclua a #tag pra busca mais precisa
            </p>

            {inviteMessage && (
              <div className={`p-3 rounded text-sm mb-3 ${
                inviteMessage.startsWith('✓')
                  ? 'bg-accent/10 border border-accent/30 text-accent'
                  : 'bg-danger/10 border border-danger/30 text-danger'
              }`}>
                {inviteMessage}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map(p => {
                  const alreadyInvited = pendingInvites.includes(p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-bg border border-border rounded p-3">
                      <div>
                        <p className="font-bold text-sm">{p.riot_game_name}#{p.riot_tag_line}</p>
                        <p className="text-xs text-text-soft">
                          {p.d7_tier || 'UNRANKED'} {p.d7_division || ''} · {p.d7_points} pts
                        </p>
                      </div>
                      {alreadyInvited ? (
                        <span className="text-xs text-text-soft">Convite pendente</span>
                      ) : (
                        <button
                          onClick={() => handleInvite(p.id)}
                          disabled={inviting === p.id}
                          className="px-3 py-1.5 bg-accent hover:bg-accent-deep text-bg text-xs font-bold rounded disabled:opacity-50"
                        >
                          {inviting === p.id ? 'Enviando...' : 'Convidar'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Roster */}
        <div className="bg-bg-card border border-border rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black">Roster</h2>
            <span className="text-sm text-text-soft">{memberCount}/10 jogadores</span>
          </div>

          <div className="space-y-2">
            {team.members.map(m => (
              <div key={m.player_id} className="flex items-center justify-between bg-bg border border-border rounded p-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {m.is_captain && (
                    <span className="text-xl shrink-0" title="Capitão">👑</span>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">
                      {m.riot_game_name}#{m.riot_tag_line}
                    </p>
                    <p className="text-xs text-text-soft">
                      {m.d7_tier || 'UNRANKED'} {m.d7_division || ''} · {m.d7_points} pts
                    </p>
                  </div>
                </div>

                {/* Botão de expulsar (só capitão, não pode expulsar a si mesmo) */}
                {isCaptain && !m.is_captain && (
                  <button
                    onClick={() => setConfirmAction({ type: 'kick', targetId: m.player_id })}
                    className="px-3 py-1.5 bg-bg border border-danger/30 text-danger hover:bg-danger/10 text-xs font-bold rounded"
                  >
                    Expulsar
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Sair do time (membros, não capitão) */}
          {isMember && !isCaptain && (
            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => setConfirmAction({ type: 'leave' })}
                className="px-4 py-2 bg-bg border border-danger/30 text-danger hover:bg-danger/10 font-bold rounded text-sm"
              >
                🚪 Sair do time
              </button>
            </div>
          )}
        </div>

        {/* Modal de confirmação */}
        {confirmAction && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-bg-card border border-border rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-black mb-3">
                {confirmAction.type === 'kick' && 'Expulsar jogador?'}
                {confirmAction.type === 'leave' && 'Sair do time?'}
                {confirmAction.type === 'delete' && 'Excluir time?'}
              </h3>
              <p className="text-sm text-text-soft mb-5">
                {confirmAction.type === 'kick' && 'O jogador será removido do roster e poderá entrar em outro time.'}
                {confirmAction.type === 'leave' && 'Você será removido do time. Pode entrar em outro depois.'}
                {confirmAction.type === 'delete' && '⚠️ ATENÇÃO: o time será PERMANENTEMENTE excluído. Todos os membros serão removidos. Não dá pra desfazer.'}
              </p>
              {actionError && (
                <div className="p-3 bg-danger/10 border border-danger/30 text-danger rounded text-sm mb-3">
                  ❌ {actionError}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setConfirmAction(null); setActionError(null); }}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-bg border border-border hover:border-accent text-text-soft hover:text-accent font-bold rounded text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (confirmAction.type === 'kick' && confirmAction.targetId) handleKick(confirmAction.targetId);
                    if (confirmAction.type === 'leave') handleLeave();
                    if (confirmAction.type === 'delete') handleDelete();
                  }}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-danger hover:bg-danger/80 text-white font-bold rounded text-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Processando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}