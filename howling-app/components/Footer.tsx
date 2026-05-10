import Link from 'next/link';

const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE || 'https://discord.gg/SEU-CONVITE-AQUI';

export default function Footer() {
  return (
    <footer className="border-t border-border-soft py-10 mt-16">
      <div className="container-custom flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-text-dim text-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg width="20" height="20" viewBox="0 0 40 40" aria-hidden="true">
              <path
                d="M6 28 L8 14 L14 22 L20 10 L26 22 L32 14 L34 28 Z"
                fill="#00e5b4"
                stroke="#00e5b4"
                strokeWidth="1"
                strokeLinejoin="round"
              />
              <rect x="6" y="30" width="28" height="3" fill="#00e5b4" />
            </svg>
            <span className="text-text font-bold">D7 Ultimate Club</span>
            <span className="text-text-dim text-xs">© 2026</span>
          </div>
          <div className="text-[11px] text-text-dim max-w-xl leading-relaxed">
            Plataforma independente de torneios de ARAM Desordem · Não afiliada à Riot Games.
            League of Legends e Riot Games são marcas registradas da Riot Games, Inc.
          </div>
          <div className="text-[11px] text-text-dim mt-2">
            Contato: <a href="mailto:contato@d7ultimateclub.com.br" className="hover:text-accent transition-colors">contato@d7ultimateclub.com.br</a>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/torneios" className="text-text-soft hover:text-accent transition-colors">
            Torneios
          </Link>
          <Link href="/termos" className="text-text-soft hover:text-accent transition-colors">
            Termos de uso
          </Link>
          <Link href="/privacidade" className="text-text-soft hover:text-accent transition-colors">
            Privacidade
          </Link>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-soft hover:text-accent transition-colors"
          >
            Discord
          </a>
        </div>
      </div>
    </footer>
  );
}