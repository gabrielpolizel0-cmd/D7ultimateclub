'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type AccessState = 'checking' | 'unauthorized' | 'ready';

interface Invite {
  id: string;
  team_id: string;
  invited_by: string;
  status: string;
  created_at: string;
  teams: {
    id: string;
    name: string;
    tag: string | null;
    logo_url: string | null;
    description: string | null;
  } | null;
  inviter: {
    riot_game_name: string;
    riot_tag_line: string;
  } | null;
}

export default function ConvitesPage() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>('checking');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [hasTeam, setHasTeam] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkAndLoad();
  }, []);

  async function checkAndLoad() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setAccess('unauthorized');
      return;
    }

    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!player) {
      setAccess('unauthorized');
      return;
    }

    setPlayerId(player.id);

    // Verifica se já está em time
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('player_id', player.id)
      .maybeSingle();

    if (membership) {
      setHasTeam(true);
      setCurrentTeamId(membership.team_id);
    }

    // Busca convites pendentes
    const { data: invitesData } = await supabase
      .from('team_invites')
      .select(`
        id,
        team_id,
        invited_by,
        status,
        created_at,
        teams (
          id,
          name,
          tag,
          logo_url,
          description
        ),
        inviter:players!team_invites_invited_by_fkey (
          riot_game_name,
          riot_tag_line
        )
      `)
      .eq('invited_player_id', player.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (invitesData) {
      setInvites(invitesData as unknown as Invite[]);
    }

    setAccess('ready');
  }

  async function handleAccept(invite: Invite) {
    if (!playerId || !invite.teams) return;

    if (hasTeam) {
      setMessage({ type: 'error', text: 'Você já está em um time. Saia dele antes de aceitar outro convite.' });
      return;
    }

    setActionLoading(invite.id);
    setMessage(null);

    try {
      // 1. Adiciona como membro
      const { error: memberErr } = await supabase
        .from('team_members')
        .insert({
          team_id: invite.team_id,
          player_id: playerId,
          is_captain: false,
        });

      if (memberErr) {
        if (memberErr.message.includes('Time já tem 10 jogadores')) {
          throw new Error('Esse time já está cheio (10/10).');
        }
        throw new Error(memberErr.message);
      }

      // 2. Marca convite como aceito
      await supabase
        .from('team_invites')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', invite.id);

      // 3. Cancela todos os outros convites pendentes desse jogador (já tem time)
      await supabase
        .from('team_invites')
        .update({ status: 'cancelled', responded_at: new Date().toISOString() })
        .eq('invited_player_id', playerId)
        .eq('status', 'pending');

      setMessage({ type: 'success', text: `✅ Você entrou no time ${invite.teams.name}!` });
      
      // Redireciona pra página do time depois de 1s
      setTimeout(() => {
        router.push(`/times/${invite.team_id}`);
      }, 1500);
    } catch (e: any) {
      setMessage({ type: 'error', text: `❌ ${e.message}` });
      setActionLoading(null);
    }
  }

  async function handleReject(invite: Invite) {
    setActionLoading(invite.id);
    setMessage(null);

    const { error } = await supabase
      .from('team_invites')
      .update({ status: 'rejected', responded_at: new Date().toISOString() })
      .eq('id', invite.id);

    if (error) {
      setMessage({ type: 'error', text: `❌ ${error.message}` });
      setActionLoading(null);
      return;
    }

    setInvites(prev => prev.filter(i => i.id !== invite.id));
    setMessage({ type: 'success', text: 'Convite recusado.' });
    setActionLoading(null);
  }

  // ===== Render =====
  if (access === 'checking') {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (access === 'unauthorized') {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-8">
        <div className="max-w-md text-center bg-bg-card border border-border rounded-lg p-8">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-2xl font-black mb-2">Faça login</h1>
          <p className="text-text-soft mb-6">Você precisa estar logado pra ver seus convites.</p>
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

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="container-custom py-8 md:py-12 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-black mb-2">📨 Meus convites</h1>
        <p className="text-text-soft mb-8">
          Convites pendentes pra entrar em times.
        </p>

        {hasTeam && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-warning font-bold">⚠️ Você já está em um time.</p>
            <p className="text-xs text-text-soft mt-1">
              Pra aceitar outro convite, você precisa sair do{' '}
              <Link href={`/times/${currentTeamId}`} className="text-accent hover:underline">
                seu time atual
              </Link>{' '}
              primeiro.
            </p>
          </div>
        )}

        {message && (
          <div className={`p-4 rounded-lg mb-6 text-sm ${
            message.type === 'success'
              ? 'bg-accent/10 border border-accent/30 text-accent'
              : 'bg-danger/10 border border-danger/30 text-danger'
          }`}>
            {message.text}
          </div>
        )}

        {invites.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-text-soft mb-4">Nenhum convite pendente.</p>
            <Link
              href="/times"
              className="inline-block px-6 py-3 bg-accent hover:bg-accent-deep text-bg font-bold rounded transition-colors"
            >
              Ver times
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map(invite => {
              const team = invite.teams;
              const inviter = invite.inviter;
              if (!team) return null;

              return (
                <div key={invite.id} className="bg-bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="w-16 h-16 rounded-lg bg-bg border border-border flex items-center justify-center text-3xl overflow-hidden shrink-0">
                      {team.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                      ) : (
                        '🛡️'
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="text-xl font-black truncate">{team.name}</h2>
                        {team.tag && (
                          <span className="text-sm text-text-soft font-mono">[{team.tag}]</span>
                        )}
                      </div>
                      {inviter && (
                        <p className="text-xs text-text-soft mb-2">
                          Convidado por <span className="font-bold text-text">{inviter.riot_game_name}#{inviter.riot_tag_line}</span>
                        </p>
                      )}
                      {team.description && (
                        <p className="text-sm text-text-soft mb-3 line-clamp-2">{team.description}</p>
                      )}

                      {/* Ações */}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleAccept(invite)}
                          disabled={actionLoading === invite.id || hasTeam}
                          className="px-4 py-2 bg-accent hover:bg-accent-deep text-bg font-bold rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === invite.id ? 'Processando...' : '✓ Aceitar'}
                        </button>
                        <button
                          onClick={() => handleReject(invite)}
                          disabled={actionLoading === invite.id}
                          className="px-4 py-2 bg-bg border border-danger/30 text-danger hover:bg-danger/10 font-bold rounded text-sm transition-colors disabled:opacity-50"
                        >
                          ✗ Recusar
                        </button>
                        <Link
                          href={`/times/${team.id}`}
                          className="px-4 py-2 bg-bg border border-border hover:border-accent text-text-soft hover:text-accent font-bold rounded text-sm transition-colors"
                        >
                          Ver time
                        </Link>
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