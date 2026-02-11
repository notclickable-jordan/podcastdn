export async function onRequestError() {
  // Required export for instrumentation
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/cron");
  }
}
