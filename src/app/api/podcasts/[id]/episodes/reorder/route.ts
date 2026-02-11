import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reorderSchema } from "@/lib/validations";
import { publishRssFeed } from "@/lib/services/rss";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const podcast = await prisma.podcast.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!podcast) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { episodeIds } = reorderSchema.parse(body);

    // Update order for each episode
    await prisma.$transaction(
      episodeIds.map((episodeId, index) =>
        prisma.episode.update({
          where: { id: episodeId },
          data: { order: index },
        })
      )
    );

    // Republish RSS feed to S3
    await publishRssFeed(id).catch(() => {});

    return NextResponse.json({ success: true });
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
