# Copilot Instructions - Podcast Generator

## Project Overview

A self-hosted Next.js application that converts YouTube videos and playlists into podcast RSS feeds. Audio is extracted using yt-dlp, stored in S3, and served via CloudFront. Multi-user authentication with OAuth support.

## Commands

- `npm run dev` — Start dev server with Turbopack
- `npm run build` — Generate Prisma client and build Next.js (`prisma generate && next build`)
- `npm run lint` — ESLint via `next lint`
- `npm run db:migrate` — `prisma migrate dev`
- `npm run db:push` — Push schema changes without migration
- `npm run db:seed` — Seed demo data (`npx tsx prisma/seed.ts`)

## Architecture

**Next.js App Router** (Next.js 16) with two route groups:

- `(auth)` — Login/register pages (no auth required)
- `(dashboard)` — Podcasts, jobs, settings (auth required via middleware)

**API routes** follow REST conventions under `src/app/api/`. All authenticated endpoints call `auth()` from `@/lib/auth` and check `session.user.id`. Dynamic route params are async (`params` is a `Promise`).

**Background job system** — Work is modeled as `Job` records in Postgres with a status machine (`pending` → `processing` → `completed`/`failed`). A cron scheduler (`src/lib/cron.ts`) polls for pending jobs every 30 seconds and processes them sequentially. Job types: `download_video`, `scan_playlist`, `poll_sources`.

**Media pipeline** — YouTube → yt-dlp (audio extraction) → S3 upload → CloudFront/custom domain URL. The `youtube` service shells out to `yt-dlp` and `ffprobe` binaries. Temp files are written to `os.tmpdir()` and cleaned up after upload.

**S3 key structure** — `{podcastId}/episodes/{episodeId}/audio.mp3` for audio, `{podcastId}/artwork.{ext}` for podcast art. Public URLs resolve via CloudFront domain, custom domain, or direct S3 URL (in that priority).

**RSS generation** — `src/lib/services/rss.ts` produces RSS 2.0 + iTunes namespace XML. The feed endpoint (`/api/podcasts/[id]/rss`) is unauthenticated and publicly cacheable.

## Key Conventions

- **Path alias**: `@/*` maps to `./src/*`
- **Prisma singleton**: Always import `prisma` from `@/lib/prisma` (uses global cache to avoid multiple clients in dev)
- **Validation**: Zod schemas in `src/lib/validations.ts` — used in API routes with `.parse()` for input validation
- **Service modules**: `src/lib/services/` exports namespace objects (e.g., `youtube.parseUrl()`, `s3.uploadAudio()`) rather than bare functions
- **UI components**: shadcn/ui in `src/components/ui/` (Radix primitives + Tailwind CSS v4). Use `cn()` from `@/lib/utils` for conditional class merging
- **Auth pattern**: NextAuth v5 with JWT strategy. Middleware in `src/middleware.ts` protects `/podcasts/*`, `/settings/*`, `/jobs/*`, and their API counterparts
- **Episode ordering**: Episodes have an `order` field for drag-and-drop reordering via dnd-kit. New episodes get `max(order) + 1`
- **Docker**: Standalone output mode (`next.config.mjs`) for Docker deployment