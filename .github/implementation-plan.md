# YouTube to Podcast Generator - Implementation Plan

## Overview
A self-hosted Next.js application that converts YouTube videos and playlists into podcast RSS feeds, stored in S3 with CloudFront CDN support. Users can manage multiple podcasts, reorder episodes, and automatically poll for new content.

## Architecture

### Technology Stack
- **Frontend/Backend**: Next.js 14+ (App Router)
- **Database**: PostgreSQL
- **File Storage**: AWS S3 (with CloudFront CDN support)
- **YouTube Downloader**: yt-dlp (via child process)
- **Audio Processing**: ffmpeg (for format conversion/normalization)
- **Authentication**: NextAuth.js (credentials + OAuth)
- **Container**: Docker with multi-stage build
- **Background Jobs**: Node-cron or Bull/BullMQ for polling

### Key Features
1. Multi-user authentication (password-based + OAuth support for Authelia/Pocket ID)
2. Create and manage multiple podcast feeds
3. Add individual videos or entire playlists to podcasts
4. Reorder episodes via drag-and-drop UI
5. Automatic polling for new videos in playlists
6. Generate RSS feeds compliant with podcast standards
7. S3 storage with optional CloudFront CDN and custom domain

## Implementation Workplan

### Phase 1: Project Setup
- [ ] Initialize Next.js project with TypeScript
- [ ] Set up project structure (app/, lib/, components/, types/)
- [ ] Configure PostgreSQL connection with Prisma ORM
- [ ] Create initial database schema (users, podcasts, episodes, sources)
- [ ] Set up environment variable configuration
- [ ] Create Dockerfile with multi-stage build
- [ ] Add docker-compose.yml for local development (app + PostgreSQL)

### Phase 2: Database Schema & Models
- [ ] Design and implement Prisma schema:
  - User model (id, email, password, oauth provider/id)
  - Podcast model (id, title, description, artwork, settings, userId)
  - Episode model (id, title, description, audioUrl, imageUrl, duration, order, podcastId)
  - Source model (id, type [video/playlist], youtubeId, lastChecked, podcastId)
  - Job model (id, type, status, progress, metadata)
- [ ] Create Prisma migrations
- [ ] Seed script for development data

### Phase 3: Authentication System
- [ ] Install and configure NextAuth.js
- [ ] Implement credentials provider (email + password)
- [ ] Implement OAuth provider support (generic OIDC for Authelia/Pocket ID)
- [ ] Create user registration and login pages
- [ ] Add middleware for route protection
- [ ] Create user management API routes

### Phase 4: YouTube Integration
- [ ] Install yt-dlp and ffmpeg in Docker image
- [ ] Create YouTube service module:
  - Function to fetch video metadata
  - Function to fetch playlist metadata
  - Function to download video and extract audio
  - Function to download thumbnail/artwork
- [ ] Implement audio conversion to MP3 (consistent bitrate)
- [ ] Add progress tracking for downloads
- [ ] Error handling and retry logic

### Phase 5: S3 Integration
- [ ] Install AWS SDK for S3
- [ ] Create S3 service module:
  - Upload audio files
  - Upload artwork/thumbnails
  - Generate public URLs
  - Support for CloudFront CDN URLs
  - Support for custom domain names
- [ ] Configure S3 bucket settings (CORS, public access)
- [ ] Add configuration for optional CloudFront distribution

### Phase 6: Core API Routes
- [ ] POST /api/podcasts - Create new podcast
- [ ] GET /api/podcasts - List user's podcasts
- [ ] GET /api/podcasts/[id] - Get podcast details
- [ ] PUT /api/podcasts/[id] - Update podcast metadata
- [ ] DELETE /api/podcasts/[id] - Delete podcast
- [ ] POST /api/podcasts/[id]/episodes - Add video/playlist to podcast
- [ ] PUT /api/podcasts/[id]/episodes/reorder - Reorder episodes
- [ ] DELETE /api/podcasts/[id]/episodes/[episodeId] - Remove episode
- [ ] GET /api/podcasts/[id]/rss - Generate RSS feed
- [ ] POST /api/podcasts/[id]/refresh - Manually trigger refresh

### Phase 7: Background Job System
- [ ] Set up job queue system (Bull/BullMQ or node-cron)
- [ ] Create job processor for:
  - Video download and processing
  - Playlist scanning for new videos
  - Scheduled polling of all active sources
- [ ] Implement job status tracking
- [ ] Create API endpoints to check job progress
- [ ] Add job cleanup for completed/failed jobs

### Phase 8: RSS Feed Generation
- [ ] Install RSS generation library (rss or podcast)
- [ ] Create RSS feed generator:
  - Standard podcast RSS 2.0 format
  - iTunes podcast tags
  - Include episode metadata (title, description, duration, artwork)
  - Support for custom podcast artwork
  - Include proper MIME types and file sizes
- [ ] Public endpoint for RSS feeds (no auth required)
- [ ] Add caching for RSS feeds

### Phase 9: Frontend UI - Dashboard
- [ ] Create main dashboard layout
- [ ] List all user's podcasts with cards/thumbnails
- [ ] Create "New Podcast" modal/page
- [ ] Add search/filter functionality
- [ ] Display podcast statistics (episode count, total duration)

