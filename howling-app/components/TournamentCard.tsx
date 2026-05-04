import Link from "next/link";
import { Tournament } from "@/lib/types";

interface Props {
  tournament: Tournament;
}

const typeStyles: Record<string, string> = {
  daily: "bg-accent/15 text-accent",
  weekly: "bg-rank-diamond/15 text-rank-diamond",
  monthly: "bg-gold/15 text-gold",
  sponsored: "bg-rank-master/15 text-rank-master",
};

const modeStyles: Record<string, string> = {
  ARAM: "bg-rank-master/12 text-rank-master",
  ARAM_MAYHEM: "bg-rank-gm/15 text-rank-gm",
  ARENA: "bg-warning/15 text-warning",
  BRAWL: "bg-rank-plat/15 text-rank-plat",
  SR: "bg-warning/12 text-warning",
};

const typeLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly Cup",
  monthly: "Liga Mensal",
  sponsored: "Patrocinado",
};

const modeLabels: Record<string, string> = {
  ARAM: "ARAM",
  ARAM_MAYHEM: "Mayhem",
  ARENA: "Arena",
  BRAWL: "Brawl",
  SR: "SR",
};

export default function TournamentCard({ tournament }: Props) {
  return (
    <Link
      href={`/torneios/${tournament.slug}`}
      className="block bg-bg-elevated border border-border rounded-xl p-5 transition-all hover:border-accent hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,229,180,0.08)] group"
    >
      <div className="flex items-center gap-2 mb-3.5 flex-wrap">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider ${
            typeStyles[tournament.type]
          }`}
        >
          {typeLabels[tournament.type]}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider ${
            modeStyles[tournament.mode]
          }`}
        >
          {modeLabels[tournament.mode]}
        </span>
        {tournament.status === "live" && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider bg-danger/15 text-danger inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-danger pulse-dot"></span>
            Ao vivo
          </span>
        )}
      </div>

      <div className="text-lg font-bold mb-1.5 tracking-tight group-hover:text-accent transition-colors">
        {tournament.name}
      </div>
      <div className="text-[13px] text-text-soft mb-4 leading-relaxed">{tournament.description}</div>

      <div className="flex justify-between pt-3.5 border-t border-border-soft">
        <div className="text-xs">
          <div className="text-text-dim mb-0.5 uppercase tracking-wider text-[10px] font-medium">
            Premiação
          </div>
          <div className="font-bold text-gold text-[13px]">
            {tournament.prizePool === 0 ? "Grátis" : `R$ ${tournament.prizePool.toLocaleString("pt-BR")}`}
          </div>
        </div>
        <div className="text-xs">
          <div className="text-text-dim mb-0.5 uppercase tracking-wider text-[10px] font-medium">
            Times
          </div>
          <div className="font-bold text-accent text-[13px]">
            {tournament.registeredTeams}/{tournament.maxTeams}
          </div>
        </div>
        <div className="text-xs">
          <div className="text-text-dim mb-0.5 uppercase tracking-wider text-[10px] font-medium">LP</div>
          <div className="font-bold text-text text-[13px]">×{tournament.lpMultiplier}</div>
        </div>
      </div>
    </Link>
  );
}
