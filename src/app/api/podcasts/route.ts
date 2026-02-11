import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { podcastSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const podcasts = await prisma.podcast.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { episodes: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(podcasts);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = podcastSchema.parse(body);

    const podcast = await prisma.podcast.create({
      data: {
        ...data,
        userId: session.user.id,
      },
    });

    return NextResponse.json(podcast, { status: 201 });
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
