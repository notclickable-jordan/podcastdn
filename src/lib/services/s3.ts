import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";
import path from "path";

export type UploadProgressCallback = (percent: number, loaded: number, total: number) => void;

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
    return `${process.env.CUSTOM_DOMAIN.replace(/\/$/, "")}/${key}`;
  }
  if (process.env.CLOUDFRONT_DOMAIN) {
    return `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
  }
  return `https://${getBucketName()}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
}

async function uploadFile(
  filePath: string,
  key: string,
  contentType: string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const client = getS3Client();
  const fileStream = fs.createReadStream(filePath);
  const stats = fs.statSync(filePath);
  const totalSize = stats.size;

  const upload = new Upload({
    client,
    params: {
      Bucket: getBucketName(),
      Key: key,
      Body: fileStream,
      ContentType: contentType,
    },
  });

  upload.on("httpUploadProgress", (progress) => {
    if (onProgress && progress.loaded != null) {
      const total = progress.total ?? totalSize;
      const pct = total > 0 ? Math.round((progress.loaded / total) * 100) : 0;
      onProgress(pct, progress.loaded, total);
    }
  });

  await upload.done();
  return getPublicUrl(key);
}

async function uploadAudio(
  filePath: string,
  folderName: string,
  episodeId: string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const key = `${folderName}/episodes/${episodeId}/audio.mp3`;
  return uploadFile(filePath, key, "audio/mpeg", onProgress);
}

async function uploadArtwork(
  filePath: string,
  folderName: string,
  episodeId?: string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const ext = path.extname(filePath).toLowerCase() || ".jpg";
  const contentType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  const key = episodeId
    ? `${folderName}/episodes/${episodeId}/artwork${ext}`
    : `${folderName}/artwork${ext}`;

  return uploadFile(filePath, key, contentType, onProgress);
}

async function uploadContent(
  content: string,
  key: string,
  contentType: string
): Promise<string> {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: content,
      ContentType: contentType,
    })
  );
  return getPublicUrl(key);
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

async function deleteFolder(prefix: string): Promise<void> {
  const client = getS3Client();
  const bucket = getBucketName();

  let continuationToken: string | undefined;
  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix.endsWith("/") ? prefix : `${prefix}/`,
        ContinuationToken: continuationToken,
      })
    );

    const objects = list.Contents;
    if (objects && objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objects.map((o) => ({ Key: o.Key! })),
            Quiet: true,
          },
        })
      );
    }

    continuationToken = list.IsTruncated
      ? list.NextContinuationToken
      : undefined;
  } while (continuationToken);
}

async function invalidateCloudFront(paths: string[]): Promise<void> {
  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  if (!distributionId) return;

  const cf = new CloudFrontClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });

  await cf.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: paths.length,
          Items: paths.map((p) => (p.startsWith("/") ? p : `/${p}`)),
        },
      },
    })
  );
}

export const s3 = {
  uploadAudio,
  uploadArtwork,
  uploadFile,
  uploadContent,
  deleteFile,
  deleteFolder,
  getPublicUrl,
  invalidateCloudFront,
};
