// middleware.ts
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req: NextRequest) {
    // Performance optimization: add headers for better caching
    const response = NextResponse.next();

    // Add security headers for better performance score
    response.headers.set("X-DNS-Prefetch-Control", "on");
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "origin-when-cross-origin");

    // Performance headers
    if (req.nextUrl.pathname.startsWith("/_next/static/")) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=31536000, immutable"
      );
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Public routes that don't require authentication
        const publicRoutes = ["/auth/signin"];
        const isPublicRoute = publicRoutes.some((route) =>
          req.nextUrl.pathname.startsWith(route)
        );

        if (isPublicRoute) return true;

        // All other routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
