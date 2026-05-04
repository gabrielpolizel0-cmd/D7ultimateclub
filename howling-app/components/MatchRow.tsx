import { MatchHistory } from "@/lib/types";

interface Props {
  match: MatchHistory;
}

export default function MatchRow({ match }: Props) {
  const win = match.result === "win";
  const kda = ((match.kills + match.assists) / Math.max(1, match.deaths)).toFixed(2);
  const goodKda = parseFloat(kda) >= 4;

  return (
    <div
      className={`grid grid-cols-[4px_70px_1fr_auto_auto] gap-3 md:gap-4 items-center p-3 bg-bg-card border border-border-soft rounded-lg transition-all hover:border-border`}
    >
      <div className={`w-1 h-9 rounded-sm ${win ? "bg-accent" : "bg-danger"}`}></div>

      <div>
        <div
          className={`text-xs font-bold uppercase tracking-wider ${
            win ? "text-accent" : "text-danger"
          }`}
        >
          {win ? "Vitória" : "Derrota"}
        </div>
        <div className="font-mono text-[11px] text-text-soft mt-0.5">
          {match.mode === "ARAM_MAYHEM" ? "Mayhem" : match.mode}
        </div>
      </div>

      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
          style={{ background: match.championColor }}
        >
          {match.championAbbr}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{match.champion}</div>
          <div className="font-mono text-xs text-text-soft mt-0.5">
            <span className={goodKda ? "text-accent" : ""}>
              {match.kills} / {match.deaths} / {match.assists}
            </span>
            <span className="text-text-dim mx-1">·</span>
            <span>{(match.damage / 1000).toFixed(1)}k dano</span>
          </div>
        </div>
      </div>

      <div className="font-mono text-sm font-bold text-right">
        <span className={win ? "text-accent" : "text-danger"}>
          {match.lpChange > 0 ? "+" : ""}
          {match.lpChange} LP
        </span>
      </div>

      <div className="hidden sm:block font-mono text-[11px] text-text-dim text-right">
        {match.playedAt}
      </div>
    </div>
  );
}
