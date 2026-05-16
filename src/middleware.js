import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isAdminPage = nextUrl.pathname.startsWith("/admin-99x-hsd");

  if (isAdminPage && !session) {
    return NextResponse.redirect(new URL("/api/auth/signin", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin-99x-hsd/:path*"],
};
