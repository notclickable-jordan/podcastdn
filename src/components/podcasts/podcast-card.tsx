import Link from "next/link";
import { Podcast as PodcastIcon, Music, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface PodcastCardProps {
  podcast: {
    id: string;
    title: string;
    description: string | null;
    artwork: string | null;
    updatedAt: Date;
    _count: { episodes: number };
  };
}

export function PodcastCard({ podcast }: PodcastCardProps) {
  return (
    <Link href={`/podcasts/${podcast.id}`}>
      <Card className="group relative flex items-center gap-4 p-4 hover:shadow-md hover:bg-accent/50 transition-all duration-200 cursor-pointer border-l-4 border-l-transparent hover:border-l-primary">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
          {podcast.artwork ? (
            <img
              src={podcast.artwork}
              alt={podcast.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <PodcastIcon className="h-7 w-7 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {podcast.title}
          </h3>
          {podcast.description && (
            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
              {podcast.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Music className="h-3 w-3" />
              {podcast._count.episodes} episode
              {podcast._count.episodes !== 1 ? "s" : ""}
            </span>
            <span>
              Updated{" "}
              {formatDistanceToNow(new Date(podcast.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </Card>
    </Link>
  );
}
