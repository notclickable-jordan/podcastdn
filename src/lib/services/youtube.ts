import { execFile, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";

const exec = promisify(execFile);

export type ProgressCallback = (percent: number, message: string) => void;

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

  let videoId = urlObj.searchParams.get("v");
  if (!videoId && urlObj.hostname === "youtu.be") {
    videoId = urlObj.pathname.slice(1);
  }

  if (videoId) {
    return { type: "video", id: videoId };
  }

  const listId = urlObj.searchParams.get("list");
  if (listId) {
    return { type: "playlist", id: listId };
  }

  throw new Error("Could not parse YouTube URL");
}

async function getVideoMetadata(videoId: string): Promise<VideoMetadata> {
  const { stdout } = await exec(
    "yt-dlp",
    [
      "--dump-json",
      "--no-download",
      "--no-playlist",
      `https://www.youtube.com/watch?v=${videoId}`,
    ],
    { timeout: 60_000 }
  );

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
  const { stdout } = await exec(
    "yt-dlp",
    [
      "--dump-json",
      "--flat-playlist",
      `https://www.youtube.com/playlist?list=${playlistId}`,
    ],
    { timeout: 120_000 }
  );

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
  onProgress?: ProgressCallback
): Promise<{ filePath: string; duration: number; fileSize: number }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "podcast-"));
  const outputPath = path.join(tmpDir, `${videoId}.mp3`);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("yt-dlp", [
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "192K",
      "--no-playlist",
      "--newline",
      "-o",
      outputPath,
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);

    let isPostProcessing = false;

    const parseOutput = (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        // yt-dlp download progress: [download]  45.2% of ~10.00MiB ...
        const downloadMatch = line.match(
          /\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+\w+)/
        );
        if (downloadMatch) {
          const pct = parseFloat(downloadMatch[1]);
          const size = downloadMatch[2];
          onProgress?.(
            pct,
            `Downloading video… ${pct.toFixed(0)}% of ${size}`
          );
          continue;
        }

        // Post-processing / extraction
        if (
          line.includes("[ExtractAudio]") ||
          line.includes("[ffmpeg]") ||
          line.includes("Post-process")
        ) {
          if (!isPostProcessing) {
            isPostProcessing = true;
            onProgress?.(100, "Extracting audio…");
          }
        }
      }
    };

    proc.stdout.on("data", parseOutput);
    proc.stderr.on("data", parseOutput);

    const timeout = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error("yt-dlp timed out after 10 minutes"));
    }, 10 * 60_000);

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`yt-dlp exited with code ${code}`));
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

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

  await exec(
    "yt-dlp",
    [
      "--write-thumbnail",
      "--skip-download",
      "--convert-thumbnails",
      "jpg",
      "-o",
      path.join(tmpDir, videoId),
      `https://www.youtube.com/watch?v=${videoId}`,
    ],
    { timeout: 60_000 }
  );

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
