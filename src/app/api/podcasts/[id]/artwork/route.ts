import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/services/s3";
import { publishRssFeed } from "@/lib/services/rss";
import os from "os";
import path from "path";
import fs from "fs/promises";

export async function POST(
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
    const formData = await request.formData();
    const file = formData.get("artwork") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }

    const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
    const tmpPath = path.join(os.tmpdir(), `podcast-artwork-${id}${ext}`);

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(tmpPath, buffer);

      const artworkUrl = await s3.uploadArtwork(tmpPath, existing.s3FolderName || id);

      const podcast = await prisma.podcast.update({
        where: { id },
        data: { artwork: artworkUrl },
      });

      await publishRssFeed(id).catch(() => {});

      return NextResponse.json(podcast);
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
