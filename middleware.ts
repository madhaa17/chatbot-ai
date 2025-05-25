// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // If the user is authenticated and trying to access auth pages, redirect to chat
    if (req.nextauth.token && pathname.startsWith("/auth/")) {
      return NextResponse.redirect(new URL("/chat", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes that don't require authentication
        if (
          pathname.startsWith("/_next") || // Next.js system routes
          pathname.startsWith("/api/auth") || // NextAuth API routes
          pathname.startsWith("/auth/") || // Auth pages
          pathname === "/" // Landing page
        ) {
          return true;
        }

        // Protected routes - require authentication
        if (pathname.startsWith("/chat") || pathname.startsWith("/dashboard")) {
          return !!token;
        }

        // Default - allow access
        return true;
      },
    },
  }
);

// Configure which routes to protect
export const config = {
  matcher: [
    // Protected routes that require auth
    "/chat/:path*",
    "/dashboard/:path*",
    // Auth routes for redirect handling
    "/auth/:path*",
  ],
};
