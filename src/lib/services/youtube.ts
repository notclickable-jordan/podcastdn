import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";

const exec = promisify(execFile);

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  uploader: string;
}

export interface PlaylistMetadata {
  id: string;
  title: string;
  entries: VideoMetadata[];
}

function parseYouTubeUrl(url: string): {
  type: "video" | "playlist";
  id: string;
} {
  const urlObj = new URL(url);

  const listId = urlObj.searchParams.get("list");
  if (listId) {
    return { type: "playlist", id: listId };
  }

  let videoId = urlObj.searchParams.get("v");
  if (!videoId && urlObj.hostname === "youtu.be") {
    videoId = urlObj.pathname.slice(1);
  }

  if (videoId) {
    return { type: "video", id: videoId };
  }

  throw new Error("Could not parse YouTube URL");
}

async function getVideoMetadata(videoId: string): Promise<VideoMetadata> {
  const { stdout } = await exec("yt-dlp", [
    "--dump-json",
    "--no-download",
    "--no-playlist",
    `https://www.youtube.com/watch?v=${videoId}`,
  ]);

  const data = JSON.parse(stdout);
  return {
    id: data.id,
    title: data.title,
    description: data.description || "",
    thumbnail: data.thumbnail || "",
    duration: Math.round(data.duration || 0),
    uploader: data.uploader || "",
  };
}

async function getPlaylistMetadata(
  playlistId: string
): Promise<PlaylistMetadata> {
  const { stdout } = await exec("yt-dlp", [
    "--dump-json",
    "--flat-playlist",
    `https://www.youtube.com/playlist?list=${playlistId}`,
  ]);

  const lines = stdout.trim().split("\n");
  const entries: VideoMetadata[] = lines.map((line) => {
    const data = JSON.parse(line);
    return {
      id: data.id,
      title: data.title || "Untitled",
      description: data.description || "",
      thumbnail: data.thumbnails?.[0]?.url || "",
      duration: Math.round(data.duration || 0),
      uploader: data.uploader || "",
    };
  });

  return {
    id: playlistId,
    title: entries[0]?.title ? `Playlist: ${playlistId}` : playlistId,
    entries,
  };
}

async function downloadAudio(
  videoId: string,
  onProgress?: (percent: number) => void
): Promise<{ filePath: string; duration: number; fileSize: number }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "podcast-"));
  const outputPath = path.join(tmpDir, `${videoId}.mp3`);

  await exec(
    "yt-dlp",
    [
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "192K",
      "--no-playlist",
      "-o",
      outputPath,
      `https://www.youtube.com/watch?v=${videoId}`,
    ],
    { maxBuffer: 50 * 1024 * 1024 }
  );

  const stats = await fs.stat(outputPath);

  // Get duration via ffprobe
  let duration = 0;
  try {
    const { stdout } = await exec("ffprobe", [
      "-v",
      "quiet",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      outputPath,
    ]);
    duration = Math.round(parseFloat(stdout.trim()));
  } catch {
    // duration will be 0 if ffprobe fails
  }

  return {
    filePath: outputPath,
    duration,
    fileSize: stats.size,
  };
}

async function downloadThumbnail(videoId: string): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "podcast-thumb-"));
  const outputPath = path.join(tmpDir, `${videoId}.jpg`);

  await exec("yt-dlp", [
    "--write-thumbnail",
    "--skip-download",
    "--convert-thumbnails",
    "jpg",
    "-o",
    path.join(tmpDir, videoId),
    `https://www.youtube.com/watch?v=${videoId}`,
  ]);

  // yt-dlp may produce the file with different extensions
  const files = await fs.readdir(tmpDir);
  const thumbFile = files.find(
    (f) => f.endsWith(".jpg") || f.endsWith(".webp") || f.endsWith(".png")
  );

  if (thumbFile) {
    return path.join(tmpDir, thumbFile);
  }

  return outputPath;
}

export const youtube = {
  parseUrl: parseYouTubeUrl,
  getVideoMetadata,
  getPlaylistMetadata,
  downloadAudio,
  downloadThumbnail,
};
