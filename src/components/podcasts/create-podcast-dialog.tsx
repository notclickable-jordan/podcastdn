"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, FolderOpen } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function CreatePodcastDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customFolder, setCustomFolder] = useState(false);
  const [folderName, setFolderName] = useState("");

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      setCustomFolder(false);
      setFolderName("");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/podcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description"),
          author: formData.get("author"),
          ...(customFolder && folderName.trim()
            ? { s3FolderName: folderName.trim() }
            : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create podcast");
      }

      toast({ title: "Podcast created", variant: "success" });
      setOpen(false);
      setCustomFolder(false);
      setFolderName("");
      router.refresh();
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to create podcast",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Podcast
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Podcast</DialogTitle>
          <DialogDescription>
            Add a new podcast feed. You can add episodes later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="My Podcast"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                name="author"
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="What's this podcast about?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label
                  htmlFor="custom-folder-toggle"
                  className="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Custom storage folder
                </Label>
                <button
                  id="custom-folder-toggle"
                  type="button"
                  role="switch"
                  aria-checked={customFolder}
                  onClick={() => {
                    setCustomFolder(!customFolder);
                    if (customFolder) setFolderName("");
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    customFolder ? "bg-primary" : "bg-input"
                  }`}
                >
                  <span
                    className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                      customFolder ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {customFolder && (
                <div className="space-y-1.5">
                  <Input
                    id="folderName"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="my-podcast"
                    pattern="^[a-zA-Z0-9][a-zA-Z0-9_-]*$"
                    required={customFolder}
                    autoFocus
                  />
                  <p className="text-muted-foreground text-xs">
                    Letters, numbers, hyphens, and underscores only. Cannot be changed later.
                  </p>
                </div>
              )}
              {!customFolder && (
                <p className="text-muted-foreground text-xs">
                  A folder name will be generated automatically.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
