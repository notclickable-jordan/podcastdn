import { prisma } from "@/lib/prisma";
import { youtube } from "@/lib/services/youtube";
import { s3 } from "@/lib/services/s3";
import fs from "fs/promises";

export async function processVideoJob(jobId: string) {
  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status: "processing", startedAt: new Date(), progress: 0 },
  });

  const metadata = job.metadata as {
    videoId: string;
    podcastId: string;
    episodeId: string;
  };

  try {
    // Fetch video metadata
    await prisma.job.update({
      where: { id: jobId },
      data: { progress: 10, message: "Fetching video metadata..." },
    });

    const videoMeta = await youtube.getVideoMetadata(metadata.videoId);

    // Update episode with metadata
    await prisma.episode.update({
      where: { id: metadata.episodeId },
      data: {
        title: videoMeta.title,
        description: videoMeta.description,
        duration: videoMeta.duration,
      },
    });

    // Download audio
    await prisma.job.update({
      where: { id: jobId },
      data: { progress: 30, message: "Downloading audio..." },
    });

    const { filePath, duration, fileSize } = await youtube.downloadAudio(
      metadata.videoId
    );

    // Upload to S3
    await prisma.job.update({
      where: { id: jobId },
      data: { progress: 70, message: "Uploading to S3..." },
    });

    const audioUrl = await s3.uploadAudio(
      filePath,
      metadata.podcastId,
      metadata.episodeId
    );

    // Download and upload thumbnail
    await prisma.job.update({
      where: { id: jobId },
      data: { progress: 85, message: "Processing thumbnail..." },
    });

    let imageUrl: string | null = null;
    try {
      const thumbPath = await youtube.downloadThumbnail(metadata.videoId);
      imageUrl = await s3.uploadArtwork(
        thumbPath,
        metadata.podcastId,
        metadata.episodeId
      );
      await fs.rm(thumbPath, { recursive: true, force: true }).catch(() => {});
    } catch {
      // Thumbnail is optional
    }

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

    // Cleanup temp file
    await fs.rm(filePath, { recursive: true, force: true }).catch(() => {});

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "completed",
        progress: 100,
        message: "Complete",
        endedAt: new Date(),
      },
    });
  } catch (error) {
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

export async function processPlaylistScan(jobId: string) {
  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status: "processing", startedAt: new Date(), progress: 0 },
  });

  const metadata = job.metadata as {
    playlistId: string;
    podcastId: string;
  };

  try {
    await prisma.job.update({
      where: { id: jobId },
      data: { progress: 10, message: "Scanning playlist..." },
    });

    const playlist = await youtube.getPlaylistMetadata(metadata.playlistId);

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

    // Get current max order
    const maxOrder = await prisma.episode.findFirst({
      where: { podcastId: metadata.podcastId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    let nextOrder = (maxOrder?.order ?? -1) + 1;

    // Create episodes and download jobs for new videos
    for (const video of newVideos) {
      const episode = await prisma.episode.create({
        data: {
          title: video.title,
          description: video.description,
          youtubeId: video.id,
          duration: video.duration,
          order: nextOrder++,
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
  } catch (error) {
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

// Process pending jobs (called by cron)
export async function processPendingJobs() {
  const jobs = await prisma.job.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 1,
  });

  for (const job of jobs) {
    try {
      if (job.type === "download_video") {
        await processVideoJob(job.id);
      } else if (job.type === "scan_playlist") {
        await processPlaylistScan(job.id);
      } else if (job.type === "poll_sources") {
        await pollAllSources();
      }
    } catch {
      // Error already recorded in job
    }
  }
}

async function pollAllSources() {
  const sources = await prisma.source.findMany({
    where: { type: "playlist" },
    include: { podcast: true },
  });

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

    await prisma.source.update({
      where: { id: source.id },
      data: { lastChecked: new Date() },
    });
  }
}
