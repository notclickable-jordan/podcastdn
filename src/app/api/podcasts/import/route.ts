import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const sourceTypeEnum = z.enum(["video", "playlist"]);

const importSchema = z.object({
  version: z.number(),
  podcast: z.object({
    id: z.string().min(1),
    title: z.string().min(1).max(200),
    description: z.string().nullable().optional(),
    author: z.string().nullable().optional(),
    artwork: z.string().nullable().optional(),
    language: z.string().default("en"),
    category: z.string().nullable().optional(),
    explicit: z.boolean().default(false),
  }),
  episodes: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().nullable().optional(),
      audioUrl: z.string().nullable().optional(),
      imageUrl: z.string().nullable().optional(),
      duration: z.number().nullable().optional(),
      fileSize: z.number().nullable().optional(),
      youtubeId: z.string().nullable().optional(),
      order: z.number().default(0),
    })
  ),
  sources: z
    .array(
      z.object({
        id: z.string().min(1),
        type: sourceTypeEnum,
        youtubeId: z.string().min(1),
        title: z.string().nullable().optional(),
        lastChecked: z.string().nullable().optional(),
      })
    )
    .optional()
    .default([]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = importSchema.parse(body);

    // Check if a podcast with this ID already exists for any user
    const existing = await prisma.podcast.findUnique({
      where: { id: data.podcast.id },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `A podcast with this ID already exists. It may have already been imported.`,
        },
        { status: 409 }
      );
    }

    // Create podcast with the original ID so S3 paths remain valid
    const podcast = await prisma.podcast.create({
      data: {
        id: data.podcast.id,
        title: data.podcast.title,
        description: data.podcast.description ?? null,
        author: data.podcast.author ?? null,
        artwork: data.podcast.artwork ?? null,
        language: data.podcast.language,
        category: data.podcast.category ?? null,
        explicit: data.podcast.explicit,
        userId: session.user.id,
        episodes: {
          create: data.episodes.map((ep) => ({
            id: ep.id,
            title: ep.title,
            description: ep.description ?? null,
            audioUrl: ep.audioUrl ?? null,
            imageUrl: ep.imageUrl ?? null,
            duration: ep.duration ?? null,
            fileSize: ep.fileSize ?? null,
            youtubeId: ep.youtubeId ?? null,
            order: ep.order,
          })),
        },
        sources: {
          create: data.sources.map((src) => ({
            id: src.id,
            type: src.type,
            youtubeId: src.youtubeId,
            title: src.title ?? null,
            lastChecked: src.lastChecked ? new Date(src.lastChecked) : null,
          })),
        },
      },
      include: {
        episodes: true,
        sources: true,
      },
    });

    return NextResponse.json(podcast, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid import file format", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
