export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/podcasts/:path*",
    "/settings/:path*",
    "/jobs/:path*",
    "/api/podcasts/:path*",
    "/api/jobs/:path*",
  ],
};
