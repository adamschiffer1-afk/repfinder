import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const pathname = nextUrl.pathname;
  const isAdminPage = pathname.startsWith("/admin-99x-hsd");

  // Admin section protection
  if (isAdminPage && !session) {
    return NextResponse.redirect(new URL("/api/auth/signin", nextUrl));
  }

  // API Anti-Scraping Protection (tylko dla /api/products i /api/admin)
  if (
    process.env.NODE_ENV === "production" &&
    !pathname.startsWith("/api/auth") &&
    (pathname.startsWith("/api/products") || pathname.startsWith("/api/admin"))
  ) {
    const origin = req.headers.get("origin") || "";
    const referer = req.headers.get("referer") || "";
    const host = req.headers.get("host") || "";
    
    // Lista dozwolonych domen
    const allowedDomains = [
      "localhost:3000", 
      "repfinder.xyz", 
      "www.repfinder.xyz", 
      "repfinder-production.up.railway.app", 
      "ikako.vip", 
      "kakobuy.com",
      "repfinder.vercel.app",
      "repfinder-git-main-repfinds.vercel.app"
    ];
    
    // Sprawdzamy czy żądanie pochodzi z naszej aplikacji
    const isAllowedOrigin = allowedDomains.some(d => origin.includes(d));
    const isAllowedReferer = allowedDomains.some(d => referer.includes(d));
    const isAllowedHost = allowedDomains.some(d => host.includes(d));
    
    // Blokuj tylko jeśli żadne z powyższych się nie zgadza
    // (pozwala na requesty bez origin/referer jeśli host się zgadza - np. bezpośrednie URL)
    if (!isAllowedOrigin && !isAllowedReferer && !isAllowedHost) {
      return new NextResponse(
        JSON.stringify({ error: "Forbidden", message: "API access restricted. Cannot extract data." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin-99x-hsd/:path*", "/api/:path*"],
};
