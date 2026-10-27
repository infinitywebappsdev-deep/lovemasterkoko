import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Intercept CORS preflight OPTIONS requests for videos and static assets
  if (request.method === "OPTIONS") {
    if (pathname.startsWith("/videos/") || pathname.startsWith("/public/videos/") || pathname.startsWith("/images/") || pathname.startsWith("/api/")) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, POST",
          "Access-Control-Allow-Headers": "Range, Accept-Ranges, Content-Range, Content-Type, Origin, Accept, Authorization",
          "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
          "Access-Control-Max-Age": "86400",
          "Cross-Origin-Resource-Policy": "cross-origin",
          "Accept-Ranges": "bytes",
        },
      });
    }
  }

  const response = NextResponse.next();

  // Ensure CORS and Cross-Origin-Resource-Policy for video assets
  if (pathname.startsWith("/videos/") || pathname.startsWith("/public/videos/")) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Range, Accept-Ranges, Content-Range, Content-Type, Origin, Accept");
    response.headers.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
    response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    response.headers.set("Accept-Ranges", "bytes");
  }

  return response;
}

export const config = {
  matcher: ["/videos/:path*", "/public/videos/:path*", "/images/:path*", "/api/:path*"],
};
