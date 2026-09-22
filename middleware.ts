import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token }    = req.nextauth;
    const { pathname } = req.nextUrl;

    // Only admins can access user management
    if (pathname.startsWith("/users") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Only admin/staff can access settings
    if (pathname.startsWith("/settings") && token?.role === "client") {
      return NextResponse.redirect(new URL("/invoices", req.url));
    }

    // Client role: restricted to invoices and offers only
    if (token?.role === "client") {
      const allowed = ["/invoices", "/offers"];
      const isAllowed = allowed.some((p) => pathname.startsWith(p));
      if (!isAllowed) {
        return NextResponse.redirect(new URL("/invoices", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    // Protect all routes except: login, api/auth, api/setup, static files, uploads
    "/((?!login|api/auth|api/setup|_next/static|_next/image|favicon\\.ico|uploads).*)",
  ],
};
