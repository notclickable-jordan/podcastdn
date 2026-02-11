import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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
    include: { sources: { where: { type: "playlist" } } },
  });

  if (!podcast) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const jobs = [];
  for (const source of podcast.sources) {
    const job = await prisma.job.create({
      data: {
        type: "scan_playlist",
        metadata: {
          playlistId: source.youtubeId,
          podcastId: id,
        },
      },
    });
    jobs.push(job);

    await prisma.source.update({
      where: { id: source.id },
      data: { lastChecked: new Date() },
    });
  }

  return NextResponse.json({ jobs, count: jobs.length });
}
