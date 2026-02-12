"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Music, Clock, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatDuration } from "@/lib/utils";
import { EditEpisodeDialog } from "@/components/episodes/edit-episode-dialog";

interface Episode {
  id: string;
  title: string;
  description: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  sourceUrl?: string | null;
  createdAt: string;
}

function EpisodeRow({
  episode,
  onDelete,
  onClick,
}: {
  episode: Episode;
  onDelete: (id: string) => void;
  onClick: () => void;
}) {
  const isProcessing = !episode.audioUrl;

  const formattedDate = new Date(episode.createdAt).toLocaleDateString(
    undefined,
    { year: "numeric", month: "short", day: "numeric" }
  );
  const formattedTime = new Date(episode.createdAt).toLocaleTimeString(
    undefined,
    { hour: "numeric", minute: "2-digit" }
  );

  return (
    <div
      className="group flex items-center gap-3 bg-card hover:bg-accent/50 p-3 border rounded-xl transition-all duration-200 cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex justify-center items-center bg-muted rounded-lg w-10 h-10 overflow-hidden shrink-0">
        {episode.imageUrl ? (
          <img
            src={episode.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <Music className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {isProcessing && (
            <Loader2 className="inline mr-1.5 w-3 h-3 animate-spin" />
          )}
          {episode.title}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <Calendar className="w-3 h-3" />
            {formattedDate} {formattedTime}
          </span>
          {episode.duration && (
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <Clock className="w-3 h-3" />
              {formatDuration(episode.duration)}
            </span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 w-8 h-8 text-muted-foreground hover:text-destructive transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(episode.id);
        }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export function EpisodeList({
  episodes: initialEpisodes,
  podcastId,
}: {
  episodes: Episode[];
  podcastId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);

  useEffect(() => {
    setEpisodes(initialEpisodes);
  }, [initialEpisodes]);

  async function handleDelete(episodeId: string) {
    try {
      const res = await fetch(
        `/api/podcasts/${podcastId}/episodes/${episodeId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();

      setEpisodes((prev) => prev.filter((e) => e.id !== episodeId));
      toast({ title: "Episode removed", variant: "success" });
      router.refresh();
    } catch {
      toast({ title: "Failed to delete episode", variant: "destructive" });
    }
  }

  function handleEpisodeUpdated(updated: Episode) {
    setEpisodes((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center px-4 py-12 border border-dashed rounded-2xl">
        <Music className="mb-3 w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground text-sm text-center">
          No episodes yet. Add a video or playlist above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {episodes.map((episode) => (
        <EpisodeRow
          key={episode.id}
          episode={episode}
          onDelete={handleDelete}
          onClick={() => setEditingEpisode(episode)}
        />
      ))}

      {editingEpisode && (
        <EditEpisodeDialog
          episode={editingEpisode}
          podcastId={podcastId}
          open={!!editingEpisode}
          onOpenChange={(open) => {
            if (!open) setEditingEpisode(null);
          }}
          onUpdated={handleEpisodeUpdated}
        />
      )}
    </div>
  );
}
