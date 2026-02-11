import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  RefreshCw,
  Rss,
  Podcast as PodcastIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EpisodeList } from "@/components/episodes/episode-list";
import { AddContentForm } from "@/components/episodes/add-content-form";
import { CopyButton } from "@/components/podcasts/copy-button";

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

  const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const rssUrl = `${siteUrl}/api/podcasts/${podcast.id}/rss`;

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
      <div className="flex items-start gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-muted overflow-hidden">
          {podcast.artwork ? (
            <img
              src={podcast.artwork}
              alt={podcast.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <PodcastIcon className="h-9 w-9 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            {podcast.title}
          </h1>
          {podcast.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2">
              {podcast.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground">
              {podcast.episodes.length} episode
              {podcast.episodes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* RSS Feed URL */}
      <div className="flex items-center gap-2 rounded-xl border bg-card p-3">
        <Rss className="h-4 w-4 text-muted-foreground shrink-0" />
        <code className="flex-1 text-sm font-mono text-muted-foreground truncate">
          {rssUrl}
        </code>
        <CopyButton text={rssUrl} />
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
