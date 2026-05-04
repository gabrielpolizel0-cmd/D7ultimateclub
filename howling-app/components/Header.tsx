"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentPlayer } from "@/data/players";

const navItems = [
  { href: "/", label: "Início" },
  { href: "/torneios", label: "Torneios" },
  { href: "/ranking", label: "Ranking" },
  { href: "/perfil", label: "Meu perfil" },
];

export default function Header() {
  const pathname = usePathname();

  const initials = currentPlayer.displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="border-b border-border-soft bg-bg/85 backdrop-blur-xl sticky top-0 z-50">
      <div className="container-custom flex items-center justify-between py-4">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-deep flex items-center justify-center font-mono font-bold text-bg text-base shadow-[0_0_24px_rgba(0,229,180,0.4)]">
              H
            </div>
            <span>Howling</span>
          </Link>

          <nav className="hidden md:flex gap-1">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium px-3.5 py-2 rounded-md transition-all ${
                    active
                      ? "text-accent bg-bg-card"
                      : "text-text-soft hover:text-text hover:bg-bg-card"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-danger/10 border border-danger/30 rounded-full text-[11px] font-semibold text-danger uppercase tracking-wide">
            <span className="w-1.5 h-1.5 bg-danger rounded-full pulse-dot"></span>
            3 ao vivo
          </span>

          <div className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 bg-bg-card border border-border rounded-full cursor-pointer hover:border-accent transition-colors">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rank-diamond to-rank-master flex items-center justify-center font-bold text-xs">
              {initials}
            </div>
            <div className="hidden sm:block">
              <div className="text-[13px] font-medium leading-tight">{currentPlayer.riotId}</div>
              <div className="font-mono text-[11px] text-rank-plat font-semibold">
                {currentPlayer.rank.tier} {currentPlayer.rank.division} · {currentPlayer.rank.lp} LP
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
