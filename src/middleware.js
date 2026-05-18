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

  // API Anti-Scraping Protection
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    const origin = req.headers.get("origin") || "";
    const referer = req.headers.get("referer") || "";
    
    // Lista dozwolonych domen (dodaj tu swoje, jeśli masz więcej)
    const allowedDomains = ["localhost:3000", "repfinder.xyz", "www.repfinder.xyz", "repfinder-production.up.railway.app", "ikako.vip", "kakobuy.com"];
    
    // Sprawdzamy czy żądanie pochodzi z naszej aplikacji webowej
    const isAllowedOrigin = allowedDomains.some(d => origin.includes(d));
    const isAllowedReferer = allowedDomains.some(d => referer.includes(d));
    
    // Jeśli brak origin/referer lub nie pasują do naszych domen, to blokujemy
    // Zapobiega to scrapowaniu API np. przez Postmana, curl, lub inne strony
    if (!isAllowedOrigin && !isAllowedReferer && process.env.NODE_ENV === "production") {
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
