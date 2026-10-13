import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

function getRangeDate(range, customFrom, customTo) {
  const now = new Date();
  if (range === "custom" && customFrom && customTo) {
    return { from: new Date(customFrom), to: new Date(customTo) };
  }
  const map = {
    "6h":  6 * 60 * 60 * 1000,
    "12h": 12 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "48h": 48 * 60 * 60 * 1000,
    "7d":  7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  const ms = map[range] || map["24h"];
  return { from: new Date(now - ms), to: now };
}

function getBucketInterval(range) {
  if (range === "6h")  return { unit: "hour", every: 1 };
  if (range === "12h") return { unit: "hour", every: 2 };
  if (range === "24h") return { unit: "hour", every: 4 };
  if (range === "48h") return { unit: "hour", every: 6 };
  if (range === "7d")  return { unit: "day", every: 1 };
  if (range === "30d") return { unit: "day", every: 1 };
  return { unit: "hour", every: 4 };
}

// Bot filter regex
const botRegex = /bot|spider|crawler|scraper|yandex|baidu|slurp|duckduckgo|sogou|exabot|facebot|ia_archiver|facebookexternalhit|twitterbot|linkedinbot|embedly|redditbot|applebot|whatsapp|flipboard|tumblr|bitlybot|discordbot|lighthouse|telegrambot|screaming|semrush|ahrefs|mj12bot|dotbot|curl|wget|python|urllib|axios|fetch|go-client/i;

function isBot(userAgent) {
  if (!userAgent) return false;
  return botRegex.test(userAgent);
}

export async function GET(req) {
  try {
    const session = await auth();
    if (!session || session.user.email !== "kakobuybs209@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "24h";
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");

    const { from, to } = getRangeDate(range, customFrom, customTo);

    // Base query - filter by date range
    let baseQuery = supabaseAdmin
      .from('stats')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    // --- Get total visits and clicks (exclude bots and errors) ---
    const { count: totalVisits } = await supabaseAdmin
      .from('stats')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'page_view')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    const { count: totalClicks } = await supabaseAdmin
      .from('stats')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'product_click')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    // --- Get all-time totals ---
    const { count: totalVisitsAll } = await supabaseAdmin
      .from('stats')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'page_view');

    const { count: totalClicksAll } = await supabaseAdmin
      .from('stats')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'product_click');

    // --- Unique visitors ---
    const { data: uniqueVisitorsData } = await supabaseAdmin
      .from('stats')
      .select('visitor_id')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString())
      .not('visitor_id', 'is', null);

    const uniqueVisitors = new Set(uniqueVisitorsData?.map(v => v.visitor_id) || []).size;

    // --- Engagement stats ---
    const { data: engagementData } = await supabaseAdmin
      .from('stats')
      .select('time_spent, scroll_depth')
      .eq('type', 'engagement')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    const engagement = {
      avgTimeSpent: engagementData?.length > 0 
        ? engagementData.reduce((sum, e) => sum + (e.time_spent || 0), 0) / engagementData.length 
        : 0,
      avgScrollDepth: engagementData?.length > 0
        ? engagementData.reduce((sum, e) => sum + (e.scroll_depth || 0), 0) / engagementData.length
        : 0
    };

    // --- Top products with product info ---
    const { data: topProductsRaw } = await supabaseAdmin
      .from('stats')
      .select('product_id')
      .eq('type', 'product_click')
      .not('product_id', 'is', null)
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    // Count product clicks manually
    const productCounts = {};
    topProductsRaw?.forEach(item => {
      productCounts[item.product_id] = (productCounts[item.product_id] || 0) + 1;
    });

    // Get top 15 products
    const topProductIds = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15);

    // Fetch product info
    const topProducts = await Promise.all(
      topProductIds.map(async ([productId, count]) => {
        const { data: product } = await supabaseAdmin
          .from('products')
          .select('id, name, image, price, category')
          .eq('id', productId)
          .single();
        
        return {
          _id: productId,
          count,
          productInfo: product || { name: 'Unknown', image: null }
        };
      })
    );

    // --- Top agents ---
    const { data: agentsData } = await supabaseAdmin
      .from('stats')
      .select('agent')
      .eq('type', 'product_click')
      .not('agent', 'is', null)
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    const agentCounts = {};
    agentsData?.forEach(item => {
      agentCounts[item.agent] = (agentCounts[item.agent] || 0) + 1;
    });

    const topAgents = Object.entries(agentCounts)
      .map(([agent, count]) => ({ _id: agent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // --- Top pages ---
    const { data: pagesData } = await supabaseAdmin
      .from('stats')
      .select('path')
      .eq('type', 'page_view')
      .not('path', 'is', null)
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    const pageCounts = {};
    pagesData?.forEach(item => {
      pageCounts[item.path] = (pageCounts[item.path] || 0) + 1;
    });

    const topPages = Object.entries(pageCounts)
      .map(([path, count]) => ({ _id: path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    // --- Top countries ---
    const { data: countriesData } = await supabaseAdmin
      .from('stats')
      .select('country')
      .not('country', 'is', null)
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    const countryCounts = {};
    countriesData?.forEach(item => {
      countryCounts[item.country] = (countryCounts[item.country] || 0) + 1;
    });

    const topCountries = Object.entries(countryCounts)
      .map(([country, count]) => ({ _id: country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // --- Top browsers ---
    const { data: browsersData } = await supabaseAdmin
      .from('stats')
      .select('user_agent')
      .not('user_agent', 'is', null)
      .neq('type', 'error_log')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    const browserCounts = {};
    browsersData?.forEach(item => {
      if (!isBot(item.user_agent)) {
        browserCounts[item.user_agent] = (browserCounts[item.user_agent] || 0) + 1;
      }
    });

    const topBrowsers = Object.entries(browserCounts)
      .map(([ua, count]) => ({ _id: ua, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // --- UTM Sources ---
    const { data: sourcesData } = await supabaseAdmin
      .from('stats')
      .select('utm_source')
      .not('utm_source', 'is', null)
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    const sourceCounts = {};
    sourcesData?.forEach(item => {
      sourceCounts[item.utm_source] = (sourceCounts[item.utm_source] || 0) + 1;
    });

    const topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ _id: source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // --- Referrers ---
    const { data: referrersData } = await supabaseAdmin
      .from('stats')
      .select('referrer')
      .not('referrer', 'is', null)
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    const referrerCounts = {};
    referrersData?.forEach(item => {
      referrerCounts[item.referrer] = (referrerCounts[item.referrer] || 0) + 1;
    });

    const topReferrers = Object.entries(referrerCounts)
      .map(([referrer, count]) => ({ _id: referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // --- Recent activity ---
    const { data: recentActivity } = await supabaseAdmin
      .from('stats')
      .select('*, products(id, name, image)')
      .neq('type', 'error_log')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString())
      .order('timestamp', { ascending: false })
      .limit(40);

    // --- Recent errors ---
    const { data: recentErrors } = await supabaseAdmin
      .from('stats')
      .select('*')
      .eq('type', 'error_log')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString())
      .order('timestamp', { ascending: false })
      .limit(40);

    // --- Timeline (simplified - hourly/daily buckets) ---
    // For now, return empty timeline - we'll implement proper bucketing later
    const timeline = [];

    return NextResponse.json({
      range,
      from: from.toISOString(),
      to: to.toISOString(),
      totalVisits: totalVisits || 0,
      uniqueVisitors,
      engagement,
      topSources,
      topReferrers,
      totalClicks: totalClicks || 0,
      totalVisitsAll: totalVisitsAll || 0,
      totalClicksAll: totalClicksAll || 0,
      topProducts,
      topAgents,
      topBrowsers,
      topPages,
      recentActivity: recentActivity || [],
      topCountries,
      recentErrors: recentErrors || [],
      timeline
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats: " + error.message }, { status: 500 });
  }
}
