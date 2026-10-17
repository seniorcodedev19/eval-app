import { auth } from "@/auth";

const PUBLIC = new Set(["/", "/login", "/signup"]);

export default auth((req) => {
  if (!req.auth && !PUBLIC.has(req.nextUrl.pathname)) {
    return Response.redirect(new URL("/login", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
