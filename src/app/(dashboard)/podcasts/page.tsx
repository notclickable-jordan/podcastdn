import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Podcast, Search } from "lucide-react";
import { PodcastCard } from "@/components/podcasts/podcast-card";
import { CreatePodcastDialog } from "@/components/podcasts/create-podcast-dialog";

export default async function PodcastsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const podcasts = await prisma.podcast.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { episodes: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Podcasts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your podcast feeds
          </p>
        </div>
        <CreatePodcastDialog />
      </div>

      {podcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Podcast className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No podcasts yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4 text-center max-w-sm">
            Create your first podcast to start converting YouTube videos into
            podcast episodes.
          </p>
          <CreatePodcastDialog />
        </div>
      ) : (
        <div className="grid gap-3">
          {podcasts.map((podcast) => (
            <PodcastCard key={podcast.id} podcast={podcast} />
          ))}
        </div>
      )}
    </div>
  );
}
