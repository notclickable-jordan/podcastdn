"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Pencil, Upload, Podcast as PodcastIcon } from "lucide-react";

interface EditPodcastFormProps {
  podcast: {
    id: string;
    title: string;
    description: string | null;
    author: string | null;
    artwork: string | null;
  };
}

export function EditPodcastForm({ podcast }: EditPodcastFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(podcast.title);
  const [description, setDescription] = useState(podcast.description || "");
  const [author, setAuthor] = useState(podcast.author || "");
  const [artworkPreview, setArtworkPreview] = useState<string | null>(
    podcast.artwork
  );
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleArtworkChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArtworkFile(file);
    setArtworkPreview(URL.createObjectURL(file));
  }

  function handleCancel() {
    setEditing(false);
    setTitle(podcast.title);
    setDescription(podcast.description || "");
    setAuthor(podcast.author || "");
    setArtworkPreview(podcast.artwork);
    setArtworkFile(null);
  }

  async function handleSave() {
    setLoading(true);

    try {
      // Update title/description
      const res = await fetch(`/api/podcasts/${podcast.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: description || undefined, author: author || undefined }),
      });

      if (!res.ok) throw new Error("Failed to update podcast");

      // Upload artwork if changed
      if (artworkFile) {
        const formData = new FormData();
        formData.append("artwork", artworkFile);

        const artRes = await fetch(`/api/podcasts/${podcast.id}/artwork`, {
          method: "POST",
          body: formData,
        });

        if (!artRes.ok) throw new Error("Failed to upload artwork");
      }

      toast({ title: "Podcast updated", variant: "success" });
      setEditing(false);
      setArtworkFile(null);
      router.refresh();
    } catch {
      toast({ title: "Failed to update podcast", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-muted overflow-hidden">
          {artworkPreview ? (
            <img
              src={artworkPreview}
              alt={podcast.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <PodcastIcon className="h-9 w-9 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {podcast.title}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          {podcast.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2">
              {podcast.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-5">
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-muted overflow-hidden hover:ring-2 hover:ring-ring transition-shadow cursor-pointer"
        >
          {artworkPreview ? (
            <img
              src={artworkPreview}
              alt="Artwork preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleArtworkChange}
          className="hidden"
        />
        <p className="text-[10px] text-muted-foreground text-center">
          Click to upload
        </p>
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-title">Title</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-author">Author</Label>
          <Input
            id="edit-author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={loading || !title.trim()} size="sm">
            {loading ? "Saving…" : "Save"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
