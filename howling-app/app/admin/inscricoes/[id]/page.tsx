'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface PageProps {
  params: { id: string };
}

interface Player {
  id: string;
  riot_game_name: string;
  riot_tag_line: string;
}

interface Registration {
  id: string;
  team_id: string | null;
  payment_status: 'pending' | 'paid' | 'rejected' | 'cancelled';
  payment_amount: number | null;
  created_at: string;
  paid_at: string | null;
  admin_note: string | null;
  players: Player | Player[] | null;
}

interface Team {
  id: string;
  name: string;
  tag: string | null;
  logo_url: string | null;
  tournament_wins: number;
}

interface Tournament {
  id: string;
  name: string;
  entry_fee: number | null;
  prize_pool: number;
  max_teams: number;
  winner_team_id: string | null;
}

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function formatDateTime(s: string) {
  return new Date(s).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type AccessState = 'checking' | 'unauthorized' | 'not_admin' | 'admin';

export default function AdminInscricoesPage({ params }: PageProps) {
  const router = useRouter();

  const [access, setAccess] = useState<AccessState>('checking');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'paid' | 'all'>('pending');
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal de campeão
  const [showChampionModal, setShowChampionModal] = useState(false);
  const [selectedChampionId, setSelectedChampionId] = useState<string | null>(null);
  const [settingChampion, setSettingChampion] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAccess('unauthorized'); return; }
      const { data: player } = await supabase
        .from('players').select('is_admin').eq('auth_user_id', user.id).single();
      if (!player || !player.is_admin) { setAccess('not_admin'); return; }
      setAccess('admin');
    }
    checkAccess();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: t } = await supabase
      .from('tournaments')
      .select('id, name, entry_fee, prize_pool, max_teams, winner_team_id')
      .eq('id', params.id)
      .single();
    if (t) setTournament(t as Tournament);

    const { data: regs, error: regsError } = await supabase
      .from('registrations')
      .select(`
        id, team_id, payment_status, payment_amount,
        created_at, paid_at, admin_note,
        players ( id, riot_game_name, riot_tag_line )
      `)
      .eq('tournament_id', params.id)
      .order('created_at', { ascending: true });

    if (regsError) {
      setError(regsError.message);
    } else {
      setRegistrations((regs || []) as Registration[]);

      // Busca dados dos times únicos
      const teamIds = Array.from(new Set((regs || []).map(r => r.team_id).filter(Boolean))) as string[];
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, tag, logo_url, tournament_wins')
          .in('id', teamIds);
        if (teamsData) {
          const map: Record<string, Team> = {};
          for (const t of teamsData) map[t.id] = t as Team;
          setTeams(map);
        }
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    if (access === 'admin') loadData();
  }, [params.id, access]);

  async function handleConfirm(reg: Registration) {
    const player = Array.isArray(reg.players) ? reg.players[0] : reg.players;
    const team = reg.team_id ? teams[reg.team_id] : null;
    const label = player ? `${player.riot_game_name}#${player.riot_tag_line}` : '(jogador)';
    if (!confirm(`Confirmar pagamento de ${label}${team ? ` (time ${team.name})` : ''}?`)) return;

    setActing(reg.id);
    setError(null);

    const { error: updateError } = await supabase
      .from('registrations')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', reg.id);

    if (updateError) setError(`Erro ao confirmar: ${updateError.message}`);
    else await loadData();
    setActing(null);
  }

  async function handleReject(reg: Registration) {
    const player = Array.isArray(reg.players) ? reg.players[0] : reg.players;
    const label = player ? `${player.riot_game_name}#${player.riot_tag_line}` : '(jogador)';
    const motivo = prompt(`Rejeitar inscrição de ${label}. Motivo (opcional):`, '');
    if (motivo === null) return;

    setActing(reg.id);
    setError(null);
    const { error: updateError } = await supabase
      .from('registrations')
      .update({ payment_status: 'rejected', admin_note: motivo || null })
      .eq('id', reg.id);

    if (updateError) setError(`Erro ao rejeitar: ${updateError.message}`);
    else await loadData();
    setActing(null);
  }

  async function handleRevert(reg: Registration) {
    const player = Array.isArray(reg.players) ? reg.players[0] : reg.players;
    const label = player ? `${player.riot_game_name}#${player.riot_tag_line}` : '(jogador)';
    if (!confirm(`Voltar inscrição de ${label} pra status PENDENTE?`)) return;

    setActing(reg.id);
    setError(null);
    const { error: updateError } = await supabase
      .from('registrations')
      .update({ payment_status: 'pending', paid_at: null, admin_note: null })
      .eq('id', reg.id);

    if (updateError) setError(`Erro ao reverter: ${updateError.message}`);
    else await loadData();
    setActing(null);
  }

  // ============ CAMPEÃO ============
  async function handleSetChampion() {
    if (!selectedChampionId || !tournament) return;
    setSettingChampion(true);
    setError(null);

    try {
      // 1. Marca o time como vencedor no torneio
      const { error: tErr } = await supabase
        .from('tournaments')
        .update({ winner_team_id: selectedChampionId })
        .eq('id', tournament.id);
      if (tErr) throw new Error(tErr.message);

      // 2. Incrementa tournament_wins do time (+1)
      const team = teams[selectedChampionId];
      if (team) {
        const { error: teamErr } = await supabase
          .from('teams')
          .update({ tournament_wins: team.tournament_wins + 1 })
          .eq('id', selectedChampionId);
        if (teamErr) throw new Error(teamErr.message);
      }

      setShowChampionModal(false);
      setSelectedChampionId(null);
      await loadData();
    } catch (e: any) {
      setError(`Erro ao definir campeão: ${e.message}`);
    }
    setSettingChampion(false);
  }

  async function handleRemoveChampion() {
    if (!tournament || !tournament.winner_team_id) return;
    if (!confirm('Remover o time campeão? O contador de títulos do time vai diminuir em 1.')) return;

    setSettingChampion(true);
    setError(null);

    try {
      const currentWinnerId = tournament.winner_team_id;
      const team = teams[currentWinnerId];

      // 1. Remove vencedor do torneio
      const { error: tErr } = await supabase
        .from('tournaments')
        .update({ winner_team_id: null })
        .eq('id', tournament.id);
      if (tErr) throw new Error(tErr.message);

      // 2. Decrementa tournament_wins do time (-1, mas no mínimo 0)
      if (team) {
        const { error: teamErr } = await supabase
          .from('teams')
          .update({ tournament_wins: Math.max(0, team.tournament_wins - 1) })
          .eq('id', currentWinnerId);
        if (teamErr) throw new Error(teamErr.message);
      }

      await loadData();
    } catch (e: any) {
      setError(`Erro ao remover campeão: ${e.message}`);
    }
    setSettingChampion(false);
  }

  // ===== Telas de acesso =====
  if (access === 'checking') {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-border border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-soft text-sm">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (access === 'unauthorized') {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-8">
        <div className="max-w-md text-center bg-bg-card border border-border rounded-lg p-8">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-2xl font-black mb-2">Acesso restrito</h1>
          <button onClick={() => router.push('/login')} className="px-6 py-3 bg-accent hover:bg-accent-deep text-bg font-bold rounded">Fazer login</button>
        </div>
      </div>
    );
  }

  if (access === 'not_admin') {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-8">
        <div className="max-w-md text-center bg-bg-card border border-border rounded-lg p-8">
          <p className="text-5xl mb-4">🚫</p>
          <h1 className="text-2xl font-black mb-2">Acesso negado</h1>
          <button onClick={() => router.push('/')} className="px-6 py-3 bg-bg border border-border hover:border-accent">Voltar pra home</button>
        </div>
      </div>
    );
  }

  // Estatísticas
  const total = registrations.length;
  const pendentes = registrations.filter(r => r.payment_status === 'pending').length;
  const pagos = registrations.filter(r => r.payment_status === 'paid').length;
  const receita = registrations
    .filter(r => r.payment_status === 'paid')
    .reduce((acc, r) => acc + Number(r.payment_amount || 0), 0);

  // Agrupar por time
  const groupedByTeam: Record<string, Registration[]> = {};
  const noTeamRegs: Registration[] = [];
  for (const reg of registrations) {
    if (reg.payment_status === 'cancelled') continue;
    if (filter !== 'all' && reg.payment_status !== filter) continue;
    if (reg.team_id) {
      if (!groupedByTeam[reg.team_id]) groupedByTeam[reg.team_id] = [];
      groupedByTeam[reg.team_id].push(reg);
    } else {
      noTeamRegs.push(reg);
    }
  }

  const teamIdsToShow = Object.keys(groupedByTeam);
  const totalShowing = teamIdsToShow.reduce((acc, id) => acc + groupedByTeam[id].length, 0) + noTeamRegs.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text p-8">
        <div className="container-custom">
          <div className="h-32 bg-bg-card border border-border rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-bg text-text p-8">
        <div className="container-custom"><p>Torneio não encontrado.</p></div>
      </div>
    );
  }

  const winnerTeam = tournament.winner_team_id ? teams[tournament.winner_team_id] : null;

  return (
    <div className="min-h-screen bg-bg text-text relative">
      <div className="glow-bg" />

      <div className="container-custom py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.push(`/torneios/${params.id}`)} className="text-text-soft hover:text-accent text-sm mb-3">
            ← Voltar pro torneio
          </button>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-black">Admin · Inscrições</h1>
            <span className="px-2 py-0.5 bg-accent/20 text-accent text-[10px] font-bold rounded uppercase tracking-wider">👑 Admin</span>
          </div>
          <p className="text-text-soft">{tournament.name}</p>
        </div>

        {/* CAMPEÃO */}
        <div className="bg-gradient-to-r from-accent/10 to-transparent border border-accent/30 rounded-xl p-5 mb-6">
          {winnerTeam ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🏆</span>
                <div>
                  <p className="text-xs font-bold text-accent uppercase tracking-wider">Campeão do torneio</p>
                  <p className="text-2xl font-black">{winnerTeam.name} {winnerTeam.tag && <span className="text-text-soft text-lg font-mono">[{winnerTeam.tag}]</span>}</p>
                </div>
              </div>
              <button
                onClick={handleRemoveChampion}
                disabled={settingChampion}
                className="px-4 py-2 bg-bg border border-danger/30 text-danger hover:bg-danger/10 text-sm font-bold rounded disabled:opacity-50"
              >
                Remover campeão
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-bold text-text-soft mb-1">🏆 Definir campeão do torneio</p>
                <p className="text-xs text-text-soft">Marca qual time venceu o torneio. Vai somar +1 título pra eles.</p>
              </div>
              <button
                onClick={() => setShowChampionModal(true)}
                disabled={teamIdsToShow.length === 0}
                className="px-4 py-2 bg-accent hover:bg-accent-deep text-bg font-bold rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {teamIdsToShow.length === 0 ? 'Sem times inscritos' : 'Definir campeão'}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <p className="text-[11px] font-bold text-text-dim uppercase tracking-wider">Total</p>
            <p className="text-2xl font-black">{total}</p>
          </div>
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
            <p className="text-[11px] font-bold text-warning uppercase tracking-wider">Pendentes</p>
            <p className="text-2xl font-black text-warning">{pendentes}</p>
          </div>
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
            <p className="text-[11px] font-bold text-accent uppercase tracking-wider">Pagos</p>
            <p className="text-2xl font-black text-accent">{pagos}</p>
          </div>
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <p className="text-[11px] font-bold text-text-dim uppercase tracking-wider">Receita</p>
            <p className="text-2xl font-black">R$ {fmt(receita)}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'pending' ? 'bg-warning text-bg' : 'bg-bg-card border border-border hover:border-warning'}`}>
            Pendentes ({pendentes})
          </button>
          <button onClick={() => setFilter('paid')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'paid' ? 'bg-accent text-bg' : 'bg-bg-card border border-border hover:border-accent'}`}>
            Pagos ({pagos})
          </button>
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'all' ? 'bg-text text-bg' : 'bg-bg-card border border-border hover:border-text'}`}>
            Todos ({total - registrations.filter(r => r.payment_status === 'cancelled').length})
          </button>
        </div>

        {error && (
          <div className="p-3 bg-danger/20 border border-danger/40 rounded mb-4 text-sm">❌ {error}</div>
        )}

        {/* Lista agrupada por time */}
        {totalShowing === 0 ? (
          <div className="bg-bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-5xl mb-3">🦗</p>
            <p className="text-text-soft">Nenhuma inscrição {filter === 'pending' ? 'pendente' : filter === 'paid' ? 'paga' : ''}.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {teamIdsToShow.map(teamId => {
              const team = teams[teamId];
              const teamRegs = groupedByTeam[teamId];
              const teamPaid = teamRegs.filter(r => r.payment_status === 'paid').length;
              const isWinner = tournament.winner_team_id === teamId;

              return (
                <div key={teamId} className={`bg-bg-card border rounded-xl overflow-hidden ${isWinner ? 'border-accent' : 'border-border'}`}>
                  {/* Header do time */}
                  <div className={`px-5 py-4 border-b ${isWinner ? 'bg-accent/10 border-accent/30' : 'bg-bg border-border'}`}>
                    <div className="flex items-center gap-3 flex-wrap">
                      {isWinner && <span className="text-2xl">🏆</span>}
                      <div className="w-10 h-10 rounded bg-bg border border-border flex items-center justify-center text-xl overflow-hidden shrink-0">
                        {team?.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                        ) : (
                          '🛡️'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-lg truncate">
                          {team?.name || '(time desconhecido)'}
                          {team?.tag && <span className="text-text-soft font-mono text-sm ml-2">[{team.tag}]</span>}
                        </p>
                        <p className="text-xs text-text-soft">
                          {teamRegs.length} jogador{teamRegs.length > 1 ? 'es' : ''} inscrito{teamRegs.length > 1 ? 's' : ''} · {teamPaid} pago{teamPaid !== 1 ? 's' : ''} · Total: R$ {fmt(teamRegs.filter(r => r.payment_status === 'paid').reduce((a, r) => a + Number(r.payment_amount || 0), 0))}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Jogadores do time */}
                  <div className="divide-y divide-border">
                    {teamRegs.map(reg => {
                      const player = Array.isArray(reg.players) ? reg.players[0] : reg.players;
                      const isActing = acting === reg.id;
                      return (
                        <div key={reg.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-bold text-sm truncate">
                                {player ? `${player.riot_game_name}#${player.riot_tag_line}` : '?'}
                              </p>
                              {reg.payment_status === 'pending' && (
                                <span className="px-2 py-0.5 bg-warning/20 text-warning text-[10px] font-bold rounded uppercase">Pendente</span>
                              )}
                              {reg.payment_status === 'paid' && (
                                <span className="px-2 py-0.5 bg-accent/20 text-accent text-[10px] font-bold rounded uppercase">✓ Pago</span>
                              )}
                              {reg.payment_status === 'rejected' && (
                                <span className="px-2 py-0.5 bg-danger/20 text-danger text-[10px] font-bold rounded uppercase">✗ Rejeitado</span>
                              )}
                            </div>
                            <div className="text-xs text-text-soft">
                              Inscrito: {formatDateTime(reg.created_at)}
                              {reg.paid_at && ` · Pago: ${formatDateTime(reg.paid_at)}`}
                            </div>
                            {reg.admin_note && (
                              <p className="text-xs text-danger mt-1">Motivo: {reg.admin_note}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-black text-accent">R$ {fmt(Number(reg.payment_amount || 0))}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                              {reg.payment_status === 'pending' && (
                                <>
                                  <button onClick={() => handleConfirm(reg)} disabled={isActing}
                                    className="px-3 py-1.5 bg-accent hover:bg-accent-deep text-bg text-xs font-bold rounded disabled:opacity-50 whitespace-nowrap">
                                    {isActing ? '...' : '✓ Confirmar'}
                                  </button>
                                  <button onClick={() => handleReject(reg)} disabled={isActing}
                                    className="px-3 py-1.5 border border-danger/40 text-danger hover:bg-danger/10 text-xs font-bold rounded disabled:opacity-50 whitespace-nowrap">
                                    ✗ Rejeitar
                                  </button>
                                </>
                              )}
                              {(reg.payment_status === 'paid' || reg.payment_status === 'rejected') && (
                                <button onClick={() => handleRevert(reg)} disabled={isActing}
                                  className="px-3 py-1.5 border border-border hover:border-warning text-text-soft hover:text-warning text-xs font-bold rounded disabled:opacity-50 whitespace-nowrap">
                                  ↺ Reverter
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Inscrições sem time (lixo antigo do sistema antigo) */}
            {noTeamRegs.length > 0 && (
              <div className="bg-bg-card border border-warning/30 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-warning/30 bg-warning/5">
                  <p className="font-bold text-sm text-warning">⚠️ Sem time (legado)</p>
                  <p className="text-xs text-text-soft">Essas inscrições foram feitas no sistema antigo. Podem ser canceladas/ignoradas.</p>
                </div>
                <div className="divide-y divide-border">
                  {noTeamRegs.map(reg => {
                    const player = Array.isArray(reg.players) ? reg.players[0] : reg.players;
                    const isActing = acting === reg.id;
                    return (
                      <div key={reg.id} className="p-4 flex justify-between items-center gap-3">
                        <p className="text-sm">{player ? `${player.riot_game_name}#${player.riot_tag_line}` : '?'}</p>
                        <span className="text-xs text-text-soft">{reg.payment_status}</span>
                        {reg.payment_status === 'pending' && (
                          <button onClick={() => handleReject(reg)} disabled={isActing}
                            className="px-3 py-1.5 border border-danger/40 text-danger hover:bg-danger/10 text-xs font-bold rounded disabled:opacity-50">
                            ✗ Rejeitar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: definir campeão */}
      {showChampionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-bg-card border border-border rounded-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-black mb-2">🏆 Definir campeão</h3>
            <p className="text-sm text-text-soft mb-5">
              Escolhe o time que venceu esse torneio. Vai adicionar +1 título nas estatísticas deles.
            </p>

            <div className="space-y-2 mb-5 max-h-64 overflow-y-auto">
              {teamIdsToShow.map(teamId => {
                const team = teams[teamId];
                if (!team) return null;
                return (
                  <button
                    key={teamId}
                    onClick={() => setSelectedChampionId(teamId)}
                    className={`w-full text-left p-3 border rounded-lg transition-colors ${
                      selectedChampionId === teamId
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-accent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-bg border border-border flex items-center justify-center text-xl overflow-hidden shrink-0">
                        {team.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                        ) : (
                          '🛡️'
                        )}
                      </div>
                      <div>
                        <p className="font-bold">{team.name} {team.tag && <span className="text-text-soft font-mono text-sm">[{team.tag}]</span>}</p>
                        <p className="text-xs text-text-soft">{team.tournament_wins} título{team.tournament_wins !== 1 ? 's' : ''} atualmente</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowChampionModal(false); setSelectedChampionId(null); }}
                disabled={settingChampion}
                className="px-4 py-2 bg-bg border border-border hover:border-accent text-text-soft hover:text-accent font-bold rounded text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSetChampion}
                disabled={settingChampion || !selectedChampionId}
                className="px-6 py-2 bg-accent hover:bg-accent-deep text-bg font-bold rounded text-sm disabled:opacity-50"
              >
                {settingChampion ? 'Salvando...' : '🏆 Confirmar campeão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}