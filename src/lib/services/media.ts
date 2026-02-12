import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";

const exec = promisify(execFile);

// Audio and video extensions we accept
const AUDIO_EXTENSIONS = new Set([
  ".mp3", ".m4a", ".aac", ".ogg", ".oga", ".opus",
  ".wav", ".flac", ".wma", ".aiff", ".aif",
]);

const VIDEO_EXTENSIONS = new Set([
  ".mp4", ".mkv", ".webm", ".avi", ".mov", ".wmv",
  ".flv", ".m4v", ".mpg", ".mpeg", ".3gp", ".ogv",
]);

const ALL_MEDIA_EXTENSIONS = new Set([...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS]);

/**
 * Client-side accept string for file inputs
 */
export const ACCEPTED_MEDIA_EXTENSIONS = [
  ...Array.from(AUDIO_EXTENSIONS),
  ...Array.from(VIDEO_EXTENSIONS),
].join(",");

/**
 * Check if a filename has a valid audio/video extension
 */
export function isValidMediaFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALL_MEDIA_EXTENSIONS.has(ext);
}

/**
 * Check if a file extension is audio (no conversion needed) vs video (needs extraction)
 */
function isAudioExtension(ext: string): boolean {
  return AUDIO_EXTENSIONS.has(ext.toLowerCase());
}

/**
 * Extract a human-readable title from a filename
 */
function titleFromFilename(filename: string): string {
  const name = path.basename(filename, path.extname(filename));
  // Replace underscores and hyphens with spaces, collapse whitespace
  return name.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Extract a title from a URL
 */
function titleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = path.basename(pathname);
    if (filename && filename !== "/") {
      return titleFromFilename(decodeURIComponent(filename));
    }
    return urlObj.hostname;
  } catch {
    return "Untitled";
  }
}

/**
 * Get audio duration and file size using ffprobe
 */
async function getMediaInfo(filePath: string): Promise<{ duration: number; fileSize: number }> {
  const stats = await fs.stat(filePath);
  let duration = 0;
  try {
    const { stdout } = await exec("ffprobe", [
      "-v", "quiet",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      filePath,
    ]);
    duration = Math.round(parseFloat(stdout.trim()));
  } catch {
    // duration will be 0 if ffprobe fails
  }
  return { duration, fileSize: stats.size };
}

/**
 * Convert a video or non-mp3 audio file to mp3 using ffmpeg
 */
async function convertToMp3(inputPath: string): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "podcast-convert-"));
  const outputPath = path.join(tmpDir, "audio.mp3");

  try {
    await exec("ffmpeg", [
      "-i", inputPath,
      "-vn",               // strip video
      "-acodec", "libmp3lame",
      "-ab", "192k",
      "-ar", "44100",
      "-y",                // overwrite
      outputPath,
    ], { timeout: 10 * 60_000 });

    return outputPath;
  } catch (error) {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

/**
 * Download a file from a URL to a temp directory
 */
async function downloadFromUrl(url: string): Promise<{ filePath: string; filename: string }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "podcast-dl-"));

  try {
    // Use fetch to download the file
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PodcastGenerator/1.0",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`);
    }

    // Try to get filename from Content-Disposition header
    let filename = "";
    const disposition = response.headers.get("content-disposition");
    if (disposition) {
      const match = disposition.match(/filename[*]?=(?:UTF-8'')?["']?([^"';\n]+)/i);
      if (match) {
        filename = decodeURIComponent(match[1].trim());
      }
    }

    // Fall back to URL path
    if (!filename) {
      const urlObj = new URL(url);
      filename = path.basename(urlObj.pathname) || "download";
    }

    // Ensure it has an extension — try Content-Type if missing
    if (!path.extname(filename)) {
      const contentType = response.headers.get("content-type") || "";
      const extMap: Record<string, string> = {
        "audio/mpeg": ".mp3",
        "audio/mp4": ".m4a",
        "audio/aac": ".aac",
        "audio/ogg": ".ogg",
        "audio/opus": ".opus",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/flac": ".flac",
        "video/mp4": ".mp4",
        "video/webm": ".webm",
        "video/x-matroska": ".mkv",
        "video/quicktime": ".mov",
        "video/x-msvideo": ".avi",
      };
      const ext = extMap[contentType.split(";")[0].trim()] || "";
      filename += ext;
    }

    const filePath = path.join(tmpDir, filename);

    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    return { filePath, filename };
  } catch (error) {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

/**
 * Process an uploaded or downloaded media file:
 * - Validates it's a real media file
 * - Converts to mp3 if needed
 * - Returns the mp3 path, duration, and fileSize
 */
async function processMediaFile(
  inputPath: string,
): Promise<{ mp3Path: string; duration: number; fileSize: number }> {
  const ext = path.extname(inputPath).toLowerCase();

  // If it's already an mp3, just get info
  if (ext === ".mp3") {
    const info = await getMediaInfo(inputPath);
    return { mp3Path: inputPath, ...info };
  }

  // Convert to mp3
  const mp3Path = await convertToMp3(inputPath);
  const info = await getMediaInfo(mp3Path);
  return { mp3Path, ...info };
}

/**
 * Determine if a URL looks like a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace("www.", "");
    return (
      hostname === "youtube.com" ||
      hostname === "youtu.be" ||
      hostname === "m.youtube.com" ||
      hostname === "music.youtube.com"
    );
  } catch {
    return false;
  }
}

export const media = {
  isValidMediaFile,
  isAudioExtension,
  titleFromFilename,
  titleFromUrl,
  getMediaInfo,
  convertToMp3,
  downloadFromUrl,
  processMediaFile,
  isYouTubeUrl,
  ACCEPTED_MEDIA_EXTENSIONS,
};
