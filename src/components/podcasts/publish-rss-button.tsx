"use client";

import { useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublishRssButton({ podcastId }: { podcastId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );

  async function handlePublish() {
    setState("loading");
    try {
      const res = await fetch(`/api/podcasts/${podcastId}/rss/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 text-xs"
      onClick={handlePublish}
      disabled={state === "loading"}
    >
      {state === "done" ? (
        <>
          <Check className="w-3 h-3" />
          Published
        </>
      ) : state === "error" ? (
        <>
          <RefreshCw className="w-3 h-3" />
          Failed
        </>
      ) : (
        <>
          <RefreshCw
            className={`h-3 w-3 ${state === "loading" ? "animate-spin" : ""}`}
          />
          {state === "loading" ? "Publishing…" : "Republish"}
        </>
      )}
    </Button>
  );
}
