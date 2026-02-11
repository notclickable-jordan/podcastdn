"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Activity,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  processing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
};

const typeLabels: Record<string, string> = {
  download_video: "Download Video",
  scan_playlist: "Scan Playlist",
  poll_sources: "Poll Sources",
};

export function JobList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

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
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 px-4">
        <Activity className="h-8 w-8 text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold">No jobs</h3>
        <p className="text-sm text-muted-foreground mt-1 text-center">
          Jobs will appear here when you add content to a podcast.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="flex items-center gap-3 rounded-xl border bg-card p-3"
        >
          {statusIcons[job.status] || statusIcons.pending}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {typeLabels[job.type] || job.type}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(job.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
            {job.message && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {job.message}
              </p>
            )}
            {job.error && (
              <p className="text-xs text-destructive mt-0.5 truncate">
                {job.error}
              </p>
            )}
            {job.status === "processing" && (
              <Progress value={job.progress} className="mt-2 h-1.5" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
