import { LeaderboardEntry } from "@/lib/types";

interface Props {
  entry: LeaderboardEntry;
}

const tierStyles: Record<string, string> = {
  CHALLENGER: "bg-rank-chal/12 text-rank-chal",
  GRANDMASTER: "bg-rank-gm/12 text-rank-gm",
  MASTER: "bg-rank-master/12 text-rank-master",
  DIAMOND: "bg-rank-diamond/12 text-rank-diamond",
  PLATINUM: "bg-rank-plat/12 text-rank-plat",
  GOLD: "bg-rank-gold/12 text-rank-gold",
  SILVER: "bg-rank-silver/12 text-rank-silver",
  BRONZE: "bg-rank-bronze/12 text-rank-bronze",
  IRON: "bg-rank-iron/30 text-text-soft",
};

const tierNames: Record<string, string> = {
  CHALLENGER: "DESAFIANTE",
  GRANDMASTER: "GRÃO-MESTRE",
  MASTER: "MESTRE",
  DIAMOND: "DIAMANTE",
  PLATINUM: "PLATINA",
  GOLD: "OURO",
  SILVER: "PRATA",
  BRONZE: "BRONZE",
  IRON: "FERRO",
};

export default function LeaderboardRow({ entry }: Props) {
  const initials = entry.displayName.slice(0, 2).toUpperCase();

  let posClass = "text-text-soft";
  if (entry.position === 1) posClass = "text-gold";
  else if (entry.position === 2) posClass = "text-rank-silver";
  else if (entry.position === 3) posClass = "text-rank-bronze";

  return (
    <div className="grid grid-cols-[40px_1fr_80px_60px] md:grid-cols-[60px_1fr_120px_80px_80px_80px] gap-3 md:gap-4 px-4 md:px-7 py-3.5 items-center border-b border-border-soft hover:bg-bg-card transition-colors last:border-0">
      <div className={`font-mono font-bold ${posClass}`}>{String(entry.position).padStart(2, "0")}</div>

      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] flex-shrink-0 text-white"
          style={{ background: entry.avatarColor }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{entry.displayName}</div>
          <div className="font-mono text-[11px] text-text-dim truncate">
            {entry.riotId} · {entry.city}
          </div>
        </div>
      </div>

      <div>
        <span
          className={`font-mono text-[11px] font-bold px-2.5 py-1 rounded text-center inline-block tracking-wider ${
            tierStyles[entry.tier]
          }`}
        >
          {tierNames[entry.tier]}
          {entry.division ? ` ${entry.division}` : ""}
        </span>
      </div>

      <div className="font-mono font-semibold text-[13px] text-right">{entry.lp.toLocaleString("pt-BR")}</div>

      <div className="hidden md:block font-mono font-semibold text-[13px] text-right text-accent">
        {entry.winrate}%
      </div>

      <div className="hidden md:block font-mono font-semibold text-[13px] text-right">{entry.matches}</div>
    </div>
  );
}
