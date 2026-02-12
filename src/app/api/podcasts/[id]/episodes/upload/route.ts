import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { media } from "@/lib/services/media";
import path from "path";
import fs from "fs/promises";
import os from "os";

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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type by extension
    if (!media.isValidMediaFile(file.name)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an audio or video file." },
        { status: 400 }
      );
    }

    // Write file to temp directory
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "podcast-upload-"));
    const filePath = path.join(tmpDir, file.name);

    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    // Verify the file is actually a media file by checking with ffprobe
    try {
      const { duration } = await media.getMediaInfo(filePath);
      if (duration === 0) {
        // ffprobe couldn't parse it — might still be valid, log a warning
        console.warn(`[upload] ffprobe returned 0 duration for ${file.name}`);
      }
    } catch {
      // ffprobe failed — file is not valid media
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      return NextResponse.json(
        { error: "File does not appear to be a valid audio or video file." },
        { status: 400 }
      );
    }

    // Get current max order
    const maxOrder = await prisma.episode.findFirst({
      where: { podcastId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (maxOrder?.order ?? -1) + 1;

    // Create episode placeholder
    const title = media.titleFromFilename(file.name);
    const episode = await prisma.episode.create({
      data: {
        title: `Processing: ${title}`,
        order: nextOrder,
        podcastId: id,
      },
    });

    // Create source
    await prisma.source.create({
      data: {
        type: "file",
        title: file.name,
        podcastId: id,
      },
    });

    // Create processing job
    const job = await prisma.job.create({
      data: {
        type: "process_upload",
        metadata: {
          filePath,
          originalFilename: file.name,
          podcastId: id,
          episodeId: episode.id,
        },
      },
    });

    return NextResponse.json(
      { episode, job, type: "upload" },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
