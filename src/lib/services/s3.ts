import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";
import path from "path";

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
}

function getBucketName() {
  return process.env.S3_BUCKET_NAME || "";
}

function getPublicUrl(key: string): string {
  if (process.env.CUSTOM_DOMAIN) {
    return `https://${process.env.CUSTOM_DOMAIN}/${key}`;
  }
  if (process.env.CLOUDFRONT_DOMAIN) {
    return `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
  }
  return `https://${getBucketName()}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
}

async function uploadFile(
  filePath: string,
  key: string,
  contentType: string
): Promise<string> {
  const client = getS3Client();
  const fileStream = fs.createReadStream(filePath);

  const upload = new Upload({
    client,
    params: {
      Bucket: getBucketName(),
      Key: key,
      Body: fileStream,
      ContentType: contentType,
    },
  });

  await upload.done();
  return getPublicUrl(key);
}

async function uploadAudio(
  filePath: string,
  podcastId: string,
  episodeId: string
): Promise<string> {
  const key = `${podcastId}/episodes/${episodeId}/audio.mp3`;
  return uploadFile(filePath, key, "audio/mpeg");
}

async function uploadArtwork(
  filePath: string,
  podcastId: string,
  episodeId?: string
): Promise<string> {
  const ext = path.extname(filePath).toLowerCase() || ".jpg";
  const contentType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  const key = episodeId
    ? `${podcastId}/episodes/${episodeId}/artwork${ext}`
    : `${podcastId}/artwork${ext}`;

  return uploadFile(filePath, key, contentType);
}

async function deleteFile(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    })
  );
}

export const s3 = {
  uploadAudio,
  uploadArtwork,
  uploadFile,
  deleteFile,
  getPublicUrl,
};
