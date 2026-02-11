import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Rss } from "lucide-react";
import { EpisodeList } from "@/components/episodes/episode-list";
import { AddContentForm } from "@/components/episodes/add-content-form";
import { CopyButton } from "@/components/podcasts/copy-button";
import { PublishRssButton } from "@/components/podcasts/publish-rss-button";
import { ExportPodcastButton } from "@/components/podcasts/export-podcast-button";
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
      {/* Top bar: back link + action buttons */}
      <div className="grid grid-cols-[1fr_auto] items-center">
        <Link
          href="/podcasts"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to podcasts
        </Link>
        <div className="flex items-center gap-2">
          <PublishRssButton podcastId={podcast.id} />
          <ExportPodcastButton podcastId={podcast.id} />
        </div>
      </div>

      {/* Two-column header: info left, actions right */}
      <div className="flex lg:flex-row flex-col lg:items-start gap-6">
        {/* Left column — podcast info */}
        <div className="flex-1 space-y-2 min-w-0">
          <EditPodcastForm podcast={podcast} />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {podcast.episodes.length} episode
              {podcast.episodes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Right column — RSS feed + add content */}
        <div className="space-y-4 w-full lg:w-80 xl:w-96 shrink-0">
          {/* RSS Feed URL */}
          <div className="flex items-center gap-2 bg-card p-3 border rounded-xl">
            <Rss className="w-4 h-4 text-muted-foreground shrink-0" />
            <code className="flex-1 font-mono text-muted-foreground text-sm truncate">
              {rssUrl}
            </code>
            <CopyButton text={rssUrl} />
          </div>

          {/* Add Content */}
          <div className="space-y-2">
            <h2 className="font-medium text-muted-foreground text-sm">
              Add Content
            </h2>
            <AddContentForm podcastId={podcast.id} />
          </div>
        </div>
      </div>

      {/* Episodes */}
      <div className="space-y-3">
        <h2 className="font-medium text-muted-foreground text-sm">
          Episodes
        </h2>
        <EpisodeList episodes={podcast.episodes} podcastId={podcast.id} />
      </div>
    </div>
  );
}
