import cron from "node-cron";
import { processPendingJobs } from "@/lib/services/jobs";

let isProcessing = false;

// Process pending jobs every 30 seconds
cron.schedule("*/30 * * * * *", async () => {
  if (isProcessing) return;
  isProcessing = true;
  try {
    await processPendingJobs();
  } catch (error) {
    console.error("Job processing error:", error);
  } finally {
    isProcessing = false;
  }
});

// Poll sources based on POLLING_INTERVAL_MINUTES
const pollInterval = parseInt(process.env.POLLING_INTERVAL_MINUTES || "60");
cron.schedule(`*/${pollInterval} * * *`, async () => {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.job.create({
      data: { type: "poll_sources" },
    });
  } catch (error) {
    console.error("Poll scheduling error:", error);
  }
});

console.log("Background job scheduler started");
