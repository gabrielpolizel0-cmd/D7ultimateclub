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
  team_name: string | null;
  payment_status: 'pending' | 'paid' | 'rejected' | 'cancelled';
  payment_amount: number | null;
  is_captain: boolean;
  created_at: string;
  paid_at: string | null;
  admin_note: string | null;
  players: Player | Player[] | null;
}

interface Tournament {
  id: string;
  name: string;
  entry_fee: number | null;
  prize_pool: number;
  max_teams: number;
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

  // 🔐 Estado de acesso
  const [access, setAccess] = useState<AccessState>('checking');

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'paid' | 'all'>('pending');
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 🔐 Verifica autenticação e admin
  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setAccess('unauthorized');
        return;
      }

      const { data: player, error } = await supabase
        .from('players')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single();

      if (error || !player || !player.is_admin) {
        setAccess('not_admin');
        return;
      }

      setAccess('admin');
    }

    checkAccess();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: t } = await supabase
      .from('tournaments')
      .select('id, name, entry_fee, prize_pool, max_teams')
      .eq('id', params.id)
      .single();

    if (t) setTournament(t as Tournament);

    const { data: regs, error: regsError } = await supabase
      .from('registrations')
      .select(`
        id,
        team_name,
        payment_status,
        payment_amount,
        is_captain,
        created_at,
        paid_at,
        admin_note,
        players (
          id,
          riot_game_name,
          riot_tag_line
        )
      `)
      .eq('tournament_id', params.id)
      .order('created_at', { ascending: true });

    if (regsError) {
      setError(regsError.message);
    } else {
      setRegistrations((regs || []) as Registration[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (access === 'admin') {
      loadData();
    }
  }, [params.id, access]);

  async function handleConfirm(reg: Registration) {
    if (!confirm(`Confirmar pagamento do time "${reg.team_name}"?`)) return;

    setActing(reg.id);
    setError(null);

    const { error: updateError } = await supabase
      .from('registrations')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', reg.id);

    if (updateError) {
      setError(`Erro ao confirmar: ${updateError.message}`);
    } else {
      await loadData();
    }
    setActing(null);
  }

  async function handleReject(reg: Registration) {
    const motivo = prompt(
      `Rejeitar inscrição do time "${reg.team_name}". Motivo (opcional, vai aparecer pro capitão):`,
      ''
    );
    if (motivo === null) return; // cancelou

    setActing(reg.id);
    setError(null);

    const { error: updateError } = await supabase
      .from('registrations')
      .update({
        payment_status: 'rejected',
        admin_note: motivo || null,
      })
      .eq('id', reg.id);

    if (updateError) {
      setError(`Erro ao rejeitar: ${updateError.message}`);
    } else {
      await loadData();
    }
    setActing(null);
  }

  async function handleRevert(reg: Registration) {
    if (!confirm(`Voltar o time "${reg.team_name}" pra status PENDENTE?`)) return;

    setActing(reg.id);
    setError(null);

    const { error: updateError } = await supabase
      .from('registrations')
      .update({
        payment_status: 'pending',
        paid_at: null,
        admin_note: null,
      })
      .eq('id', reg.id);

    if (updateError) {
      setError(`Erro ao reverter: ${updateError.message}`);
    } else {
      await loadData();
    }
    setActing(null);
  }

  // 🔐 Tela: verificando acesso
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

  // 🔐 Tela: não logado
  if (access === 'unauthorized') {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-8">
        <div className="max-w-md text-center bg-bg-card border border-border rounded-lg p-8">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-2xl font-black mb-2">Acesso restrito</h1>
          <p className="text-text-soft mb-6">
            Você precisa estar logado pra acessar essa área.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-accent hover:bg-accent-deep text-bg font-bold rounded transition-colors"
          >
            Fazer login
          </button>
        </div>
      </div>
    );
  }

  // 🔐 Tela: não é admin
  if (access === 'not_admin') {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-8">
        <div className="max-w-md text-center bg-bg-card border border-border rounded-lg p-8">
          <p className="text-5xl mb-4">🚫</p>
          <h1 className="text-2xl font-black mb-2">Acesso negado</h1>
          <p className="text-text-soft mb-6">
            Essa área é exclusiva pra equipe administrativa do D7 Ultimate Club.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-bg border border-border hover:border-accent text-text-soft hover:text-accent font-bold rounded transition-colors"
          >
            Voltar pra home
          </button>
        </div>
      </div>
    );
  }

  // Estatísticas
  const total = registrations.length;
  const pendentes = registrations.filter(r => r.payment_status === 'pending').length;
  const pagos = registrations.filter(r => r.payment_status === 'paid').length;
  const rejeitados = registrations.filter(r => r.payment_status === 'rejected').length;
  const receita = registrations
    .filter(r => r.payment_status === 'paid')
    .reduce((acc, r) => acc + Number(r.payment_amount || 0), 0);
  const vagasRestantes = tournament ? tournament.max_teams - pagos : 0;

  // Filtro
  const filtered = registrations.filter(r => {
    if (filter === 'all') return r.payment_status !== 'cancelled';
    return r.payment_status === filter;
  });

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
        <div className="container-custom">
          <p>Torneio não encontrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text relative">
      <div className="glow-bg" />

      <div className="container-custom py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/torneios/${params.id}`)}
            className="text-text-soft hover:text-accent text-sm mb-3"
          >
            ← Voltar pro torneio
          </button>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-black">
              Admin · Inscrições
            </h1>
            <span className="px-2 py-0.5 bg-accent/20 text-accent text-[10px] font-bold rounded uppercase tracking-wider">
              👑 Admin
            </span>
          </div>
          <p className="text-text-soft">{tournament.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <p className="text-[11px] font-bold text-text-dim uppercase tracking-wider">
              Total
            </p>
            <p className="text-2xl font-black">{total}</p>
          </div>
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
            <p className="text-[11px] font-bold text-warning uppercase tracking-wider">
              Pendentes
            </p>
            <p className="text-2xl font-black text-warning">{pendentes}</p>
          </div>
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
            <p className="text-[11px] font-bold text-accent uppercase tracking-wider">
              Pagos
            </p>
            <p className="text-2xl font-black text-accent">
              {pagos} <span className="text-sm text-text-soft font-normal">/ {tournament.max_teams}</span>
            </p>
          </div>
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <p className="text-[11px] font-bold text-text-dim uppercase tracking-wider">
              Receita
            </p>
            <p className="text-2xl font-black">R$ {fmt(receita)}</p>
          </div>
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <p className="text-[11px] font-bold text-text-dim uppercase tracking-wider">
              Vagas
            </p>
            <p className={`text-2xl font-black ${vagasRestantes <= 3 ? 'text-warning' : ''}`}>
              {vagasRestantes}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              filter === 'pending'
                ? 'bg-warning text-bg'
                : 'bg-bg-card border border-border hover:border-warning'
            }`}
          >
            Pendentes ({pendentes})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              filter === 'paid'
                ? 'bg-accent text-bg'
                : 'bg-bg-card border border-border hover:border-accent'
            }`}
          >
            Pagos ({pagos})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              filter === 'all'
                ? 'bg-text text-bg'
                : 'bg-bg-card border border-border hover:border-text'
            }`}
          >
            Todos ({total - registrations.filter(r => r.payment_status === 'cancelled').length})
          </button>
        </div>

        {error && (
          <div className="p-3 bg-danger/20 border border-danger/40 rounded mb-4 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Lista de inscrições */}
        {filtered.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-5xl mb-3">🦗</p>
            <p className="text-text-soft">
              Nenhuma inscrição {filter === 'pending' ? 'pendente' : filter === 'paid' ? 'paga' : ''}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(reg => {
              const player = Array.isArray(reg.players) ? reg.players[0] : reg.players;
              const isActing = acting === reg.id;

              return (
                <div
                  key={reg.id}
                  className="bg-bg-card border border-border rounded-lg p-5"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-lg font-black">
                          {reg.team_name || '(sem nome)'}
                        </h3>
                        {reg.payment_status === 'pending' && (
                          <span className="px-2 py-0.5 bg-warning/20 text-warning text-[10px] font-bold rounded uppercase">
                            Pendente
                          </span>
                        )}
                        {reg.payment_status === 'paid' && (
                          <span className="px-2 py-0.5 bg-accent/20 text-accent text-[10px] font-bold rounded uppercase">
                            ✓ Pago
                          </span>
                        )}
                        {reg.payment_status === 'rejected' && (
                          <span className="px-2 py-0.5 bg-danger/20 text-danger text-[10px] font-bold rounded uppercase">
                            ✗ Rejeitado
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-text-soft space-y-0.5">
                        <p>
                          <span className="text-text-dim">Capitão:</span>{' '}
                          <span className="font-mono">
                            {player ? `${player.riot_game_name}#${player.riot_tag_line}` : '?'}
                          </span>
                        </p>
                        <p>
                          <span className="text-text-dim">Inscrito:</span>{' '}
                          {formatDateTime(reg.created_at)}
                        </p>
                        {reg.paid_at && (
                          <p>
                            <span className="text-text-dim">Pago em:</span>{' '}
                            {formatDateTime(reg.paid_at)}
                          </p>
                        )}
                        {reg.admin_note && (
                          <p className="text-danger">
                            <span className="text-text-dim">Motivo da rejeição:</span>{' '}
                            {reg.admin_note}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Valor + Ações */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[11px] font-bold text-text-dim uppercase">
                          Valor
                        </p>
                        <p className="text-xl font-black text-accent">
                          R$ {fmt(Number(reg.payment_amount || 0))}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        {reg.payment_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleConfirm(reg)}
                              disabled={isActing}
                              className="px-4 py-2 bg-accent hover:bg-accent-deep text-bg text-sm font-bold rounded transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {isActing ? '...' : '✓ Confirmar'}
                            </button>
                            <button
                              onClick={() => handleReject(reg)}
                              disabled={isActing}
                              className="px-4 py-2 border border-danger/40 text-danger hover:bg-danger/10 text-sm font-bold rounded transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              ✗ Rejeitar
                            </button>
                          </>
                        )}
                        {(reg.payment_status === 'paid' || reg.payment_status === 'rejected') && (
                          <button
                            onClick={() => handleRevert(reg)}
                            disabled={isActing}
                            className="px-4 py-2 border border-border hover:border-warning text-text-soft hover:text-warning text-sm font-bold rounded transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            ↺ Reverter
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}