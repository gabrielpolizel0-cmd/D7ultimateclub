import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import RegistrationButton from './RegistrationButton';
import RegistrationsList from './RegistrationsList';
import TournamentPixelView from './TournamentPixelView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

// ============================================================
// 🔧 CONFIGURAÇÃO RÁPIDA — TROCAR DEPOIS
// ============================================================
const DISCORD_INVITE = 'https://discord.gg/SEU-CONVITE-AQUI'; // TODO: trocar pelo convite permanente
// ============================================================

async function getTournament(id: string) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
}

async function getRegistrations(tournamentId: string) {
  const { data, error } = await supabase
    .from('registrations')
    .select(`
      id,
      created_at,
      team_name,
      status,
      players (
        id,
        riot_game_name,
        riot_tag_line,
        summoner_level,
        profile_icon_id,
        current_tier,
        current_rank,
        current_lp
      )
    `)
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar inscrições:', error);
    return [];
  }
  return data || [];
}

function formatDateLong(dateString: string) {
  const d = new Date(dateString);
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0];
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return { dia, data, hora };
}

function diasAteEvento(dateString: string): number {
  const agora = new Date();
  const evento = new Date(dateString);
  const ms = evento.getTime() - agora.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

// ============================================================
// 🎨 ADAPTAÇÃO DE COPY POR FORMATO
// ============================================================
type FormatInfo = {
  label: string;
  shortDesc: string;
  bracketBullets: string[];
  cadenceBullet: string;
};

function getFormatInfo(format: string, maxTeams: number): FormatInfo {
  const f = (format || '').toLowerCase();

  if (f.includes('round_robin') || f.includes('liga') || f.includes('pontos')) {
    return {
      label: 'Liga · Pontos corridos',
      shortDesc: 'Pontos corridos · todos contra todos',
      bracketBullets: [
        `${maxTeams} times · todos jogam contra todos`,
        'Cada time joga 15 partidas no total',
        'Top 4 avançam pra semi e final em formato eliminatório',
      ],
      cadenceBullet:
        'Distribuído ao longo de ~2 semanas, com 2 a 3 partidas por noite combinadas no Discord',
    };
  }

  if (f.includes('bo3')) {
    return {
      label: `Eliminatória BO3 · ${maxTeams} times`,
      shortDesc: `Eliminatória simples em BO3 · ${maxTeams} times`,
      bracketBullets: [
        `Eliminatória simples · ${maxTeams} times`,
        'Oitavas → Quartas → Semi → Final',
        'Melhor de 3 (BO3) em todas as fases',
      ],
      cadenceBullet:
        'Evento ao longo do dia inteiro · transmissão da grande final',
    };
  }

  return {
    label: `Eliminatória · ${maxTeams} times`,
    shortDesc: `Eliminatória simples · ${maxTeams} times`,
    bracketBullets: [
      `Eliminatória simples · ${maxTeams} times`,
      'Oitavas → Quartas → Semi → Final',
      'BO1 até as semis · Final em BO3',
    ],
    cadenceBullet: 'Evento concentrado no dia, das 19h até a final',
  };
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const tournament = await getTournament(params.id);

  if (!tournament) {
    notFound();
  }

  const registrations = await getRegistrations(params.id);
  const vagasRestantes = tournament.max_teams - registrations.length;
  const isFull = vagasRestantes <= 0;
  const ocupacaoPct = Math.min(100, (registrations.length / tournament.max_teams) * 100);

  const { dia, data, hora } = formatDateLong(tournament.start_date);
  const diasRestantes = diasAteEvento(tournament.start_date);

  // Valores reais do banco (não mais hardcoded)
  const inscricaoPorJogador = Number(tournament.entry_fee || 15);
  const inscricaoPorTime = inscricaoPorJogador * 5;
  const premioTotal = Number(tournament.prize_pool || 750);
  const premioPorJogador = premioTotal / 5;

  const formatInfo = getFormatInfo(tournament.format, tournament.max_teams);

  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-bg text-text relative">
      <TournamentPixelView
        tournamentId={params.id}
        tournamentName={tournament.name}
        entryFee={inscricaoPorJogador}
      />
      <div className="glow-bg" />

      {/* HERO */}
      <section className="relative border-b border-border-soft overflow-hidden">
        <div className="container-custom py-12 md:py-20">
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent text-xs font-bold rounded-full border border-accent/30">
              <span className="w-1.5 h-1.5 bg-accent rounded-full pulse-dot" />
              INSCRIÇÕES ABERTAS
            </span>
            <span className="px-3 py-1 bg-bg-card text-text-soft text-xs font-bold rounded-full border border-border">
              ARAM DESORDEM
            </span>
            <span className="px-3 py-1 bg-bg-card text-text-soft text-xs font-bold rounded-full border border-border">
              {formatInfo.label.toUpperCase()}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight tracking-tight">
            {tournament.name}
          </h1>
          {tournament.description && (
            <p className="text-lg text-text-soft max-w-2xl mb-8">
              {tournament.description}
            </p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-bg-card border border-border rounded-lg p-4">
              <p className="text-[11px] font-bold text-text-dim uppercase tracking-wider mb-1">
                Quando
              </p>
              <p className="text-lg font-bold capitalize">{dia}</p>
              <p className="text-sm text-text-soft">{data} · {hora}</p>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-4">
              <p className="text-[11px] font-bold text-text-dim uppercase tracking-wider mb-1">
                Faltam
              </p>
              <p className="text-3xl font-black text-accent">{diasRestantes}</p>
              <p className="text-sm text-text-soft">{diasRestantes === 1 ? 'dia' : 'dias'}</p>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-4">
              <p className="text-[11px] font-bold text-text-dim uppercase tracking-wider mb-1">
                Times
              </p>
              <p className="text-lg font-bold">
                {registrations.length} <span className="text-text-dim">/ {tournament.max_teams}</span>
              </p>
              <div className="mt-2 h-1.5 bg-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${ocupacaoPct}%` }}
                />
              </div>
            </div>
            <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30 rounded-lg p-4">
              <p className="text-[11px] font-bold text-accent uppercase tracking-wider mb-1">
                Prêmio
              </p>
              <p className="text-3xl font-black text-accent">
                R$ {fmt(premioTotal)}
              </p>
              <p className="text-sm text-text-soft">
                R$ {fmt(premioPorJogador)} por jogador
              </p>
            </div>
          </div>

          {/* CTA principal */}
          <div className="bg-bg-card border border-border rounded-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
              <div>
                <p className="text-sm text-text-soft mb-1">Inscrição</p>
                <p className="text-3xl md:text-4xl font-black">
                  R$ {fmt(inscricaoPorJogador)}
                  <span className="text-lg text-text-soft font-normal"> / jogador</span>
                </p>
                <p className="text-sm text-text-dim mt-1">
                  R$ {fmt(inscricaoPorTime)} pelo time completo (5 jogadores)
                </p>
              </div>
              {!isFull && (
                <div className="text-left md:text-right">
                  <p className="text-xs text-warning font-bold uppercase tracking-wider mb-1">
                    {vagasRestantes <= 5 ? '⚠️ Últimas vagas' : 'Vagas restantes'}
                  </p>
                  <p className="text-4xl font-black text-warning">
                    {vagasRestantes}
                    <span className="text-lg text-text-soft font-normal"> times</span>
                  </p>
                </div>
              )}
            </div>

            <RegistrationButton
              tournamentId={tournament.id}
              isFull={isFull}
              entryFee={inscricaoPorJogador}
              prizePool={premioTotal}
            />

            <p className="text-xs text-text-dim text-center mt-4">
              Pagamento via PIX direto no site · Confirmação manual em até 24h
            </p>
          </div>
        </div>
      </section>

      {/* COMO PARTICIPAR */}
      <section className="border-b border-border-soft">
        <div className="container-custom py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-black mb-2">Como participar</h2>
          <p className="text-text-soft mb-8">3 passos simples — leva uns 5 minutos</p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent font-black mb-4">
                1
              </div>
              <h3 className="font-bold text-lg mb-2">Cada jogador se cadastra</h3>
              <p className="text-sm text-text-soft">
                Os 5 jogadores do time precisam ter conta no D7 (vinculada ao Riot ID).
                Isso garante o ranking pessoal e impede smurfs.
              </p>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent font-black mb-4">
                2
              </div>
              <h3 className="font-bold text-lg mb-2">Capitão inscreve e paga via PIX</h3>
              <p className="text-sm text-text-soft">
                O capitão clica em &quot;Inscrever meu time&quot;, recebe a chave PIX
                e o QR Code aqui no site, paga R$ {fmt(inscricaoPorTime)} (valor do time
                inteiro) e tá quase lá.
              </p>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent font-black mb-4">
                3
              </div>
              <h3 className="font-bold text-lg mb-2">Manda comprovante no Discord</h3>
              <p className="text-sm text-text-soft">
                Capitão envia o comprovante no canal #pagamentos do Discord. A gente
                confirma em até 24h e o time tá oficialmente dentro.
              </p>
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-accent text-sm font-bold hover:text-accent-deep"
              >
                Entrar no Discord →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* PREMIAÇÃO */}
      <section className="border-b border-border-soft">
        <div className="container-custom py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-black mb-2">Premiação</h2>
          <p className="text-text-soft mb-8">Quem leva o título também leva o PIX</p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border border-accent/30 rounded-xl p-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-3xl">🏆</span>
                <span className="text-xs font-bold text-accent uppercase tracking-wider">
                  Time Campeão
                </span>
              </div>
              <p className="text-5xl md:text-6xl font-black text-accent mb-2">
                R$ {fmt(premioTotal)}
              </p>
              <p className="text-text-soft">
                Dividido entre os 5 jogadores · R$ {fmt(premioPorJogador)} por
                pessoa · Pago via PIX em até 24h após a final
              </p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-8 flex flex-col justify-center">
              <p className="text-xs font-bold text-text-dim uppercase tracking-wider mb-2">
                Bônus
              </p>
              <p className="text-lg font-bold mb-1">Pontos D7</p>
              <p className="text-sm text-text-soft">
                Todos os participantes ganham pontos no ranking D7 oficial. Vencedores
                ganham bônus extra.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FORMATO E REGRAS */}
      <section className="border-b border-border-soft">
        <div className="container-custom py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-black mb-8">Formato e regras</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-bg-card border border-border rounded-lg p-6">
              <p className="text-xs font-bold text-text-dim uppercase tracking-wider mb-3">
                Modo de jogo
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-accent">▸</span>
                  <span>ARAM Desordem (Howling Mayhem) — partida customizada</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">▸</span>
                  <span>5v5 · times de 5 jogadores fixos</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">▸</span>
                  <span>Servidor: BR1</span>
                </li>
              </ul>
            </div>

            <div className="bg-bg-card border border-border rounded-lg p-6">
              <p className="text-xs font-bold text-text-dim uppercase tracking-wider mb-3">
                Estrutura
              </p>
              <ul className="space-y-2 text-sm">
                {formatInfo.bracketBullets.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-accent">▸</span>
                    <span>{b}</span>
                  </li>
                ))}
                <li className="flex gap-2">
                  <span className="text-accent">▸</span>
                  <span>{formatInfo.cadenceBullet}</span>
                </li>
              </ul>
            </div>

            <div className="bg-bg-card border border-border rounded-lg p-6">
              <p className="text-xs font-bold text-text-dim uppercase tracking-wider mb-3">
                Inscrição
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-accent">▸</span>
                  <span>Cada jogador faz cadastro individual no site</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">▸</span>
                  <span>Capitão coordena o time pelo Discord</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">▸</span>
                  <span>Pagamento PIX confirmado = vaga garantida</span>
                </li>
              </ul>
            </div>

            <div className="bg-bg-card border border-border rounded-lg p-6">
              <p className="text-xs font-bold text-text-dim uppercase tracking-wider mb-3">
                Regras gerais
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-accent">▸</span>
                  <span>Sem smurfs · conta cadastrada = conta que joga</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">▸</span>
                  <span>Toxicidade ou troll = DQ imediata</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">▸</span>
                  <span>Disputas resolvidas pelo staff via Discord</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border-soft">
        <div className="container-custom py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-black mb-8">Perguntas frequentes</h2>

          <div className="space-y-3 max-w-3xl">
            <details className="bg-bg-card border border-border rounded-lg p-5 group">
              <summary className="font-bold cursor-pointer flex justify-between items-center">
                Como monto meu time de 5?
                <span className="text-accent group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="text-sm text-text-soft mt-3">
                Cada um dos 5 faz cadastro individual no site. O capitão entra no nosso
                Discord, junta o time num canal dedicado, paga o PIX e nos avisa. A
                gente confirma assim que o pagamento cair.
              </p>
            </details>
            <details className="bg-bg-card border border-border rounded-lg p-5 group">
              <summary className="font-bold cursor-pointer flex justify-between items-center">
                E se meu time não conseguir pagar a tempo?
                <span className="text-accent group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="text-sm text-text-soft mt-3">
                Vagas são confirmadas por ordem de pagamento. Inscrição sem PIX
                confirmado fica como pendente — se as vagas encherem antes, você
                entra na lista de espera.
              </p>
            </details>
            <details className="bg-bg-card border border-border rounded-lg p-5 group">
              <summary className="font-bold cursor-pointer flex justify-between items-center">
                Tem reembolso se eu não puder jogar?
                <span className="text-accent group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="text-sm text-text-soft mt-3">
                Sim, até 48h antes do início. Depois disso só fazemos reembolso se
                conseguirmos repor o time pela lista de espera.
              </p>
            </details>
            <details className="bg-bg-card border border-border rounded-lg p-5 group">
              <summary className="font-bold cursor-pointer flex justify-between items-center">
                Como funciona o lobby customizado?
                <span className="text-accent group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="text-sm text-text-soft mt-3">
                No horário combinado de cada partida, um membro do staff cria a sala
                custom no cliente do LoL e convida os 10 jogadores. Tudo combinado
                pelo Discord pra não atrasar.
              </p>
            </details>
            <details className="bg-bg-card border border-border rounded-lg p-5 group">
              <summary className="font-bold cursor-pointer flex justify-between items-center">
                Os pontos do torneio contam pro ranking D7?
                <span className="text-accent group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="text-sm text-text-soft mt-3">
                Sim. Cada partida do torneio entra no cálculo do seu ranking pessoal
                D7 (KDA, dano por minuto, vitórias). Vencer o torneio dá bônus extra.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-b border-border-soft">
        <div className="container-custom py-12 md:py-16">
          <div className="bg-gradient-to-br from-accent/10 to-transparent border border-accent/30 rounded-xl p-8 md:p-12 text-center">
            <p className="text-xs font-bold text-accent uppercase tracking-wider mb-3">
              Faltam {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}
            </p>
            <h2 className="text-3xl md:text-4xl font-black mb-3">
              Pronto pra disputar R$ {fmt(premioTotal)}?
            </h2>
            <p className="text-text-soft mb-6 max-w-xl mx-auto">
              Restam{' '}
              <span className="text-warning font-bold">
                {vagasRestantes} {vagasRestantes === 1 ? 'vaga' : 'vagas'}
              </span>
              . Cadastra teu time e tu tá dentro.
            </p>
            <RegistrationButton
              tournamentId={tournament.id}
              isFull={isFull}
              entryFee={inscricaoPorJogador}
              prizePool={premioTotal}
            />
          </div>
        </div>
      </section>

      {/* INSCRITOS */}
      <section>
        <div className="container-custom py-12">
          <h2 className="text-2xl font-black mb-2">
            🎮 Inscritos ({registrations.length})
          </h2>
          <p className="text-text-soft text-sm mb-6">
            Quem já garantiu vaga no {tournament.name}
          </p>
          <RegistrationsList registrations={registrations} />
        </div>
      </section>
    </div>
  );
}