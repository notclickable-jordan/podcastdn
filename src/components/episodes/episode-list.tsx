"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Music, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatDuration } from "@/lib/utils";

interface Episode {
  id: string;
  title: string;
  description: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  order: number;
}

function SortableEpisode({
  episode,
  onDelete,
}: {
  episode: Episode;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: episode.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isProcessing = !episode.audioUrl;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all duration-200 ${
        isDragging ? "shadow-lg opacity-90 scale-[1.02] z-10" : "hover:bg-accent/50"
      }`}
    >
      <button
        className="touch-none text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden">
        {episode.imageUrl ? (
          <img
            src={episode.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <Music className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {isProcessing && (
            <Loader2 className="inline h-3 w-3 animate-spin mr-1.5" />
          )}
          {episode.title}
        </p>
        {episode.duration && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Clock className="h-3 w-3" />
            {formatDuration(episode.duration)}
          </span>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
        onClick={() => onDelete(episode.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = episodes.findIndex((e) => e.id === active.id);
    const newIndex = episodes.findIndex((e) => e.id === over.id);

    const reordered = arrayMove(episodes, oldIndex, newIndex);
    setEpisodes(reordered);

    try {
      await fetch(`/api/podcasts/${podcastId}/episodes/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeIds: reordered.map((e) => e.id) }),
      });
    } catch {
      toast({ title: "Failed to reorder episodes", variant: "destructive" });
      setEpisodes(initialEpisodes);
    }
  }

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

  if (episodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 px-4">
        <Music className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground text-center">
          No episodes yet. Add a YouTube video or playlist above.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={episodes.map((e) => e.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {episodes.map((episode) => (
            <SortableEpisode
              key={episode.id}
              episode={episode}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
