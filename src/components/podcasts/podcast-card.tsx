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
      <Card className="group relative flex items-center gap-4 hover:bg-accent/50 hover:shadow-md p-4 border-l-4 border-l-transparent hover:border-l-primary transition-all duration-200 cursor-pointer">
        <div className="flex justify-center items-center bg-primary/10 rounded-xl w-16 h-16 overflow-hidden shrink-0">
          {podcast.artwork ? (
            <img
              src={podcast.artwork}
              alt={podcast.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <PodcastIcon className="w-7 h-7 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {podcast.title}
          </h3>
          {podcast.description && (
            <p className="mt-0.5 text-muted-foreground text-sm line-clamp-1">
              {podcast.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <Music className="w-3 h-3" />
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
        <ChevronRight className="opacity-0 group-hover:opacity-100 w-4 h-4 text-muted-foreground transition-opacity" />
      </Card>
    </Link>
  );
}
