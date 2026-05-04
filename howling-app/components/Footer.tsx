export default function Footer() {
  return (
    <footer className="border-t border-border-soft py-10 mt-16">
      <div className="container-custom flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-text-dim text-sm">
        <div>
          <div>Howling © 2026 · Versão Beta</div>
          <div className="text-[11px] text-text-dim mt-2 max-w-xl">
            Howling não é afiliado, endossado ou patrocinado pela Riot Games. League of Legends e
            Riot Games são marcas registradas da Riot Games, Inc.
          </div>
        </div>
        <div className="flex gap-6">
          <a href="#" className="text-text-soft hover:text-accent transition-colors">
            Sobre
          </a>
          <a href="#" className="text-text-soft hover:text-accent transition-colors">
            Termos
          </a>
          <a href="#" className="text-text-soft hover:text-accent transition-colors">
            Discord
          </a>
        </div>
      </div>
    </footer>
  );
}
