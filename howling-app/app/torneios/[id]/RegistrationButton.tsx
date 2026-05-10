'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// ============================================================
// 🔧 CONFIGURAÇÃO PIX — vem das variáveis de ambiente
// Defina em .env.local (local) e na Vercel (produção):
//   NEXT_PUBLIC_PIX_KEY=sua-chave-uuid
//   NEXT_PUBLIC_PIX_RECIPIENT_NAME=D7 ULTIMATE CLUB
//   NEXT_PUBLIC_PIX_RECIPIENT_CITY=BRASIL
//   NEXT_PUBLIC_DISCORD_INVITE=https://discord.gg/seu-convite
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
  team_name: string | null;
  payment_status: 'pending' | 'paid' | 'rejected' | 'cancelled';
  is_captain: boolean;
  payment_amount: number | null;
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
  prizePool = 750,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'form' | 'payment'>('form');
  const [teamName, setTeamName] = useState('');
  const [agreedRoster, setAgreedRoster] = useState(false);
  const [copied, setCopied] = useState(false);

  const teamTotal = entryFee * 5;

  useEffect(() => {
    async function checkStatus() {
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

      const { data: reg } = await supabase
        .from('registrations')
        .select('id, team_name, payment_status, is_captain, payment_amount')
        .eq('tournament_id', tournamentId)
        .eq('player_id', player.id)
        .neq('payment_status', 'cancelled')
        .maybeSingle();

      if (reg) setRegistration(reg as Registration);
      setLoading(false);
    }
    checkStatus();
  }, [tournamentId]);

  async function handleConfirmRegister() {
    if (!playerId) return;
    if (!teamName.trim()) {
      setError('Você precisa dar um nome pro time');
      return;
    }
    if (!agreedRoster) {
      setError('Você precisa confirmar que tem 5 jogadores cadastrados');
      return;
    }

    setSubmitting(true);
    setError(null);

    const existing = await supabase
      .from('registrations')
      .select('id, payment_status')
      .eq('tournament_id', tournamentId)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existing.data) {
      const { data, error: upErr } = await supabase
        .from('registrations')
        .update({
          team_name: teamName.trim(),
          is_captain: true,
          status: 'confirmed',
          payment_status: 'pending',
          payment_amount: teamTotal,
          paid_at: null,
          admin_note: null,
        })
        .eq('id', existing.data.id)
        .select('id, team_name, payment_status, is_captain, payment_amount')
        .single();

      if (upErr) {
        setError(`Erro ao reativar: ${upErr.message}`);
        setSubmitting(false);
        return;
      }
      setRegistration(data as Registration);
    } else {
      const { data, error: insErr } = await supabase
        .from('registrations')
        .insert({
          tournament_id: tournamentId,
          player_id: playerId,
          team_name: teamName.trim(),
          is_captain: true,
          status: 'confirmed',
          payment_status: 'pending',
          payment_amount: teamTotal,
        })
        .select('id, team_name, payment_status, is_captain, payment_amount')
        .single();

      if (insErr) {
        setError(`Erro ao inscrever: ${insErr.message}`);
        setSubmitting(false);
        return;
      }
      setRegistration(data as Registration);
    }

    setSubmitting(false);
    setModalStep('payment');
    router.refresh();
  }

  async function handleCancel() {
    if (!registration) return;
    if (!confirm('Tem certeza que quer cancelar a inscrição do time? Você libera a vaga.')) return;

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
    setModalOpen(false);
    setModalStep('form');
    setTeamName('');
    setAgreedRoster(false);
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

  if (loading) {
    return <div className="h-14 bg-bg-card border border-border rounded-lg animate-pulse" />;
  }

  if (!isLoggedIn) {
    return (
      <div className="p-6 bg-bg-card border border-border rounded-lg text-center">
        <p className="text-text-soft mb-4">Você precisa estar logado pra inscrever um time.</p>
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

  if (registration && !modalOpen) {
    const isCaptain = registration.is_captain;
    const status = registration.payment_status;
    const amount = Number(registration.payment_amount || teamTotal);
    const txid = `D7${tournamentId.substring(0, 6).toUpperCase()}`;
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
            <p className="text-accent font-bold text-lg">✅ Time confirmado!</p>
            <p className="text-sm text-text-soft mt-1">
              {isCaptain
                ? `Você é capitão do time "${registration.team_name}". Boa sorte!`
                : `Você está no time "${registration.team_name}". Boa sorte!`}
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

    if (status === 'pending' && isCaptain) {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-warning/10 border border-warning/40 rounded-lg">
            <p className="text-warning font-bold">⏳ Aguardando pagamento</p>
            <p className="text-sm text-text-soft mt-1">
              Time <strong>{registration.team_name}</strong> inscrito. Falta pagar pra confirmar.
            </p>
          </div>

          <div className="bg-bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="text-center">
              <p className="text-xs font-bold text-text-dim uppercase tracking-wider mb-1">
                Pagar via PIX
              </p>
              <p className="text-5xl font-black text-accent">R$ {fmt(amount)}</p>
              <p className="text-xs text-text-dim mt-1">
                5 jogadores · R$ {fmt(entryFee)} cada · 1 PIX só
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
                A gente confirma teu time em até 24h.
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
              {submitting ? 'Cancelando...' : 'Cancelar inscrição do time'}
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

    if (status === 'pending' && !isCaptain) {
      return (
        <div className="p-6 bg-warning/10 border border-warning/40 rounded-lg">
          <p className="text-warning font-bold text-lg">⏳ Aguardando pagamento</p>
          <p className="text-sm text-text-soft mt-1">
            Você está no time <strong>{registration.team_name}</strong>. O capitão precisa
            confirmar o pagamento pra vaga ser oficializada.
          </p>
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

  if (isFull) {
    return (
      <div className="p-6 bg-danger/10 border border-danger/40 rounded-lg text-center">
        <p className="text-danger font-bold">🔒 Torneio LOTADO</p>
        <p className="text-sm text-text-soft mt-1">Todas as vagas foram preenchidas.</p>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => {
          setModalStep('form');
          setModalOpen(true);
        }}
        className="w-full py-4 bg-accent hover:bg-accent-deep text-bg font-bold text-lg rounded-lg transition-colors"
      >
        🎮 Inscrever meu time (R$ {fmt(teamTotal)})
      </button>
      <p className="text-xs text-text-dim text-center mt-2">
        Você será o capitão · Pagamento via PIX no site
      </p>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={() => !submitting && modalStep === 'form' && setModalOpen(false)}
        >
          <div
            className="bg-bg-card border border-border rounded-xl max-w-lg w-full p-6 md:p-8 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {modalStep === 'form' ? (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-xs font-bold text-accent uppercase tracking-wider mb-1">
                      Inscrever time
                    </p>
                    <h3 className="text-2xl font-black">Você será o capitão</h3>
                  </div>
                  <button
                    onClick={() => !submitting && setModalOpen(false)}
                    className="text-text-dim hover:text-text text-2xl leading-none"
                    aria-label="Fechar"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold mb-2">Nome do time</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      maxLength={40}
                      placeholder="Ex: PolizaShow Esports"
                      className="w-full px-4 py-3 bg-bg border border-border rounded-lg focus:border-accent focus:outline-none transition-colors"
                      disabled={submitting}
                    />
                    <p className="text-xs text-text-dim mt-1">
                      Esse nome aparece pros outros times e no bracket.
                    </p>
                  </div>

                  <div className="bg-bg/50 border border-border rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedRoster}
                        onChange={(e) => setAgreedRoster(e.target.checked)}
                        disabled={submitting}
                        className="mt-1 w-4 h-4 accent-accent"
                      />
                      <span className="text-sm">
                        Confirmo que tenho <strong>5 jogadores</strong> com cadastro no D7
                        Ultimate Club. Vou montar o roster oficial no Discord com o staff.
                      </span>
                    </label>
                  </div>

                  <div className="bg-accent/5 border border-accent/30 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-soft">Total do time</span>
                      <span className="text-3xl font-black text-accent">
                        R$ {fmt(teamTotal)}
                      </span>
                    </div>
                    <div className="text-xs text-text-dim mt-1">
                      5 jogadores × R$ {fmt(entryFee)} · pago em 1 PIX
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-danger/20 border border-danger/40 rounded text-sm">
                      ❌ {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setModalOpen(false)}
                      disabled={submitting}
                      className="flex-1 py-3 border border-border hover:border-text-dim rounded-lg font-bold disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmRegister}
                      disabled={submitting || !teamName.trim() || !agreedRoster}
                      className="flex-1 py-3 bg-accent hover:bg-accent-deep disabled:bg-bg-hover disabled:text-text-dim text-bg font-bold rounded-lg transition-colors"
                    >
                      {submitting ? 'Inscrevendo...' : 'Confirmar e ir pro PIX'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-xs font-bold text-accent uppercase tracking-wider mb-1">
                      ✅ Time inscrito
                    </p>
                    <h3 className="text-2xl font-black">Falta só pagar</h3>
                  </div>
                  <button
                    onClick={() => {
                      setModalOpen(false);
                      setModalStep('form');
                    }}
                    className="text-text-dim hover:text-text text-2xl leading-none"
                    aria-label="Fechar"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-text-soft mb-4">
                  Pode fechar essa janela e pagar depois — as informações de PIX continuam
                  na página do torneio.
                </p>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setModalStep('form');
                  }}
                  className="w-full py-3 bg-accent hover:bg-accent-deep text-bg font-bold rounded-lg transition-colors"
                >
                  Ver informações de PIX
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}