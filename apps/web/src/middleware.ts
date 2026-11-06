import { auth } from "@/auth";

const PUBLIC = new Set(["/", "/login", "/signup"]);

export default auth((req) => {
  if (!req.auth && !PUBLIC.has(req.nextUrl.pathname)) {
    return Response.redirect(new URL("/login", req.nextUrl.origin));
  }
});

export const config = {
  // Skip API routes, Next internals, and any request for a static file
  // (anything with a file extension) so public/ assets are served directly.
  matcher: ["/((?!api|_next/static|_next/image|.*\\.[\\w]+$).*)"],
};
