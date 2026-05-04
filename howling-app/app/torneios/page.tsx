import TournamentCard from "@/components/TournamentCard";
import { tournaments } from "@/data/tournaments";
import { Tournament } from "@/lib/types";

export default function TorneiosPage() {
  const live = tournaments.filter((t) => t.status === "live");
  const open = tournaments.filter((t) => t.status === "open");
  const soon = tournaments.filter((t) => t.status === "soon");

  return (
    <div className="container-custom py-12">
      <div className="mb-10">
        <div className="font-mono text-[11px] text-text-dim uppercase tracking-widest mb-2">
          Torneios
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Encontre seu próximo torneio
        </h1>
        <p className="text-text-soft mt-3 max-w-2xl">
          Daily ARAM grátis todo dia às 19h. Weekly Cups aos sábados com premiação. Liga mensal pra
          quem quer pontos corridos. Escolha seu formato.
        </p>
      </div>

      {live.length > 0 && (
        <Section title="Ao vivo agora" subtitle="Torneios em andamento" tournaments={live} />
      )}

      {open.length > 0 && (
        <Section
          title="Inscrições abertas"
          subtitle="Entre antes que feche"
          tournaments={open}
        />
      )}

      {soon.length > 0 && (
        <Section title="Em breve" subtitle="Programados pra essa semana" tournaments={soon} />
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  tournaments,
}: {
  title: string;
  subtitle: string;
  tournaments: Tournament[];
}) {
  return (
    <div className="mb-12">
      <div className="mb-5">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <div className="text-sm text-text-soft mt-1">{subtitle}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tournaments.map((t) => (
          <TournamentCard key={t.slug} tournament={t} />
        ))}
      </div>
    </div>
  );
}
