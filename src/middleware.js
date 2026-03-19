import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // We only want to broadly protect the /admin routes
  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get("auth_session");
    
    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    try {
      const session = JSON.parse(sessionCookie.value);
      if (session.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch (error) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Ensure other routes are fully public (customer flow)
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
