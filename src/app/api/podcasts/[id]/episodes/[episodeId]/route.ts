import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishRssFeed } from "@/lib/services/rss";
import { episodeSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; episodeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, episodeId } = await params;

  const podcast = await prisma.podcast.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!podcast) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const episode = await prisma.episode.findFirst({
    where: { id: episodeId, podcastId: id },
  });

  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = episodeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const updated = await prisma.episode.update({
    where: { id: episodeId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || null,
      sourceUrl: parsed.data.sourceUrl || null,
      ...(parsed.data.createdAt
        ? { createdAt: new Date(parsed.data.createdAt) }
        : {}),
    },
  });

  // Republish RSS feed to S3
  await publishRssFeed(id).catch(() => {});

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; episodeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, episodeId } = await params;

  const podcast = await prisma.podcast.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!podcast) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const episode = await prisma.episode.findFirst({
    where: { id: episodeId, podcastId: id },
  });

  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  await prisma.episode.delete({ where: { id: episodeId } });

  // Republish RSS feed to S3
  await publishRssFeed(id).catch(() => {});

  return NextResponse.json({ success: true });
}
