import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req, { params }) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.email !== "kakobuybs209@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { visitorId } = params;
    
    if (!visitorId) {
      return NextResponse.json({ error: "Visitor ID required" }, { status: 400 });
    }

    // Get all user activity
    const { data: activities } = await supabaseAdmin
      .from('stats')
      .select('*')
      .eq('visitor_id', visitorId)
      .order('timestamp', { ascending: false });

    if (!activities || activities.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate stats
    const pageViews = activities.filter(a => a.type === 'page_view').length;
    const productClicks = activities.filter(a => a.type === 'product_click').length;
    const uniqueProducts = new Set(activities.filter(a => a.product_id).map(a => a.product_id));
    
    const firstVisit = activities[activities.length - 1].timestamp;
    const lastVisit = activities[0].timestamp;
    const timeSpent = activities
      .filter(a => a.time_spent)
      .reduce((sum, a) => sum + (a.time_spent || 0), 0);

    // Get product details
    const productIds = Array.from(uniqueProducts);
    const productsWithNames = await Promise.all(
      productIds.map(async (productId) => {
        try {
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('id, name, image, price, category')
            .eq('id', productId)
            .single();

          const clickCount = activities.filter(a => a.product_id === productId).length;
          
          return { 
            ...product,
            clicks: clickCount
          };
        } catch (e) {
          return { id: productId, name: 'Unknown', clicks: 0 };
        }
      })
    );

    // Get most common country and user agent
    const countries = activities.map(a => a.country).filter(Boolean);
    const userAgents = activities.map(a => a.user_agent).filter(Boolean);
    
    const mostCommonCountry = countries.length > 0 
      ? countries.sort((a,b) => 
          countries.filter(v => v === a).length - countries.filter(v => v === b).length
        ).pop()
      : null;

    const mostCommonUserAgent = userAgents.length > 0
      ? userAgents.sort((a,b) =>
          userAgents.filter(v => v === a).length - userAgents.filter(v => v === b).length
        ).pop()
      : null;

    // Parse browser from user agent
    const getBrowser = (ua) => {
      if (!ua) return 'Unknown';
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      return 'Other';
    };

    return NextResponse.json({
      visitorId,
      summary: {
        pageViews,
        productClicks,
        uniqueProducts: uniqueProducts.size,
        timeSpent: Math.round(timeSpent),
        firstVisit,
        lastVisit,
        country: mostCommonCountry,
        browser: getBrowser(mostCommonUserAgent)
      },
      products: productsWithNames.sort((a, b) => b.clicks - a.clicks),
      recentActivity: activities.slice(0, 20)
    });

  } catch (error) {
    console.error("User stats error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to fetch user stats"
    }, { status: 500 });
  }
}
