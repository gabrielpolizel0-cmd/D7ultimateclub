import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MetaPixel from "./MetaPixel";

export const metadata: Metadata = {
  title: "Howling — Plataforma de torneios de LoL",
  description:
    "Ranking nacional brasileiro de ARAM e modos rápidos. Conecte sua conta Riot, jogue como sempre joga, e veja seu ranking subir.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta
          name="facebook-domain-verification"
          content="fmk6ijfxujc1grewldgp1qbibb6k7q"
        />
      </head>
      <body>
        <MetaPixel />
        <div className="glow-bg"></div>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}