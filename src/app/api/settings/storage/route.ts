import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    bucketName: process.env.S3_BUCKET_NAME || "",
    region: process.env.AWS_REGION || "",
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN || "",
  });
}
