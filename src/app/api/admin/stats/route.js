import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.email !== "kakobuybs209@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "24h";

    // Calculate date range
    const now = new Date();
    const rangeMs = {
      "6h": 6 * 60 * 60 * 1000,
      "12h": 12 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "48h": 48 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const from = new Date(now - (rangeMs[range] || rangeMs["24h"]));

    // Total visits
    const { count: totalVisits } = await supabaseAdmin
      .from('stats')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'page_view')
      .gte('timestamp', from.toISOString());

    // Total clicks
    const { count: totalClicks } = await supabaseAdmin
      .from('stats')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'product_click')
      .gte('timestamp', from.toISOString());

    // Unique visitors
    const { data: uniqueData } = await supabaseAdmin
      .from('stats')
      .select('visitor_id')
      .gte('timestamp', from.toISOString())
      .not('visitor_id', 'is', null);

    const uniqueVisitors = new Set(uniqueData?.map(v => v.visitor_id) || []).size;

    // Engagement
    const { data: engagementData } = await supabaseAdmin
      .from('stats')
      .select('time_spent, scroll_depth')
      .eq('type', 'engagement')
      .gte('timestamp', from.toISOString());

    const engagement = {
      avgTimeSpent: engagementData?.length > 0 
        ? engagementData.reduce((sum, e) => sum + (e.time_spent || 0), 0) / engagementData.length 
        : 0,
      avgScrollDepth: engagementData?.length > 0
        ? engagementData.reduce((sum, e) => sum + (e.scroll_depth || 0), 0) / engagementData.length
        : 0
    };

    // Top products - WITHOUT JOIN to avoid errors
    const { data: productClicks } = await supabaseAdmin
      .from('stats')
      .select('product_id')
      .eq('type', 'product_click')
      .not('product_id', 'is', null)
      .gte('timestamp', from.toISOString());

    const productCounts = {};
    productClicks?.forEach(item => {
      productCounts[item.product_id] = (productCounts[item.product_id] || 0) + 1;
    });

    const topProductsSimple = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([productId, count]) => ({
        _id: productId,
        count,
        productInfo: { name: `Product ${productId}`, image: null }
      }));

    // Fetch real product info separately
    const topProducts = await Promise.all(
      topProductsSimple.map(async (item) => {
        try {
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('id, name, image')
            .eq('id', item._id)
            .single();
          
          return {
            ...item,
            productInfo: product || item.productInfo
          };
        } catch (e) {
          return item;
        }
      })
    );

    // Top agents
    const { data: agentsData } = await supabaseAdmin
      .from('stats')
      .select('agent')
      .eq('type', 'product_click')
      .not('agent', 'is', null)
      .gte('timestamp', from.toISOString());

    const agentCounts = {};
    agentsData?.forEach(item => {
      agentCounts[item.agent] = (agentCounts[item.agent] || 0) + 1;
    });

    const topAgents = Object.entries(agentCounts)
      .map(([agent, count]) => ({ _id: agent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top countries
    const { data: countriesData} = await supabaseAdmin
      .from('stats')
      .select('country')
      .not('country', 'is', null)
      .gte('timestamp', from.toISOString());

    const countryCounts = {};
    countriesData?.forEach(item => {
      countryCounts[item.country] = (countryCounts[item.country] || 0) + 1;
    });

    const topCountries = Object.entries(countryCounts)
      .map(([country, count]) => ({ _id: country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent activity - simple version WITHOUT JOIN
    const { data: recentActivity } = await supabaseAdmin
      .from('stats')
      .select('*')
      .neq('type', 'error_log')
      .gte('timestamp', from.toISOString())
      .order('timestamp', { ascending: false })
      .limit(10);

    return NextResponse.json({
      totalVisits: totalVisits || 0,
      uniqueVisitors,
      totalClicks: totalClicks || 0,
      engagement,
      topProducts,
      topAgents,
      topCountries,
      recentActivity: recentActivity || []
    });

  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to fetch stats"
    }, { status: 500 });
  }
}
