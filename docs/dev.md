# Development

## Docker

1. Rename `.env.example` to `.env`
1. Set your environment variables in that file
1. Start the [Docker](../compose.yml) containers
    ``` bash
    docker compose up -d
    ```

The app will be available at `http://localhost:3000`.

## Local

**Prerequisites:** Node.js 20+, PostgreSQL, yt-dlp, ffmpeg

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL

# Set up database
npx prisma migrate dev

# Seed demo data (optional)
npm run db:seed

# Start dev server
npm run dev
```