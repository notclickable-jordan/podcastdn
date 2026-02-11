import cron from "node-cron";
import { processPendingJobs } from "@/lib/services/jobs";

let isProcessing = false;

// Process pending jobs every 30 seconds
cron.schedule("*/30 * * * * *", async () => {
  if (isProcessing) {
    console.log("[cron] Skipping tick — previous job still processing");
    return;
  }
  isProcessing = true;
  try {
    await processPendingJobs();
  } catch (error) {
    console.error("[cron] Job processing error:", error);
  } finally {
    isProcessing = false;
  }
});

console.log("Background job scheduler started");
