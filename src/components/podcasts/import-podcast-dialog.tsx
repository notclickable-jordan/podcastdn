"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { Upload } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function ImportPodcastDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    title: string;
    episodes: number;
    sources: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setPreview(null);

    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }

    try {
      const text = await selected.text();
      const data = JSON.parse(text);

      if (!data.podcast?.title || !data.podcast?.id) {
        setError("This file doesn't look like a valid podcast export.");
        setFile(null);
        return;
      }

      setFile(selected);
      setPreview({
        title: data.podcast.title,
        episodes: data.episodes?.length ?? 0,
        sources: data.sources?.length ?? 0,
      });
    } catch {
      setError("Could not read the file. Make sure it's a valid JSON file.");
      setFile(null);
    }
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch("/api/podcasts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Import failed");
      }

      toast({ title: "Podcast imported successfully", variant: "success" });
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Import failed";
      setError(message);
      toast({ title: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Podcast</DialogTitle>
          <DialogDescription>
            Import a podcast from a previously exported <code>.podcast.json</code>{" "}
            file. The podcast and its episodes will be added to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.podcast.json"
              onChange={handleFileChange}
              className="block hover:file:bg-accent file:bg-background file:mr-4 file:px-4 file:py-2 file:border file:border-input file:rounded-lg w-full file:font-medium text-muted-foreground text-sm file:text-sm file:transition-colors file:cursor-pointer"
            />
          </div>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          {preview && (
            <div className="space-y-1 bg-muted/50 p-4 border rounded-xl">
              <p className="font-medium text-sm">{preview.title}</p>
              <p className="text-muted-foreground text-xs">
                {preview.episodes} episode{preview.episodes !== 1 ? "s" : ""}
                {preview.sources > 0 && (
                  <> · {preview.sources} source{preview.sources !== 1 ? "s" : ""}</>
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
