
A self-hosted Next.js application that converts YouTube videos and playlists into podcast RSS feeds. Audio is extracted using yt-dlp, stored in S3, and served via CloudFront.

## Features

- **Multi-user authentication** — Email/password with OAuth support
- **Multiple podcast feeds** — Create and manage independent feeds
- **YouTube integration** — Add individual videos or entire playlists
- **Drag-and-drop** episode reordering
- **Automatic polling** for new playlist videos
- **RSS 2.0 + iTunes** compatible feeds
- **S3 + CloudFront** storage with custom domain support
- **Dark mode** with system preference detection
- **Docker** deployment ready

## Quick Start

### Docker (recommended)

```bash
cp .env.example .env
# Edit .env with your settings
docker compose up -d
```

The app will be available at `http://localhost:3000`.

### Local Development

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

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_URL` | Public URL of your app | Yes |
| `NEXTAUTH_SECRET` | Random secret for session encryption | Yes |
| `AWS_REGION` | AWS region for S3 | Yes |
| `AWS_ACCESS_KEY_ID` | AWS access key | Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Yes |
| `S3_BUCKET_NAME` | S3 bucket name | Yes |
| `CLOUDFRONT_DOMAIN` | CloudFront distribution domain | No |
| `CUSTOM_DOMAIN` | Fully qualified custom domain for media URLs (e.g. `https://media.example.com`) | No |
| `POLLING_INTERVAL_MINUTES` | How often to check for new playlist videos (default: 60) | No |

## S3 Bucket Setup

1. Create an S3 bucket in your AWS account
2. Enable public access for the bucket (or use CloudFront)
3. Add a bucket policy allowing public reads:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

## Tech Stack

- **Next.js 15** (App Router)
- **Tailwind CSS** + **shadcn/ui**
- **PostgreSQL** + **Prisma**
- **NextAuth.js** v5
- **AWS S3** + CloudFront
- **yt-dlp** + ffmpeg
- **dnd-kit** for drag and drop

## Demo Account

After running the seed script:
- **Email:** demo@example.com
- **Password:** password123
