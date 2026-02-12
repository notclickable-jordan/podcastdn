"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

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

interface EditEpisodeDialogProps {
  episode: Episode;
  podcastId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (episode: Episode) => void;
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditEpisodeDialog({
  episode,
  podcastId,
  open,
  onOpenChange,
  onUpdated,
}: EditEpisodeDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(episode.title);
  const [description, setDescription] = useState(episode.description ?? "");
  const [createdAt, setCreatedAt] = useState(toLocalDatetime(episode.createdAt));

  // Sync state when a different episode is opened
  useEffect(() => {
    if (open) {
      setTitle(episode.title);
      setDescription(episode.description ?? "");
      setCreatedAt(toLocalDatetime(episode.createdAt));
    }
  }, [open, episode]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    try {
      const res = await fetch(
        `/api/podcasts/${podcastId}/episodes/${episode.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            createdAt: new Date(createdAt).toISOString(),
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save episode");
      }

      const updated = await res.json();

      onUpdated({
        ...episode,
        title: updated.title,
        description: updated.description,
        createdAt: updated.createdAt,
      });

      toast({ title: "Episode updated", variant: "success" });
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Failed to save episode",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Episode</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ep-title">Title</Label>
            <Input
              id="ep-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Episode title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ep-description">Description</Label>
            <Textarea
              id="ep-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Episode description"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ep-date">Publication Date</Label>
            <Input
              id="ep-date"
              type="datetime-local"
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
