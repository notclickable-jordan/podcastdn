import RSS from "rss";
import { prisma } from "@/lib/prisma";

export async function generateRssFeed(podcastId: string): Promise<string> {
  const podcast = await prisma.podcast.findUnique({
    where: { id: podcastId },
    include: {
      episodes: {
        where: { audioUrl: { not: null } },
        orderBy: { order: "asc" },
      },
      user: { select: { name: true, email: true } },
    },
  });

  if (!podcast) throw new Error("Podcast not found");

  const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const feed = new RSS({
    title: podcast.title,
    description: podcast.description || "",
    feed_url: `${siteUrl}/api/podcasts/${podcast.id}/rss`,
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
      url: `${siteUrl}/api/podcasts/${podcast.id}/rss`,
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
        ...(episode.imageUrl
          ? [
              {
                "itunes:image": {
                  _attr: { href: episode.imageUrl },
                },
              },
            ]
          : []),
      ],
    });
  }

  return feed.xml({ indent: true });
}

function formatItunesDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
