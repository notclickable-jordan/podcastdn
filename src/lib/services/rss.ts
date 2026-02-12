import RSS from "rss";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/services/s3";

export async function generateRssFeed(podcastId: string): Promise<string> {
  const podcast = await prisma.podcast.findUnique({
    where: { id: podcastId },
    include: {
      episodes: {
        where: { audioUrl: { not: null } },
        orderBy: { createdAt: "desc" },
      },
      user: { select: { name: true, email: true } },
    },
  });

  if (!podcast) throw new Error("Podcast not found");

  const feedUrl = getRssFeedUrl(podcastId);
  const siteUrl = getPublicBaseUrl();

  const feed = new RSS({
    title: podcast.title,
    description: podcast.description || "",
    feed_url: feedUrl,
    site_url: siteUrl,
    image_url: podcast.artwork || undefined,
    language: podcast.language,
    categories: podcast.category ? [podcast.category] : undefined,
    pubDate: podcast.updatedAt,
    custom_namespaces: {
      itunes: "http://www.itunes.com/dtds/podcast-1.0.dtd",
    },
    custom_elements: [
      { "itunes:author": podcast.author || podcast.user.name || "" },
      { "itunes:summary": podcast.description || "" },
      {
        "itunes:explicit": podcast.explicit ? "yes" : "no",
      },
      ...(podcast.artwork
        ? [
            {
              "itunes:image": {
                _attr: { href: podcast.artwork },
              },
            },
          ]
        : []),
      ...(podcast.category
        ? [
            {
              "itunes:category": {
                _attr: { text: podcast.category },
              },
            },
          ]
        : []),
    ],
  });

  for (const episode of podcast.episodes) {
    feed.item({
      title: episode.title,
      description: episode.description || "",
      url: feedUrl,
      guid: episode.id,
      date: episode.createdAt,
      enclosure: {
        url: episode.audioUrl!,
        size: episode.fileSize || 0,
        type: "audio/mpeg",
      },
      custom_elements: [
        {
          "itunes:duration": episode.duration
            ? formatItunesDuration(episode.duration)
            : "0:00",
        },
        { "itunes:summary": episode.description || "" },
        ...((episode.imageUrl || podcast.artwork)
          ? [
              {
                "itunes:image": {
                  _attr: { href: episode.imageUrl || podcast.artwork },
                },
              },
            ]
          : []),
      ],
    });
  }

  return stripCdata(feed.xml({ indent: true }));
}

function formatItunesDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getPublicBaseUrl(): string {
  if (process.env.CUSTOM_DOMAIN) return `https://${process.env.CUSTOM_DOMAIN}`;
  if (process.env.CLOUDFRONT_DOMAIN) return `https://${process.env.CLOUDFRONT_DOMAIN}`;
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripCdata(xml: string): string {
  return xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, content) => escapeXml(content));
}

function getRssFeedKey(podcastId: string): string {
  return `${podcastId}/feed.xml`;
}

export function getRssFeedUrl(podcastId: string): string {
  return s3.getPublicUrl(getRssFeedKey(podcastId));
}

export async function publishRssFeed(podcastId: string): Promise<string> {
  const xml = await generateRssFeed(podcastId);
  const key = getRssFeedKey(podcastId);
  const url = await s3.uploadContent(xml, key, "application/rss+xml; charset=utf-8");
  await s3.invalidateCloudFront([key]).catch(() => {});
  return url;
}

export async function deleteRssFeed(podcastId: string): Promise<void> {
  const key = getRssFeedKey(podcastId);
  await s3.deleteFile(key).catch(() => {});
  await s3.invalidateCloudFront([key]).catch(() => {});
}
