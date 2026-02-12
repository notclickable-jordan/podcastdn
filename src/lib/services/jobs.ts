import { prisma } from "@/lib/prisma";
import { youtube } from "@/lib/services/youtube";
import { media } from "@/lib/services/media";
import { s3 } from "@/lib/services/s3";
import { publishRssFeed } from "@/lib/services/rss";
import path from "path";
import fs from "fs/promises";

// Throttle job progress updates to avoid overwhelming the database
function createProgressUpdater(jobId: string, minIntervalMs = 800) {
  let lastUpdate = 0;
  let pending: { progress: number; message: string } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = async () => {
    if (!pending) return;
    const data = pending;
    pending = null;
    lastUpdate = Date.now();
    await prisma.job.update({
      where: { id: jobId },
      data: { progress: data.progress, message: data.message },
    }).catch(() => {});
  };

  return {
    update(progress: number, message: string) {
      pending = { progress, message };
      const elapsed = Date.now() - lastUpdate;
      if (elapsed >= minIntervalMs) {
        flush();
      } else if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          flush();
        }, minIntervalMs - elapsed);
      }
    },
    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await flush();
    },
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function processVideoJob(jobId: string) {
  console.log(`[job:${jobId}] Starting video download job`);

  // Track temp directories for cleanup
  let audioTmpDir: string | null = null;
  let thumbTmpDir: string | null = null;

  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status: "processing", startedAt: new Date(), progress: 0, message: "Starting…" },
  });

  const metadata = job.metadata as {
    videoId: string;
    podcastId: string;
    episodeId: string;
  };

  const progressUpdater = createProgressUpdater(jobId);

  console.log(`[job:${jobId}] Video: ${metadata.videoId}, Episode: ${metadata.episodeId}`);

  try {
    // Phase 1: Fetch video metadata (0–5%)
    progressUpdater.update(2, "Fetching video metadata…");

    console.log(`[job:${jobId}] Fetching metadata for video ${metadata.videoId}`);
    const videoMeta = await youtube.getVideoMetadata(metadata.videoId);
    console.log(`[job:${jobId}] Got metadata: "${videoMeta.title}" (${videoMeta.duration}s)`);

    progressUpdater.update(5, "Metadata retrieved");

    // Update episode with metadata
    await prisma.episode.update({
      where: { id: metadata.episodeId },
      data: {
        title: videoMeta.title,
        description: videoMeta.description,
        duration: videoMeta.duration,
      },
    });

    // Phase 2: Download & extract audio (5–60%)
    progressUpdater.update(6, "Starting download…");

    console.log(`[job:${jobId}] Downloading audio...`);
    const startDownload = Date.now();
    const { filePath, duration, fileSize } = await youtube.downloadAudio(
      metadata.videoId,
      (pct, message) => {
        // Map yt-dlp 0-100% download to job 6-55%, extraction to 55-60%
        if (message.includes("Extracting")) {
          progressUpdater.update(57, "Extracting audio from video…");
        } else {
          const jobPct = Math.round(6 + (pct / 100) * 49);
          progressUpdater.update(jobPct, message);
        }
      }
    );
    audioTmpDir = path.dirname(filePath);
    console.log(`[job:${jobId}] Audio downloaded in ${((Date.now() - startDownload) / 1000).toFixed(1)}s (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);

    await progressUpdater.flush();
    progressUpdater.update(60, `Audio ready — ${formatBytes(fileSize)}`);

    // Phase 3: Upload to S3 (60–90%)
    console.log(`[job:${jobId}] Uploading audio to S3...`);
    const audioUrl = await s3.uploadAudio(
      filePath,
      metadata.podcastId,
      metadata.episodeId,
      (pct, loaded, total) => {
        const jobPct = Math.round(60 + (pct / 100) * 30);
        progressUpdater.update(
          jobPct,
          `Uploading audio… ${pct}% (${formatBytes(loaded)} / ${formatBytes(total)})`
        );
      }
    );
    console.log(`[job:${jobId}] Audio uploaded: ${audioUrl}`);

    await progressUpdater.flush();

    // Phase 4: Thumbnail (90–95%)
    progressUpdater.update(91, "Downloading thumbnail…");

    let imageUrl: string | null = null;
    try {
      console.log(`[job:${jobId}] Downloading thumbnail...`);
      const thumbPath = await youtube.downloadThumbnail(metadata.videoId);
      thumbTmpDir = path.dirname(thumbPath);
      progressUpdater.update(93, "Uploading thumbnail…");
      imageUrl = await s3.uploadArtwork(
        thumbPath,
        metadata.podcastId,
        metadata.episodeId
      );
      console.log(`[job:${jobId}] Thumbnail uploaded: ${imageUrl}`);
    } catch (error) {
      console.warn(`[job:${jobId}] Thumbnail failed (non-fatal):`, error instanceof Error ? error.message : error);
    }

    // Phase 5: Finalize (95–100%)
    progressUpdater.update(96, "Saving episode data…");

    // Update episode
    await prisma.episode.update({
      where: { id: metadata.episodeId },
      data: {
        audioUrl,
        imageUrl,
        duration,
        fileSize,
      },
    });

    await progressUpdater.flush();

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "completed",
        progress: 100,
        message: "Complete",
        endedAt: new Date(),
      },
    });

    console.log(`[job:${jobId}] Completed successfully`);

    // Publish updated RSS feed to S3
    await publishRssFeed(metadata.podcastId).catch((error) => {
      console.warn(`[job:${jobId}] RSS publish failed (non-fatal):`, error instanceof Error ? error.message : error);
    });
  } catch (error) {
    console.error(`[job:${jobId}] Failed:`, error instanceof Error ? error.message : error);
    await progressUpdater.flush();
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        endedAt: new Date(),
      },
    });
    throw error;
  } finally {
    // Clean up all temp directories regardless of success or failure
    if (audioTmpDir) {
      await fs.rm(audioTmpDir, { recursive: true, force: true }).catch(() => {});
    }
    if (thumbTmpDir) {
      await fs.rm(thumbTmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export async function processPlaylistScan(jobId: string) {
  console.log(`[job:${jobId}] Starting playlist scan job`);
  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status: "processing", startedAt: new Date(), progress: 0 },
  });

  const metadata = job.metadata as {
    playlistId: string;
    podcastId: string;
  };

  console.log(`[job:${jobId}] Playlist: ${metadata.playlistId}, Podcast: ${metadata.podcastId}`);

  try {
    await prisma.job.update({
      where: { id: jobId },
      data: { progress: 10, message: "Scanning playlist..." },
    });

    console.log(`[job:${jobId}] Fetching playlist metadata...`);
    const playlist = await youtube.getPlaylistMetadata(metadata.playlistId);
    console.log(`[job:${jobId}] Playlist has ${playlist.entries.length} total video(s)`);

    // Get existing episodes in this podcast
    const existingEpisodes = await prisma.episode.findMany({
      where: { podcastId: metadata.podcastId },
      select: { youtubeId: true },
    });
    const existingIds = new Set(existingEpisodes.map((e) => e.youtubeId));

    // Find new videos
    const newVideos = playlist.entries.filter(
      (v) => !existingIds.has(v.id)
    );
    console.log(`[job:${jobId}] Found ${newVideos.length} new video(s) (${existingIds.size} already exist)`);

    // Create episodes and download jobs for new videos
    for (const video of newVideos) {
      const episode = await prisma.episode.create({
        data: {
          title: video.title,
          description: video.description,
          youtubeId: video.id,
          duration: video.duration,
          podcastId: metadata.podcastId,
        },
      });

      // Create a download job for each new episode
      await prisma.job.create({
        data: {
          type: "download_video",
          metadata: {
            videoId: video.id,
            podcastId: metadata.podcastId,
            episodeId: episode.id,
          },
        },
      });

      console.log(`[job:${jobId}] Queued download for "${video.title}" (${video.id})`);
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "completed",
        progress: 100,
        message: `Found ${newVideos.length} new video(s)`,
        endedAt: new Date(),
      },
    });

    console.log(`[job:${jobId}] Playlist scan completed`);

    // Publish updated RSS feed to S3
    await publishRssFeed(metadata.podcastId).catch((error) => {
      console.warn(`[job:${jobId}] RSS publish failed (non-fatal):`, error instanceof Error ? error.message : error);
    });
  } catch (error) {
    console.error(`[job:${jobId}] Failed:`, error instanceof Error ? error.message : error);
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        endedAt: new Date(),
      },
    });
    throw error;
  }
}

const STALE_JOB_TIMEOUT_MS = 30 * 60_000; // 30 minutes

// Reset jobs stuck in "processing" for longer than the timeout
async function recoverStaleJobs() {
  const cutoff = new Date(Date.now() - STALE_JOB_TIMEOUT_MS);
  const result = await prisma.job.updateMany({
    where: {
      status: "processing",
      startedAt: { lt: cutoff },
    },
    data: {
      status: "failed",
      error: "Job timed out after 30 minutes",
      endedAt: new Date(),
    },
  });
  if (result.count > 0) {
    console.warn(`[cron] Recovered ${result.count} stale job(s)`);
  }
}

export async function processPollSources(jobId: string) {
  console.log(`[job:${jobId}] Starting poll sources job`);
  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status: "processing", startedAt: new Date(), progress: 0 },
  });

  const metadata = job.metadata as { podcastId?: string } | null;

  try {
    const sources = await prisma.source.findMany({
      where: {
        type: "playlist",
        ...(metadata?.podcastId ? { podcastId: metadata.podcastId } : {}),
      },
    });

    console.log(`[job:${jobId}] Found ${sources.length} playlist source(s) to poll`);

    let created = 0;
    for (const source of sources) {
      await prisma.job.create({
        data: {
          type: "scan_playlist",
          metadata: {
            playlistId: source.youtubeId,
            podcastId: source.podcastId,
          },
        },
      });
      created++;

      await prisma.source.update({
        where: { id: source.id },
        data: { lastChecked: new Date() },
      });
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "completed",
        progress: 100,
        endedAt: new Date(),
        message: `Created ${created} scan job(s)`,
      },
    });
  } catch (error) {
    console.error(`[job:${jobId}] Poll sources failed:`, error);
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "failed",
        endedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}

export async function processUrlDownloadJob(jobId: string) {
  console.log(`[job:${jobId}] Starting URL download job`);

  let downloadTmpDir: string | null = null;
  let convertTmpDir: string | null = null;

  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status: "processing", startedAt: new Date(), progress: 0, message: "Starting…" },
  });

  const metadata = job.metadata as {
    url: string;
    podcastId: string;
    episodeId: string;
  };

  const progressUpdater = createProgressUpdater(jobId);

  console.log(`[job:${jobId}] URL: ${metadata.url}, Episode: ${metadata.episodeId}`);

  try {
    // Phase 1: Download file (0–40%)
    progressUpdater.update(5, "Downloading file…");

    console.log(`[job:${jobId}] Downloading from ${metadata.url}`);
    const { filePath: downloadedPath, filename } = await media.downloadFromUrl(metadata.url);
    downloadTmpDir = path.dirname(downloadedPath);
    console.log(`[job:${jobId}] Downloaded: ${filename}`);

    progressUpdater.update(40, "File downloaded");

    // Validate it's a media file
    if (!media.isValidMediaFile(filename)) {
      // Clean up the invalid file
      await fs.rm(downloadTmpDir, { recursive: true, force: true }).catch(() => {});
      downloadTmpDir = null;
      throw new Error(`Invalid media file type: ${filename}`);
    }

    // Phase 2: Convert to mp3 (40–70%)
    progressUpdater.update(45, "Processing audio…");

    console.log(`[job:${jobId}] Processing media file...`);
    const { mp3Path, duration, fileSize } = await media.processMediaFile(downloadedPath);
    if (mp3Path !== downloadedPath) {
      convertTmpDir = path.dirname(mp3Path);
    }
    console.log(`[job:${jobId}] Audio processed: ${(fileSize / 1024 / 1024).toFixed(1)} MB, ${duration}s`);

    progressUpdater.update(70, `Audio ready — ${formatBytes(fileSize)}`);

    // Update episode with title from filename
    const title = media.titleFromUrl(metadata.url);
    await prisma.episode.update({
      where: { id: metadata.episodeId },
      data: { title, duration },
    });

    // Phase 3: Upload to S3 (70–95%)
    progressUpdater.update(72, "Uploading audio…");

    console.log(`[job:${jobId}] Uploading audio to S3...`);
    const audioUrl = await s3.uploadAudio(
      mp3Path,
      metadata.podcastId,
      metadata.episodeId,
      (pct, loaded, total) => {
        const jobPct = Math.round(72 + (pct / 100) * 23);
        progressUpdater.update(
          jobPct,
          `Uploading audio… ${pct}% (${formatBytes(loaded)} / ${formatBytes(total)})`
        );
      }
    );
    console.log(`[job:${jobId}] Audio uploaded: ${audioUrl}`);

    // Phase 4: Finalize (95–100%)
    progressUpdater.update(96, "Saving episode data…");

    await prisma.episode.update({
      where: { id: metadata.episodeId },
      data: { audioUrl, duration, fileSize },
    });

    await progressUpdater.flush();

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "completed",
        progress: 100,
        message: "Complete",
        endedAt: new Date(),
      },
    });

    console.log(`[job:${jobId}] Completed successfully`);

    await publishRssFeed(metadata.podcastId).catch((error) => {
      console.warn(`[job:${jobId}] RSS publish failed (non-fatal):`, error instanceof Error ? error.message : error);
    });
  } catch (error) {
    console.error(`[job:${jobId}] Failed:`, error instanceof Error ? error.message : error);
    await progressUpdater.flush();
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        endedAt: new Date(),
      },
    });
    throw error;
  } finally {
    if (downloadTmpDir) {
      await fs.rm(downloadTmpDir, { recursive: true, force: true }).catch(() => {});
    }
    if (convertTmpDir) {
      await fs.rm(convertTmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export async function processUploadJob(jobId: string) {
  console.log(`[job:${jobId}] Starting upload processing job`);

  let convertTmpDir: string | null = null;

  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status: "processing", startedAt: new Date(), progress: 0, message: "Starting…" },
  });

  const metadata = job.metadata as {
    filePath: string;
    originalFilename: string;
    podcastId: string;
    episodeId: string;
  };

  const progressUpdater = createProgressUpdater(jobId);

  console.log(`[job:${jobId}] File: ${metadata.originalFilename}, Episode: ${metadata.episodeId}`);

  try {
    // Validate the file exists and is a valid media file
    if (!media.isValidMediaFile(metadata.originalFilename)) {
      // Delete the invalid uploaded file
      await fs.rm(metadata.filePath, { force: true }).catch(() => {});
      throw new Error(`Invalid media file type: ${metadata.originalFilename}`);
    }

    // Verify the file actually exists
    try {
      await fs.access(metadata.filePath);
    } catch {
      throw new Error("Uploaded file not found — it may have been cleaned up");
    }

    // Phase 1: Convert to mp3 (0–50%)
    progressUpdater.update(10, "Processing audio…");

    console.log(`[job:${jobId}] Processing uploaded file...`);
    const { mp3Path, duration, fileSize } = await media.processMediaFile(metadata.filePath);
    if (mp3Path !== metadata.filePath) {
      convertTmpDir = path.dirname(mp3Path);
    }
    console.log(`[job:${jobId}] Audio processed: ${(fileSize / 1024 / 1024).toFixed(1)} MB, ${duration}s`);

    progressUpdater.update(50, `Audio ready — ${formatBytes(fileSize)}`);

    // Update episode title from filename
    const title = media.titleFromFilename(metadata.originalFilename);
    await prisma.episode.update({
      where: { id: metadata.episodeId },
      data: { title, duration },
    });

    // Phase 2: Upload to S3 (50–95%)
    progressUpdater.update(52, "Uploading audio…");

    console.log(`[job:${jobId}] Uploading audio to S3...`);
    const audioUrl = await s3.uploadAudio(
      mp3Path,
      metadata.podcastId,
      metadata.episodeId,
      (pct, loaded, total) => {
        const jobPct = Math.round(52 + (pct / 100) * 43);
        progressUpdater.update(
          jobPct,
          `Uploading audio… ${pct}% (${formatBytes(loaded)} / ${formatBytes(total)})`
        );
      }
    );
    console.log(`[job:${jobId}] Audio uploaded: ${audioUrl}`);

    // Phase 3: Finalize (95–100%)
    progressUpdater.update(96, "Saving episode data…");

    await prisma.episode.update({
      where: { id: metadata.episodeId },
      data: { audioUrl, duration, fileSize },
    });

    await progressUpdater.flush();

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "completed",
        progress: 100,
        message: "Complete",
        endedAt: new Date(),
      },
    });

    console.log(`[job:${jobId}] Completed successfully`);

    await publishRssFeed(metadata.podcastId).catch((error) => {
      console.warn(`[job:${jobId}] RSS publish failed (non-fatal):`, error instanceof Error ? error.message : error);
    });
  } catch (error) {
    console.error(`[job:${jobId}] Failed:`, error instanceof Error ? error.message : error);
    await progressUpdater.flush();
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        endedAt: new Date(),
      },
    });
    throw error;
  } finally {
    // Always clean up the uploaded file
    const uploadDir = path.dirname(metadata.filePath);
    await fs.rm(uploadDir, { recursive: true, force: true }).catch(() => {});
    if (convertTmpDir) {
      await fs.rm(convertTmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

// Process pending jobs (called by cron)
export async function processPendingJobs() {
  await recoverStaleJobs();

  // Process all pending jobs in a loop until the queue is drained
  // (new jobs may be created during processing, e.g. scan_playlist → download_video)
  let processed = 0;
  while (true) {
    const job = await prisma.job.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });

    if (!job) break;

    if (processed === 0) {
      console.log("[cron] Processing pending jobs…");
    }
    processed++;

    try {
      if (job.type === "download_video") {
        await processVideoJob(job.id);
      } else if (job.type === "scan_playlist") {
        await processPlaylistScan(job.id);
      } else if (job.type === "poll_sources") {
        await processPollSources(job.id);
      } else if (job.type === "download_url") {
        await processUrlDownloadJob(job.id);
      } else if (job.type === "process_upload") {
        await processUploadJob(job.id);
      } else {
        console.warn(`[cron] Unknown job type: ${job.type} (job ${job.id})`);
      }
    } catch {
      // Error already recorded in job
    }
  }

  if (processed > 0) {
    console.log(`[cron] Finished processing ${processed} job(s)`);
  }
}


