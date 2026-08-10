import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        email: session.user.email,
        name: session.user.name,
        image: session.user.image
      }
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ error: "Failed to get user" }, { status: 500 });
  }
}
