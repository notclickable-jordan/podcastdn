import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { podcastSchema } from "@/lib/validations";
import { publishRssFeed, deleteRssFeed } from "@/lib/services/rss";

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
      _count: { select: { episodes: true } },
    },
  });

  if (!podcast) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(podcast);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.podcast.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data = podcastSchema.partial().parse(body);

    const podcast = await prisma.podcast.update({
      where: { id },
      data,
    });

    // Republish RSS feed to S3
    await publishRssFeed(id).catch(() => {});

    return NextResponse.json(podcast);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.podcast.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.podcast.delete({ where: { id } });

  // Clean up RSS feed from S3
  await deleteRssFeed(id).catch(() => {});

  return NextResponse.json({ success: true });
}
