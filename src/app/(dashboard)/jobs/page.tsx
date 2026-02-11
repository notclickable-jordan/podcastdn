import { JobList } from "@/components/podcasts/job-list";

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track download and processing tasks
        </p>
      </div>
      <JobList />
    </div>
  );
}
