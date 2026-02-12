import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addContentSchema } from "@/lib/validations";
import { youtube } from "@/lib/services/youtube";
import { media } from "@/lib/services/media";

export async function POST(
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
    const data = addContentSchema.parse(body);

    // Determine if this is a YouTube URL or a direct media URL
    if (media.isYouTubeUrl(data.url)) {
      const parsed = youtube.parseUrl(data.url);

      if (parsed.type === "video") {
        // Create episode placeholder
        const episode = await prisma.episode.create({
          data: {
            title: `Loading: ${parsed.id}`,
            youtubeId: parsed.id,
            podcastId: id,
          },
        });

        // Create source
        await prisma.source.create({
          data: {
            type: "video",
            youtubeId: parsed.id,
            podcastId: id,
          },
        });

        // Create download job
        const job = await prisma.job.create({
          data: {
            type: "download_video",
            metadata: {
              videoId: parsed.id,
              podcastId: id,
              episodeId: episode.id,
            },
          },
        });

        return NextResponse.json(
          { episode, job, type: "video" },
          { status: 201 }
        );
      } else {
        // Playlist
        await prisma.source.create({
          data: {
            type: "playlist",
            youtubeId: parsed.id,
            podcastId: id,
          },
        });

        // Create scan job
        const job = await prisma.job.create({
          data: {
            type: "scan_playlist",
            metadata: {
              playlistId: parsed.id,
              podcastId: id,
              ...(data.limit != null ? { limit: data.limit } : {}),
              ...(data.skip != null ? { skip: data.skip } : {}),
            },
          },
        });

        return NextResponse.json(
          { job, type: "playlist" },
          { status: 201 }
        );
      }
    } else {
      // Direct URL — download the file directly
      const title = media.titleFromUrl(data.url);

      const episode = await prisma.episode.create({
        data: {
          title: `Downloading: ${title}`,
          sourceUrl: data.url,
          podcastId: id,
        },
      });

      await prisma.source.create({
        data: {
          type: "url",
          sourceUrl: data.url,
          title,
          podcastId: id,
        },
      });

      const job = await prisma.job.create({
        data: {
          type: "download_url",
          metadata: {
            url: data.url,
            podcastId: id,
            episodeId: episode.id,
          },
        },
      });

      return NextResponse.json(
        { episode, job, type: "url" },
        { status: 201 }
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
