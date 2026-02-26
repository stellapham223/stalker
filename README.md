# Competitor Stalker

Monitor competitor changes on Shopify App Store and websites. Track pricing, descriptions, keywords, and more with automatic before/after diffs.

## Tech Stack

- **Monorepo**: Bun workspace
- **Backend**: Express + Puppeteer + Prisma + PostgreSQL + pg-boss
- **Frontend**: Next.js + shadcn/ui + TailwindCSS + TanStack Query
- **Language**: JavaScript

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Start PostgreSQL
docker compose up -d

# 3. Setup environment
cp .env.example .env

# 4. Create database tables
bun run db:push

# 5. Start dev servers (API on :4000, Web on :3000)
bun run dev
```

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start both API and Web |
| `bun run dev:api` | Start API only |
| `bun run dev:web` | Start Web only |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:studio` | Open Prisma Studio |
| `bun run db:generate` | Generate Prisma client |

## Project Structure

```
apps/
  api/        # Express backend
  web/        # Next.js frontend
packages/
  shared/     # Shared constants
```
