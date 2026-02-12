"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkIcon, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function AddContentForm({ podcastId }: { podcastId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/podcasts/${podcastId}/episodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add content");
      }

      const data = await res.json();
      toast({
        title:
          data.type === "playlist"
            ? "Playlist queued for processing"
            : "Video queued for download",
        variant: "success",
      });
      setUrl("");
      router.refresh();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Failed to add content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <LinkIcon className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a video or playlist URL…"
          className="pl-9"
          disabled={loading}
        />
      </div>
      <Button type="submit" disabled={loading || !url.trim()}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Adding…
          </>
        ) : (
          "Add"
        )}
      </Button>
    </form>
  );
}
