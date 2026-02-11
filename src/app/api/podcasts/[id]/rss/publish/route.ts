import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishRssFeed } from "@/lib/services/rss";

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
  });

  if (!podcast) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const url = await publishRssFeed(id);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to publish RSS feed" },
      { status: 500 }
    );
  }
}
