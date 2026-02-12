"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LinkIcon, Upload, Loader2, FileAudio, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

const ACCEPTED_EXTENSIONS =
  ".mp3,.m4a,.aac,.ogg,.oga,.opus,.wav,.flac,.wma,.aiff,.aif,.mp4,.mkv,.webm,.avi,.mov,.wmv,.flv,.m4v,.mpg,.mpeg,.3gp,.ogv";

function looksLikePlaylist(url: string): boolean {
  try {
    const u = new URL(url);
    return !!u.searchParams.get("list");
  } catch {
    return false;
  }
}

export function AddContentDialog({ podcastId }: { podcastId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<string>("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Playlist limit/skip controls
  const [allVideos, setAllVideos] = useState(true);
  const [limit, setLimit] = useState(5);
  const [skip, setSkip] = useState(0);

  const isPlaylist = looksLikePlaylist(url);

  function reset() {
    setUrl("");
    setFile(null);
    setLoading(false);
    setSuccessMessage(null);
    setAllVideos(true);
    setLimit(5);
    setSkip(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);

    try {
      const body: Record<string, unknown> = { url };
      if (isPlaylist && !allVideos) {
        body.limit = limit;
        body.skip = skip;
      }

      const res = await fetch(`/api/podcasts/${podcastId}/episodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

      setUrl("");
      setLoading(false);
      setSuccessMessage(messages[data.type] || "Content added");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setOpen(false);
      setSuccessMessage(null);
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

      setFile(null);
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSuccessMessage("File queued for processing");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setOpen(false);
      setSuccessMessage(null);
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

        {successMessage ? (
          <div className="flex flex-col justify-center items-center gap-3 py-8">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="font-medium text-sm">{successMessage}</p>
          </div>
        ) : (
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
                    autoFocus
                  />
                </div>
              </div>

              {isPlaylist && (
                <div className="space-y-3 bg-muted/50 p-3 border rounded-lg">
                  <div className="flex justify-between items-center gap-3">
                    <Label
                      htmlFor="all-videos"
                      className="font-medium text-sm cursor-pointer"
                    >
                      Import all videos
                    </Label>
                    <Switch
                      id="all-videos"
                      checked={allVideos}
                      onCheckedChange={setAllVideos}
                      disabled={loading}
                    />
                  </div>

                  {!allVideos && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-3">
                        <Label
                          htmlFor="playlist-skip"
                          className="w-24 min-w-24 text-sm"
                        >
                          Skip first
                        </Label>
                        <Input
                          id="playlist-skip"
                          type="number"
                          min={0}
                          value={skip}
                          onChange={(e) =>
                            setSkip(Math.max(0, parseInt(e.target.value) || 0))
                          }
                          className="w-20"
                          disabled={loading}
                        />
                        <span className="text-muted-foreground text-sm">
                          videos
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Label
                          htmlFor="playlist-limit"
                          className="w-24 min-w-24 text-sm"
                        >
                          Then take
                        </Label>
                        <Input
                          id="playlist-limit"
                          type="number"
                          min={1}
                          value={limit}
                          onChange={(e) =>
                            setLimit(
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="w-20"
                          disabled={loading}
                        />
                        <span className="text-muted-foreground text-sm">
                          videos
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
        )}
      </DialogContent>
    </Dialog>
  );
}
