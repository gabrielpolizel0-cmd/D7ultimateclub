# Howling

Plataforma de torneios e ranking nacional brasileiro de LoL (ARAM e modos rápidos).

Versão atual: **MVP frontend com mock data**. Backend e integração com Riot API virão depois.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Mock data em memória (sem banco ainda)

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000

## Estrutura

```
howling/
├── app/                     # Páginas (Next.js App Router)
│   ├── layout.tsx           # Layout raiz com Header/Footer
│   ├── page.tsx             # Home
│   ├── globals.css          # Tailwind + estilos base
│   ├── torneios/
│   │   ├── page.tsx         # Lista de torneios
│   │   └── [slug]/page.tsx  # Detalhe de torneio
│   ├── ranking/page.tsx     # Leaderboard nacional
│   └── perfil/page.tsx      # Perfil do jogador
├── components/              # Componentes reutilizáveis
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── TournamentCard.tsx
│   ├── LeaderboardRow.tsx
│   ├── MatchRow.tsx
│   └── LPChart.tsx
├── data/                    # Mock data
│   ├── tournaments.ts
│   └── players.ts
├── lib/
│   └── types.ts             # Tipos TypeScript
└── tailwind.config.js
```

## Deploy no Vercel (15 minutos)

### 1. Subir no GitHub

```bash
git init
git add .
git commit -m "Initial commit: Howling MVP"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/howling.git
git push -u origin main
```

### 2. Conectar no Vercel

1. Acesse https://vercel.com
2. Faça login com GitHub
3. Clique em "Add New Project"
4. Selecione o repositório `howling`
5. Vercel detecta Next.js automaticamente — clique em "Deploy"
6. Em ~2 minutos seu site estará no ar em `https://howling-XXX.vercel.app`

### 3. Domínio personalizado (opcional)

Quando registrar um domínio (Registro.br, Namecheap, etc), configure no Vercel em:
Project Settings → Domains → Add domain

## Próximos passos

Esta versão é frontend-only. Próximas iterações:

1. **Banco de dados** — PostgreSQL (Neon) + Prisma
2. **Autenticação** — Sign In With Riot (RSO) ou Riot ID manual no início
3. **Integração Riot API** — puxar partidas e calcular ELO automaticamente
4. **Sistema de torneios** — registro, bracket generator, polling de partidas
5. **Discord bot** — anúncios, distribuição de senhas de lobby, vincular contas
6. **Pagamentos** — Stripe/Pagar.me pra Premium e inscrições

## Disclaimer

Howling não é afiliado, endossado ou patrocinado pela Riot Games. League of Legends e Riot Games são marcas registradas da Riot Games, Inc.
