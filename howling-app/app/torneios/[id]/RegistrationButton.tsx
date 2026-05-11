'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { fbqTrack } from '@/lib/pixel';

// ============================================================
// 🔧 CONFIGURAÇÃO PIX — vem das variáveis de ambiente
// ============================================================
const PIX_KEY = process.env.NEXT_PUBLIC_PIX_KEY || 'CHAVE-NAO-CONFIGURADA';
const PIX_RECIPIENT_NAME = process.env.NEXT_PUBLIC_PIX_RECIPIENT_NAME || 'D7 ULTIMATE CLUB';
const PIX_RECIPIENT_CITY = process.env.NEXT_PUBLIC_PIX_RECIPIENT_CITY || 'BRASIL';
const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE || 'https://discord.gg/SEU-CONVITE-AQUI';
// ============================================================

interface Props {
  tournamentId: string;
  isFull: boolean;
  entryFee?: number;
  prizePool?: number;
}

interface Registration {
  id: string;
  team_id: string | null;
  payment_status: 'pending' | 'paid' | 'rejected' | 'cancelled';
  payment_amount: number | null;
}

interface TeamInfo {
  id: string;
  name: string;
  tag: string | null;
}

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ============================================================
// 🔐 GERADOR DE PIX BR CODE (padrão EMV do BCB)
// ============================================================
function crc16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return id + len + value;
}

function buildPixPayload(opts: {
  pixKey: string;
  amount: number;
  merchantName: string;
  merchantCity: string;
  txid?: string;
}): string {
  const merchantAccountInfo =
    emvField('00', 'br.gov.bcb.pix') +
    emvField('01', opts.pixKey);

  const additionalData = emvField('05', (opts.txid || '***').substring(0, 25));

  const sanitize = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9 ]/gi, '').toUpperCase();

  const name = sanitize(opts.merchantName).substring(0, 25);
  const city = sanitize(opts.merchantCity).substring(0, 15);

  const partial =
    emvField('00', '01') +
    emvField('26', merchantAccountInfo) +
    emvField('52', '0000') +
    emvField('53', '986') +
    emvField('54', opts.amount.toFixed(2)) +
    emvField('58', 'BR') +
    emvField('59', name) +
    emvField('60', city) +
    emvField('62', additionalData) +
    '6304';

  return partial + crc16(partial);
}

