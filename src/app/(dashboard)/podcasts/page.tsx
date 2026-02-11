import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Podcast, Search } from "lucide-react";
import { PodcastCard } from "@/components/podcasts/podcast-card";
import { CreatePodcastDialog } from "@/components/podcasts/create-podcast-dialog";
import { ImportPodcastDialog } from "@/components/podcasts/import-podcast-dialog";

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Podcasts</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Manage your podcast feeds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportPodcastDialog />
          <CreatePodcastDialog />
        </div>
      </div>

      {podcasts.length === 0 ? (
        <div className="flex flex-col justify-center items-center px-4 py-16 border border-dashed rounded-2xl">
          <div className="flex justify-center items-center bg-primary/10 mb-4 rounded-2xl w-16 h-16">
            <Podcast className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">No podcasts yet</h3>
          <p className="mt-1 mb-4 max-w-sm text-muted-foreground text-sm text-center">
            Create your first podcast to start converting YouTube videos into
            podcast episodes.
          </p>
          <CreatePodcastDialog />
        </div>
      ) : (
        <div className="gap-3 grid">
          {podcasts.map((podcast) => (
            <PodcastCard key={podcast.id} podcast={podcast} />
          ))}
        </div>
      )}
    </div>
  );
}
