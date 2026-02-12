"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LinkIcon, Upload, Loader2, FileAudio } from "lucide-react";
import { useToast } from "@/components/ui/toast";

const ACCEPTED_EXTENSIONS =
  ".mp3,.m4a,.aac,.ogg,.oga,.opus,.wav,.flac,.wma,.aiff,.aif,.mp4,.mkv,.webm,.avi,.mov,.wmv,.flv,.m4v,.mpg,.mpeg,.3gp,.ogv";

export function AddContentDialog({ podcastId }: { podcastId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<string>("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setUrl("");
    setFile(null);
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
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

      const messages: Record<string, string> = {
        video: "Video queued for download",
        playlist: "Playlist queued for processing",
        url: "URL queued for download",
      };

      toast({
        title: messages[data.type] || "Content queued for processing",
        variant: "success",
      });

      reset();
      setOpen(false);
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

  async function handleFileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/podcasts/${podcastId}/episodes/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload file");
      }

      toast({
        title: "File queued for processing",
        variant: "success",
      });

      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs">
          <Plus className="w-3 h-3" />
          Add Content
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Content</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="url" className="flex-1 gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" />
              Paste URL
            </TabsTrigger>
            <TabsTrigger value="file" className="flex-1 gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              Upload File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  Paste a YouTube video URL, YouTube playlist URL, or a direct
                  link to an audio/video file.
                </p>
                <div className="relative">
                  <LinkIcon className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://…"
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || !url.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding…
                  </>
                ) : (
                  "Add URL"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="file">
            <form onSubmit={handleFileSubmit} className="space-y-4">
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  Upload an audio or video file. It will be converted to MP3 if
                  needed.
                </p>
                <label className="flex flex-col justify-center items-center gap-2 hover:bg-muted/50 p-6 border-2 hover:border-primary/50 border-dashed rounded-xl transition-colors cursor-pointer">
                  {file ? (
                    <>
                      <FileAudio className="w-8 h-8 text-primary" />
                      <span className="font-medium text-sm text-center break-all">
                        {file.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-muted-foreground text-sm">
                        Click to choose a file
                      </span>
                      <span className="text-muted-foreground/70 text-xs">
                        MP3, M4A, WAV, FLAC, MP4, MKV, MOV, and more
                      </span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>
              <Button
                type="submit"
                disabled={loading || !file}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  "Upload File"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