// ============================================================
// COMPONENTE
// ============================================================
export default function RegistrationButton({
  tournamentId,
  isFull,
  entryFee = 16,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [teamRegistrationsCount, setTeamRegistrationsCount] = useState(0);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [tournamentId]);

  async function loadStatus() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }
    setIsLoggedIn(true);

    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!player) {
      setError('Sua conta não está vinculada a um Riot ID. Refaça o cadastro.');
      setLoading(false);
      return;
    }
    setPlayerId(player.id);

    // Pega o time do jogador
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id, teams(id, name, tag)')
      .eq('player_id', player.id)
      .maybeSingle();

    if (membership && membership.teams) {
      const playerTeam = Array.isArray(membership.teams) ? membership.teams[0] : membership.teams;
      setTeam(playerTeam as TeamInfo);

      // Conta quantos do mesmo time já se inscreveram
      const { count } = await supabase
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('team_id', playerTeam.id)
        .neq('payment_status', 'cancelled');

      setTeamRegistrationsCount(count || 0);
    } else {
      setTeam(null);
    }

    // Verifica inscrição própria
    const { data: reg } = await supabase
      .from('registrations')
      .select('id, team_id, payment_status, payment_amount')
      .eq('tournament_id', tournamentId)
      .eq('player_id', player.id)
      .neq('payment_status', 'cancelled')
      .maybeSingle();

    if (reg) setRegistration(reg as Registration);
    setLoading(false);
  }

  async function handleRegister() {
    if (!playerId || !team) return;
    setSubmitting(true);
    setError(null);

    // Verifica se time não está cheio (re-check antes de inserir)
    if (teamRegistrationsCount >= 5) {
      setError('Seu time já tem 5 jogadores inscritos nesse torneio.');
      setSubmitting(false);
      return;
    }

    const { data, error: insErr } = await supabase
      .from('registrations')
      .insert({
        tournament_id: tournamentId,
        player_id: playerId,
        team_id: team.id,
        status: 'confirmed',
        payment_status: 'pending',
        payment_amount: entryFee,
      })
      .select('id, team_id, payment_status, payment_amount')
      .single();

    if (insErr) {
      if (insErr.message.includes('limite máximo') || insErr.message.includes('5 jogadores')) {
        setError('Seu time já tem 5 jogadores inscritos nesse torneio.');
      } else {
        setError(`Erro ao inscrever: ${insErr.message}`);
      }
      setSubmitting(false);
      return;
    }

    setRegistration(data as Registration);

    // 🎯 Meta Pixel: dispara InitiateCheckout — o cara se inscreveu
    // e agora vai pra tela de PIX. É o evento de intenção de compra.
    fbqTrack('InitiateCheckout', {
      content_name: 'Inscrição em torneio',
      content_ids: [tournamentId],
      content_type: 'tournament_registration',
      value: entryFee,
      currency: 'BRL',
    });

    setSubmitting(false);
    await loadStatus();
    router.refresh();
  }

  async function handleCancel() {
    if (!registration) return;
    if (!confirm('Cancelar sua inscrição? Você libera a vaga.')) return;

    setSubmitting(true);
    setError(null);

    const { error: upErr } = await supabase
      .from('registrations')
      .update({ payment_status: 'cancelled' })
      .eq('id', registration.id);

    if (upErr) {
      setError(`Erro ao cancelar: ${upErr.message}`);
      setSubmitting(false);
      return;
    }

    setRegistration(null);
    setSubmitting(false);
    await loadStatus();
    router.refresh();
  }

  function copyPixKey() {
    navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyPixCode(payload: string) {
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ===== Render =====
  if (loading) {
    return <div className="h-14 bg-bg-card border border-border rounded-lg animate-pulse" />;
  }

  if (!isLoggedIn) {
    return (
      <div className="p-6 bg-bg-card border border-border rounded-lg text-center">
        <p className="text-text-soft mb-4">Você precisa estar logado pra se inscrever.</p>
        <div className="flex gap-2 justify-center">
          <a href="/login" className="px-6 py-2 bg-accent hover:bg-accent-deep text-bg font-bold rounded transition-colors">
            Entrar
          </a>
          <a href="/cadastro" className="px-6 py-2 border border-border hover:border-accent rounded transition-colors">
            Criar conta
          </a>
        </div>
      </div>
    );
  }

  // ===== Já está inscrito: mostra status do pagamento =====
  if (registration) {
    const status = registration.payment_status;
    const amount = Number(registration.payment_amount || entryFee);
    const txid = `D7${tournamentId.substring(0, 6).toUpperCase()}${playerId?.substring(0, 6).toUpperCase() || ''}`;
    const pixPayload = buildPixPayload({
      pixKey: PIX_KEY,
      amount,
      merchantName: PIX_RECIPIENT_NAME,
      merchantCity: PIX_RECIPIENT_CITY,
      txid,
    });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(pixPayload)}`;

    if (status === 'paid') {
      return (
        <div className="p-6 bg-accent/10 border border-accent/40 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-accent font-bold text-lg">✅ Inscrição confirmada!</p>
            <p className="text-sm text-text-soft mt-1">
              Você está jogando pelo time <strong>{team?.name}</strong>
              {team?.tag && <span className="font-mono"> [{team.tag}]</span>}. Boa sorte!
            </p>
          </div>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm border border-border hover:border-accent rounded transition-colors text-center whitespace-nowrap"
          >
            Discord →
          </a>
        </div>
      );
    }

    if (status === 'pending') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-warning/10 border border-warning/40 rounded-lg">
            <p className="text-warning font-bold">⏳ Aguardando pagamento</p>
            <p className="text-sm text-text-soft mt-1">
              Você inscreveu pelo time <strong>{team?.name}</strong>
              {team?.tag && <span className="font-mono"> [{team.tag}]</span>}. Falta pagar pra confirmar.
            </p>
          </div>

          <div className="bg-bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="text-center">
              <p className="text-xs font-bold text-text-dim uppercase tracking-wider mb-1">
                Pagar via PIX
              </p>
              <p className="text-5xl font-black text-accent">R$ {fmt(amount)}</p>
              <p className="text-xs text-text-dim mt-1">
                Sua inscrição individual
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="QR Code PIX"
                  width={240}
                  height={240}
                  className="block"
                />
              </div>
              <p className="text-xs text-text-dim text-center">
                Escaneia com o app do seu banco · valor já preenchido
              </p>
            </div>

            <div className="flex items-center gap-3 text-text-dim text-xs">
              <div className="flex-1 h-px bg-border" />
              OU COPIA E COLA
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={() => copyPixCode(pixPayload)}
              className="w-full bg-bg border border-border hover:border-accent rounded-lg p-4 text-left transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">
                    PIX Copia e Cola
                  </p>
                  <p className="text-xs font-mono text-text-soft truncate">
                    {pixPayload}
                  </p>
                </div>
                <span className={`text-xs font-bold whitespace-nowrap ${copied ? 'text-accent' : 'text-accent group-hover:text-accent-deep'}`}>
                  {copied ? '✓ Copiado!' : 'Copiar'}
                </span>
              </div>
            </button>

            <div className="bg-bg/50 border border-border rounded-lg p-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">
                  Chave PIX
                </p>
                <button
                  onClick={copyPixKey}
                  className={`text-xs font-bold ${copied ? 'text-accent' : 'text-accent hover:text-accent-deep'}`}
                >
                  {copied ? '✓ Copiado!' : 'Copiar chave'}
                </button>
              </div>
              <p className="font-mono text-sm break-all">{PIX_KEY}</p>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border-soft text-xs">
                <div>
                  <span className="text-text-dim">Recebedor:</span>
                  <p className="font-bold">{PIX_RECIPIENT_NAME}</p>
                </div>
                <div>
                  <span className="text-text-dim">Tipo:</span>
                  <p className="font-bold">Aleatória</p>
                </div>
              </div>
            </div>

            <div className="bg-accent/5 border border-accent/30 rounded-lg p-4">
              <p className="text-sm font-bold text-accent mb-2">📤 Depois de pagar</p>
              <p className="text-sm text-text-soft mb-3">
                Manda o comprovante no canal <code className="bg-bg px-1.5 py-0.5 rounded text-xs">#pagamentos</code> do Discord.
                A gente confirma tua inscrição em até 24h.
              </p>
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 bg-accent hover:bg-accent-deep text-bg font-bold rounded transition-colors"
              >
                💬 Ir pro Discord
              </a>
            </div>

            <button
              onClick={handleCancel}
              disabled={submitting}
              className="w-full py-2 text-sm border border-danger/40 text-danger hover:bg-danger/10 rounded transition-colors disabled:opacity-50"
            >
              {submitting ? 'Cancelando...' : 'Cancelar minha inscrição'}
            </button>

            {error && (
              <div className="p-3 bg-danger/20 border border-danger/40 rounded text-sm">
                ❌ {error}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (status === 'rejected') {
      return (
        <div className="p-6 bg-danger/10 border border-danger/40 rounded-lg">
          <p className="text-danger font-bold">❌ Inscrição rejeitada</p>
          <p className="text-sm text-text-soft mt-1">
            Entra em contato pelo Discord pra entender o motivo.
          </p>
        </div>
      );
    }
  }

  // ===== Não inscrito: bloqueios =====
  if (!team) {
    return (
      <div className="p-6 bg-warning/10 border border-warning/30 rounded-lg text-center">
        <p className="text-warning font-bold mb-2">⚠️ Você precisa estar em um time</p>
        <p className="text-sm text-text-soft mb-4">
          Pra se inscrever em torneios você precisa fazer parte de um time. Crie o seu ou aceite um convite.
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Link href="/times/novo" className="px-6 py-2 bg-accent hover:bg-accent-deep text-bg font-bold rounded text-sm transition-colors">
            ⚔️ Criar meu time
          </Link>
          <Link href="/convites" className="px-6 py-2 bg-bg border border-border hover:border-accent text-text-soft hover:text-accent font-bold rounded text-sm transition-colors">
            📨 Ver convites
          </Link>
        </div>
      </div>
    );
  }

  if (teamRegistrationsCount >= 5) {
    return (
      <div className="p-6 bg-danger/10 border border-danger/40 rounded-lg text-center">
        <p className="text-danger font-bold mb-2">🚫 Seu time já completou 5 vagas</p>
        <p className="text-sm text-text-soft">
          O time <strong>{team.name}</strong> já tem 5 jogadores inscritos nesse torneio. Cada torneio aceita no máximo 5 jogadores por time.
        </p>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="p-6 bg-danger/10 border border-danger/40 rounded-lg text-center">
        <p className="text-danger font-bold">🔒 Torneio LOTADO</p>
        <p className="text-sm text-text-soft mt-1">Todas as vagas foram preenchidas.</p>
      </div>
    );
  }

  // ===== Pronto pra inscrever =====
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm flex-wrap gap-2">
        <div className="text-text-soft">
          Jogando pelo time: <strong className="text-text">{team.name}</strong>
          {team.tag && <span className="text-text-soft font-mono"> [{team.tag}]</span>}
        </div>
        <div className="text-text-soft">
          <span className={teamRegistrationsCount >= 4 ? 'text-warning font-bold' : ''}>
            {teamRegistrationsCount}/5
          </span> do seu time inscritos
        </div>
      </div>

      <button
        onClick={handleRegister}
        disabled={submitting}
        className="w-full py-4 bg-accent hover:bg-accent-deep disabled:bg-bg-card disabled:text-text-soft text-bg font-black text-lg rounded-lg transition-colors"
      >
        {submitting ? 'Inscrevendo...' : `🎮 Inscrever-me (R$ ${fmt(entryFee)})`}
      </button>

      <p className="text-xs text-text-dim text-center mt-2">
        Inscrição individual · Pagamento via PIX no site
      </p>

      {error && (
        <div className="mt-3 p-3 bg-danger/20 border border-danger/40 rounded text-sm">
          ❌ {error}
        </div>
      )}
    </div>
  );
}