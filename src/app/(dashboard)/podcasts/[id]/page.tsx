import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Rss } from "lucide-react";
import { EpisodeList } from "@/components/episodes/episode-list";
import { AddContentForm } from "@/components/episodes/add-content-form";
import { CopyButton } from "@/components/podcasts/copy-button";
import { PublishRssButton } from "@/components/podcasts/publish-rss-button";
import { EditPodcastForm } from "@/components/podcasts/edit-podcast-form";
import { getRssFeedUrl } from "@/lib/services/rss";

export default async function PodcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const podcast = await prisma.podcast.findFirst({
    where: { id, userId: session.user.id },
    include: {
      episodes: { orderBy: { order: "asc" } },
      sources: true,
    },
  });

  if (!podcast) notFound();

  const rssUrl = getRssFeedUrl(podcast.id);

  return (
    <div className="space-y-8">
      {/* Back navigation */}
      <Link
        href="/podcasts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to podcasts
      </Link>

      {/* Header */}
      <EditPodcastForm podcast={podcast} />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {podcast.episodes.length} episode
          {podcast.episodes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* RSS Feed URL */}
      <div className="flex items-center gap-2 rounded-xl border bg-card p-3">
        <Rss className="h-4 w-4 text-muted-foreground shrink-0" />
        <code className="flex-1 text-sm font-mono text-muted-foreground truncate">
          {rssUrl}
        </code>
        <CopyButton text={rssUrl} />
        <PublishRssButton podcastId={podcast.id} />
      </div>

      {/* Add Content */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Add Content
        </h2>
        <AddContentForm podcastId={podcast.id} />
      </div>

      {/* Episodes */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Episodes
        </h2>
        <EpisodeList episodes={podcast.episodes} podcastId={podcast.id} />
      </div>
    </div>
  );
}
