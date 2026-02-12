"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function DeletePodcastDialog({
  podcastId,
  podcastTitle,
}: {
  podcastId: string;
  podcastTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/podcasts/${podcastId}?deleteFiles=${deleteFiles}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
      router.push("/podcasts");
    } catch {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive text-xs">
          <Trash2 className="w-3 h-3" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete podcast</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{podcastTitle}</strong>? This
            will permanently remove the podcast and all of its episodes. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 py-2">
          <Switch
            id="delete-files"
            checked={deleteFiles}
            onCheckedChange={setDeleteFiles}
          />
          <Label htmlFor="delete-files" className="text-sm">
            Also delete audio files from S3
          </Label>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting…" : "Delete podcast"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
