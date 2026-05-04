import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import HomeCTAs from "@/components/HomeCTAs";

export const dynamic = "force-dynamic";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  game_mode: string;
  start_date: string;
  max_teams: number;
  team_size: number | null;
  entry_fee: number | null;
  prize_pool: number | null;
  status: string;
  format: string | null;
}

async function getTournaments() {
  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: true });
  return (data as Tournament[]) || [];
}

// Considera "data placeholder" qualquer ano >= 2050 (uso 2099 como sentinel)
function isPlaceholderDate(iso: string) {
  return new Date(iso).getFullYear() >= 2050;
}

function formatDate(iso: string) {
  if (isPlaceholderDate(iso)) return "Em breve";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBRL(value: number | null | undefined) {
  if (!value && value !== 0) return null;
  return `R$ ${Number(value).toLocaleString("pt-BR")}`;
}

function statusBadge(status: string) {
  if (status === "live")
    return { label: "AO VIVO", classes: "bg-red-500/15 border-red-500 text-red-400" };
  if (status === "upcoming")
    return { label: "EM BREVE", classes: "bg-emerald-500/15 border-emerald-500 text-emerald-400" };
  if (status === "finished")
    return { label: "ENCERRADO", classes: "bg-gray-500/15 border-gray-500 text-gray-400" };
  if (status === "cancelled")
    return { label: "CANCELADO", classes: "bg-gray-500/15 border-gray-500 text-gray-400" };
  return { label: status.toUpperCase(), classes: "bg-gray-500/15 border-gray-500 text-gray-400" };
}

export default async function HomePage() {
  const tournaments = await getTournaments();
  const featured = tournaments.slice(0, 3);
  const nextTournament = tournaments.find((t) => t.status === "upcoming" || t.status === "live");

  return (
    <>
      {/* Hero */}
      <section className="pt-14 pb-10">
        <div className="container-custom grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-stretch">
          {/* Hero principal */}
          <div className="bg-gradient-to-br from-bg-elevated to-bg-card border border-border rounded-2xl p-10 relative overflow-hidden">
            <div
              className="absolute -top-1/2 -right-1/3 w-[600px] h-[600px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(0,229,180,0.25) 0%, transparent 60%)",
              }}
            />
            <span className="relative inline-flex items-center gap-1.5 px-3 py-1 bg-accent/15 border border-accent rounded-full text-[11px] font-semibold text-accent uppercase tracking-wider mb-6">
              ● D7 Ultimate Club
            </span>
            <h1 className="relative text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight mb-4">
              Torneios de{" "}
              <span className="bg-gradient-to-br from-accent to-accent-deep bg-clip-text text-transparent">
                ARAM Desordem
              </span>{" "}
              com premiação real
            </h1>
            <p className="relative text-text-soft text-base md:text-lg max-w-xl mb-8">
              Junte sua equipe de 5 jogadores, inscreva-se em torneios oficiais do D7 Ultimate Club
              e dispute chaves eliminatórias com premiações que vão de R$ 600 até R$ 18.000.
            </p>
            <HomeCTAs />
          </div>

          {/* Próximo torneio (real, do Supabase) */}
          <div className="bg-bg-elevated border border-border rounded-2xl p-6 flex flex-col">
            <div className="font-mono text-[11px] text-text-dim uppercase tracking-widest mb-4">
              {nextTournament ? "Próximo torneio" : "Sem torneios"}
            </div>

            {nextTournament ? (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-lg font-bold mb-1">{nextTournament.name}</div>
                  <div className="text-[13px] text-text-soft mb-3">
                    {formatDate(nextTournament.start_date)} · {nextTournament.max_teams} times
                    {nextTournament.prize_pool
                      ? ` · ${formatBRL(nextTournament.prize_pool)}`
                      : ""}
                  </div>
                  {nextTournament.description && (
                    <p className="text-sm text-text-soft mb-5 line-clamp-4">
                      {nextTournament.description}
                    </p>
                  )}
                </div>
                <Link
                  href={`/torneios/${nextTournament.id}`}
                  className="btn-primary w-full text-center"
                >
                  Ver detalhes
                </Link>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-soft text-sm text-center px-6">
                Nenhum torneio aberto no momento.
                <br />
                Volte em breve!
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-12">
        <div className="container-custom">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Como funciona</h2>
            <p className="text-text-soft text-sm">Quatro passos pra disputar seu primeiro torneio</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Step
              n="1"
              title="Crie sua conta"
              desc="Cadastre-se com seu Riot ID. Validamos automaticamente seu invocador."
            />
            <Step
              n="2"
              title="Monte seu time"
              desc="Junte 5 jogadores e escolha um torneio aberto. Cada um paga sua inscrição via PIX."
            />
            <Step
              n="3"
              title="Aguarde o sorteio"
              desc="Quando as inscrições fecharem, geramos o bracket automaticamente."
            />
            <Step
              n="4"
              title="Jogue e vença"
              desc="Dispute eliminatórias e concorra à premiação do torneio."
            />
          </div>
        </div>
      </section>

      {/* Torneios em destaque (reais) */}
      {featured.length > 0 && (
        <section className="py-8 pb-16">
          <div className="container-custom">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">Torneios em destaque</h2>
              <Link
                href="/torneios"
                className="text-text-soft hover:text-accent text-sm font-medium"
              >
                Ver todos →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featured.map((t) => {
                const badge = statusBadge(t.status);
                const dateLabel = formatDate(t.start_date);
                return (
                  <Link
                    key={t.id}
                    href={`/torneios/${t.id}`}
                    className="bg-bg-elevated border border-border rounded-2xl p-5 hover:border-accent transition-colors group flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 bg-bg-card border border-border rounded text-[10px] font-mono uppercase text-text-soft">
                        ARAM Desordem
                      </span>
                      <span
                        className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold mb-2 group-hover:text-accent transition-colors">
                      {t.name}
                    </h3>

                    {t.description && (
                      <p className="text-xs text-text-soft mb-4 line-clamp-3">{t.description}</p>
                    )}

                    {/* spacer pra empurrar os numeros pra baixo */}
                    <div className="flex-1" />

                    {/* Detalhes financeiros */}
                    <div className="pt-3 border-t border-border space-y-1.5">
                      <DetailRow label="Início" value={dateLabel} />
                      <DetailRow label="Times" value={`${t.max_teams} times`} />
                      {t.entry_fee !== null && t.entry_fee !== undefined && (
                        <DetailRow
                          label="Inscrição"
                          value={`${formatBRL(t.entry_fee)} / jogador`}
                        />
                      )}
                      {t.prize_pool && (
                        <DetailRow
                          label="Prêmio do time"
                          value={formatBRL(t.prize_pool) || "—"}
                          highlight
                        />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="bg-bg-elevated border border-border rounded-xl p-5">
      <div className="w-10 h-10 bg-accent/15 border border-accent rounded-lg flex items-center justify-center font-bold text-accent text-lg mb-4">
        {n}
      </div>
      <div className="font-bold mb-1.5">{title}</div>
      <p className="text-xs text-text-soft leading-relaxed">{desc}</p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-dim uppercase font-mono text-[10px]">{label}</span>
      <span className={highlight ? "text-accent font-bold" : "text-text"}>{value}</span>
    </div>
  );
}