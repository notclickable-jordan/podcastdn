"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Activity,
  Download,
  ListVideo,
  RefreshCw,
  FileAudio,
  Upload,
  Image,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Job {
  id: string;
  type: string;
  status: string;
  progress: number;
  message: string | null;
  error: string | null;
  createdAt: string;
  endedAt: string | null;
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-muted-foreground" />,
  processing: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-destructive" />,
};

const typeIcons: Record<string, React.ReactNode> = {
  download_video: <Download className="w-4 h-4" />,
  scan_playlist: <ListVideo className="w-4 h-4" />,
  poll_sources: <RefreshCw className="w-4 h-4" />,
};

const typeLabels: Record<string, string> = {
  download_video: "Download Video",
  scan_playlist: "Scan Playlist",
  poll_sources: "Poll Sources",
};

function getPhaseIcon(message: string | null): React.ReactNode | null {
  if (!message) return null;
  const lower = message.toLowerCase();
  if (lower.includes("metadata") || lower.includes("scanning"))
    return <Search className="w-3 h-3" />;
  if (lower.includes("downloading"))
    return <Download className="w-3 h-3" />;
  if (lower.includes("extracting"))
    return <FileAudio className="w-3 h-3" />;
  if (lower.includes("uploading"))
    return <Upload className="w-3 h-3" />;
  if (lower.includes("thumbnail"))
    return <Image className="w-3 h-3" />;
  return null;
}

function getPhaseColor(progress: number): string {
  if (progress < 6) return "bg-violet-500";
  if (progress < 60) return "bg-blue-500";
  if (progress < 90) return "bg-amber-500";
  return "bg-green-500";
}

export function JobList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch("/api/jobs");
        if (res.ok) setJobs(await res.json());
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  async function clearJobs() {
    setClearing(true);
    try {
      const res = await fetch("/api/jobs", { method: "DELETE" });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.status === "pending" || j.status === "processing"));
      }
    } finally {
      setClearing(false);
    }
  }

  const hasClearableJobs = jobs.some(
    (j) => j.status === "completed" || j.status === "failed"
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center px-4 py-16 border border-dashed rounded-2xl">
        <Activity className="mb-3 w-8 h-8 text-muted-foreground" />
        <h3 className="font-semibold text-lg">No jobs</h3>
        <p className="mt-1 text-muted-foreground text-sm text-center">
          Jobs will appear here when you add content to a podcast.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hasClearableJobs && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={clearJobs}
            disabled={clearing}
          >
            {clearing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Clear completed
          </Button>
        </div>
      )}
      {jobs.map((job) => (
        <div
          key={job.id}
          className="flex items-center gap-3 bg-card p-3 border rounded-xl"
        >
          <div className="flex items-center gap-1.5">
            {typeIcons[job.type] || <Activity className="w-4 h-4" />}
            {statusIcons[job.status] || statusIcons.pending}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {typeLabels[job.type] || job.type}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(job.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
            {job.status === "processing" && (
              <div className="space-y-1 mt-1.5">
                <div className="flex justify-between items-center gap-2">
                  <span className="flex items-center gap-1.5 min-w-0 text-muted-foreground text-xs truncate">
                    {getPhaseIcon(job.message)}
                    {job.message || "Processing…"}
                  </span>
                  <span className="font-medium tabular-nums text-muted-foreground text-xs shrink-0">
                    {job.progress}%
                  </span>
                </div>
                <div className="relative bg-secondary rounded-full w-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${getPhaseColor(job.progress)}`}
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>
            )}
            {job.status === "pending" && (
              <p className="mt-0.5 text-muted-foreground text-xs">
                Waiting in queue…
              </p>
            )}
            {job.status === "completed" && job.message && (
              <p className="mt-0.5 text-muted-foreground text-xs">
                {job.message}
              </p>
            )}
            {job.error && (
              <p className="mt-0.5 text-destructive text-xs truncate">
                {job.error}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
