import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const podcast = await prisma.podcast.findFirst({
    where: { id, userId: session.user.id },
    include: {
      episodes: { orderBy: { order: "asc" } },
      sources: true,
    },
  });

  if (!podcast) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    podcast: {
      id: podcast.id,
      title: podcast.title,
      description: podcast.description,
      author: podcast.author,
      artwork: podcast.artwork,
      language: podcast.language,
      category: podcast.category,
      explicit: podcast.explicit,
    },
    episodes: podcast.episodes.map((ep) => ({
      id: ep.id,
      title: ep.title,
      description: ep.description,
      audioUrl: ep.audioUrl,
      imageUrl: ep.imageUrl,
      duration: ep.duration,
      fileSize: ep.fileSize,
      youtubeId: ep.youtubeId,
      order: ep.order,
    })),
    sources: podcast.sources.map((src) => ({
      id: src.id,
      type: src.type,
      youtubeId: src.youtubeId,
      title: src.title,
      lastChecked: src.lastChecked?.toISOString() ?? null,
    })),
  };

  const filename = `${podcast.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.podcast.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
