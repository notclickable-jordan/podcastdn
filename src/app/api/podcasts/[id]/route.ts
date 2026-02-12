import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { podcastSchema } from "@/lib/validations";
import { publishRssFeed, deleteRssFeed } from "@/lib/services/rss";
import { s3 } from "@/lib/services/s3";

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
      episodes: { orderBy: { createdAt: "desc" } },
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
    const { s3FolderName: _ignored, ...data } = podcastSchema.partial().parse(body);

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

  const url = new URL(request.url);
  const deleteFiles = url.searchParams.get("deleteFiles") !== "false";

  // Delete S3 files for the entire podcast folder if requested
  if (deleteFiles) {
    const folder = existing.s3FolderName || id;
    await s3.deleteFolder(folder).catch(() => {});
    await s3.invalidateCloudFront([`/${folder}/*`]).catch(() => {});
  } else {
    // Still clean up the RSS feed even if not deleting all files
    await deleteRssFeed(id).catch(() => {});
  }

  await prisma.podcast.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
