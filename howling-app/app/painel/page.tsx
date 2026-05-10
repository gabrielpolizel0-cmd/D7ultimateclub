'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface Tournament {
  id: string;
  name: string;
  format: string;
  start_date: string;
  entry_fee: number | null;
  prize_pool: number;
  max_teams: number;
}

interface TournamentStats {
  tournament_id: string;
  pendentes: number;
  pagos: number;
  receita: number;
}

type AccessState = 'checking' | 'unauthorized' | 'not_admin' | 'admin';

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function AdminIndexPage() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>('checking');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState<Record<string, TournamentStats>>({});
  const [loading, setLoading] = useState(true);

  // Verifica admin
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

  // Carrega torneios + estatísticas
  useEffect(() => {
    if (access !== 'admin') return;

    async function loadData() {
      setLoading(true);

      const { data: tours } = await supabase
        .from('tournaments')
        .select('id, name, format, start_date, entry_fee, prize_pool, max_teams')
        .order('start_date', { ascending: true });

      if (tours) {
        setTournaments(tours as Tournament[]);

        // Estatísticas de cada torneio
        const { data: regs } = await supabase
          .from('registrations')
          .select('tournament_id, payment_status, payment_amount');

        if (regs) {
          const statsMap: Record<string, TournamentStats> = {};
          for (const t of tours) {
            const tRegs = regs.filter(r => r.tournament_id === t.id);
            statsMap[t.id] = {
              tournament_id: t.id,
              pendentes: tRegs.filter(r => r.payment_status === 'pending').length,
              pagos: tRegs.filter(r => r.payment_status === 'paid').length,
              receita: tRegs
                .filter(r => r.payment_status === 'paid')
                .reduce((acc, r) => acc + Number(r.payment_amount || 0), 0),
            };
          }
          setStats(statsMap);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [access]);

  // Verificando
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

  // Não logado
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

  // Não é admin
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

  // Totais agregados
  const totalPendentes = Object.values(stats).reduce((a, s) => a + s.pendentes, 0);
  const totalPagos = Object.values(stats).reduce((a, s) => a + s.pagos, 0);
  const receitaTotal = Object.values(stats).reduce((a, s) => a + s.receita, 0);

  return (
    <div className="min-h-screen bg-bg text-text relative">
      <div className="glow-bg" />

      <div className="container-custom py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-black">Painel Admin</h1>
            <span className="px-2 py-0.5 bg-accent/20 text-accent text-[10px] font-bold rounded uppercase tracking-wider">
              👑 Admin
            </span>
          </div>
          <p className="text-text-soft">Gerencie inscrições e pagamentos dos torneios</p>
        </div>

        {/* Stats agregados */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
            <p className="text-[11px] font-bold text-warning uppercase tracking-wider">
              Pendentes (total)
            </p>
            <p className="text-3xl font-black text-warning">{totalPendentes}</p>
            {totalPendentes > 0 && (
              <p className="text-xs text-text-soft mt-1">
                ⚠️ Aguardando sua ação
              </p>
            )}
          </div>
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
            <p className="text-[11px] font-bold text-accent uppercase tracking-wider">
              Times pagos (total)
            </p>
            <p className="text-3xl font-black text-accent">{totalPagos}</p>
          </div>
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <p className="text-[11px] font-bold text-text-dim uppercase tracking-wider">
              Receita total
            </p>
            <p className="text-3xl font-black">R$ {fmt(receitaTotal)}</p>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4">Torneios</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-bg-card border border-border rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-5xl mb-3">🦗</p>
            <p className="text-text-soft">Nenhum torneio cadastrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map(t => {
              const s = stats[t.id] || { pendentes: 0, pagos: 0, receita: 0 };
              const vagasRestantes = t.max_teams - s.pagos;

              return (
                <Link
                  key={t.id}
                  href={`/admin/inscricoes/${t.id}`}
                  className="block bg-bg-card border border-border hover:border-accent rounded-lg p-5 transition-colors group"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-lg font-black group-hover:text-accent transition-colors">
                          {t.name}
                        </h3>
                        {s.pendentes > 0 && (
                          <span className="px-2 py-0.5 bg-warning/20 text-warning text-[10px] font-bold rounded uppercase animate-pulse">
                            {s.pendentes} pendente{s.pendentes > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-text-soft flex items-center gap-3 flex-wrap">
                        <span>📅 {formatDate(t.start_date)}</span>
                        <span>🏆 R$ {fmt(t.prize_pool)}</span>
                        <span>👥 {s.pagos}/{t.max_teams} times</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[11px] font-bold text-text-dim uppercase">Receita</p>
                        <p className="text-xl font-black text-accent">R$ {fmt(s.receita)}</p>
                      </div>
                      <div className="text-accent group-hover:translate-x-1 transition-transform">
                        →
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Link rápido pro Supabase */}
        <div className="mt-12 p-4 bg-bg-card border border-border rounded-lg">
          <p className="text-sm font-bold mb-2">🛠️ Ferramentas avançadas</p>
          <p className="text-xs text-text-soft mb-3">
            Pra adicionar mais admins ou editar dados diretamente no banco:
          </p>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline"
          >
            → Abrir Supabase Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}