### Phase 10: Frontend UI - Podcast Detail Page
- [ ] Display podcast metadata and artwork
- [ ] Show RSS feed URL with copy button
- [ ] List all episodes with metadata
- [ ] Implement drag-and-drop reordering (react-beautiful-dnd or dnd-kit)
- [ ] Add episode controls (play preview, delete)
- [ ] "Add Content" section:
  - Input for YouTube URL (video or playlist)
  - Display processing progress
  - Show success/error messages

### Phase 11: Frontend UI - Settings
- [ ] S3 configuration page (bucket, region, access keys)
- [ ] CloudFront/custom domain configuration
- [ ] User profile and password change
- [ ] OAuth connection management
- [ ] Polling interval configuration
- [ ] Global settings (default audio quality, etc.)

### Phase 12: Frontend UI - Job Monitor
- [ ] Job queue visualization
- [ ] Real-time progress updates (polling or WebSocket)
- [ ] Job history with filtering
- [ ] Ability to cancel running jobs
- [ ] Error logs for failed jobs

### Phase 13: Polish & Error Handling
- [ ] Add loading states and skeletons
- [ ] Implement toast notifications for user actions
- [ ] Error boundary components
- [ ] Form validation (client and server)
- [ ] Rate limiting for API routes
- [ ] Input sanitization
- [ ] Comprehensive error messages

### Phase 14: Docker & Deployment
- [ ] Optimize Dockerfile (layer caching, security)
- [ ] Create docker-compose.yml for production
- [ ] Add health check endpoints
- [ ] Create startup scripts and initialization
- [ ] Document environment variables
- [ ] Add volume mounts for temporary storage
- [ ] Configure proper networking (port 80)

### Phase 15: Documentation
- [ ] README.md with setup instructions
- [ ] Docker deployment guide
- [ ] S3 bucket setup guide
- [ ] CloudFront configuration guide
- [ ] OAuth provider setup (Authelia/Pocket ID)
- [ ] Environment variable reference
- [ ] Troubleshooting guide
- [ ] API documentation

### Phase 16: Testing & Optimization
- [ ] Test with various YouTube URLs
- [ ] Test playlist polling behavior
- [ ] Test with large playlists
- [ ] Verify RSS feed compatibility with podcast apps
- [ ] Performance optimization (database queries, caching)
- [ ] Memory usage optimization for downloads
- [ ] Add database indexes
- [ ] Test CloudFront integration

## Technical Considerations

### Database Schema Notes
- Episodes should have an `order` field for manual reordering
- Sources track `lastChecked` timestamp for polling
- Jobs track progress percentage and status (pending/processing/completed/failed)
- Support soft deletes for podcasts/episodes

### S3 Configuration
- Environment variables: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
- Optional: `CLOUDFRONT_DOMAIN`, `CUSTOM_DOMAIN`
- Files organized: `{podcastId}/episodes/{episodeId}/audio.mp3` and `artwork.jpg`

### RSS Feed Considerations
- Cache RSS feeds (regenerate on episode changes)
- Include `<guid>` for episode tracking
- Proper `<enclosure>` tags with length and type
- iTunes-specific tags for better compatibility
- Use S3/CloudFront URLs for media files

### Download Processing
- Queue system prevents overwhelming the server
- Temporary storage for downloads before S3 upload
- Cleanup temp files after upload
- Retry failed downloads with exponential backoff

### Authentication
- NextAuth.js supports both credentials and OAuth
- OIDC configuration for Authelia/Pocket ID
- Secure password hashing (bcrypt)
- Session management with JWT or database sessions

### UI/UX
- Beautiful, modern design (Tailwind CSS + shadcn/ui components)
- Responsive (mobile-friendly)
- Real-time updates for job progress
- Intuitive workflow for adding content
- Clear feedback for all actions

## Dependencies (npm packages)
- next
- react
- typescript
- @prisma/client & prisma
- next-auth
- bcrypt / bcryptjs
- aws-sdk / @aws-sdk/client-s3
- rss or podcast (RSS generation)
- bull or bullmq (job queue)
- node-cron (scheduling)
- zod (validation)
- tailwindcss
- @radix-ui/* or shadcn/ui components
- react-beautiful-dnd or @dnd-kit/* (drag and drop)
- date-fns or dayjs (date handling)

## System Dependencies (Docker)
- Node.js 20+
- yt-dlp
- ffmpeg
- PostgreSQL client libraries

## Environment Variables
```
DATABASE_URL=postgresql://user:password@postgres:5432/podcastdb
NEXTAUTH_URL=http://localhost
NEXTAUTH_SECRET=random-secret
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET_NAME=your-bucket
CLOUDFRONT_DOMAIN= (optional)
CUSTOM_DOMAIN= (optional)
POLLING_INTERVAL_MINUTES=60
```

## Success Criteria
- User can create account and log in
- User can create multiple podcasts
- User can add YouTube videos/playlists to podcasts
- Audio is extracted and uploaded to S3
- RSS feeds are generated and accessible
- Podcast apps can subscribe and play episodes
- Playlists automatically update with new videos
- UI is intuitive and responsive
- Docker image runs on port 80
- CloudFront/custom domains work correctly
