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
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");

    // Calculate date range
    const now = new Date();
    let from, to;
    
    if (customFrom && customTo) {
      from = new Date(customFrom);
      to = new Date(customTo);
      to.setHours(23, 59, 59, 999);
    } else {
      const rangeMs = {
        "1h": 1 * 60 * 60 * 1000,
        "6h": 6 * 60 * 60 * 1000,
        "12h": 12 * 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "48h": 48 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
      };
      from = new Date(now - (rangeMs[range] || rangeMs["24h"]));
      to = now;
    }

    // Total visits
    const { count: totalVisits } = await supabaseAdmin
      .from('stats')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'page_view')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    // Total clicks
    const { count: totalClicks } = await supabaseAdmin
      .from('stats')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'product_click')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    // Unique visitors
    const { data: uniqueData } = await supabaseAdmin
      .from('stats')
      .select('visitor_id')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString())
      .not('visitor_id', 'is', null);

    const uniqueVisitors = new Set(uniqueData?.map(v => v.visitor_id) || []).size;

    // Engagement
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

    // Top products - WITHOUT JOIN to avoid errors
    const { data: productClicks } = await supabaseAdmin
      .from('stats')
      .select('product_id')
      .eq('type', 'product_click')
      .not('product_id', 'is', null)
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

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
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

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
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    const countryCounts = {};
    countriesData?.forEach(item => {
      countryCounts[item.country] = (countryCounts[item.country] || 0) + 1;
    });

    const topCountries = Object.entries(countryCounts)
      .map(([country, count]) => ({ _id: country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top countries for product clicks only
    const { data: countriesClicksData} = await supabaseAdmin
      .from('stats')
      .select('country')
      .eq('type', 'product_click')
      .not('country', 'is', null)
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString());

    const countryClicksCounts = {};
    countriesClicksData?.forEach(item => {
      countryClicksCounts[item.country] = (countryClicksCounts[item.country] || 0) + 1;
    });

    const topCountriesClicks = Object.entries(countryClicksCounts)
      .map(([country, count]) => ({ _id: country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent activity - simple version WITHOUT JOIN
    const { data: recentActivity } = await supabaseAdmin
      .from('stats')
      .select('*')
      .neq('type', 'error_log')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString())
      .order('timestamp', { ascending: false })
      .limit(10);

    // Fetch product names for recent activity
    const enrichedActivity = await Promise.all(
      (recentActivity || []).map(async (activity) => {
        if (activity.type === 'product_click' && activity.product_id) {
          try {
            const { data: product } = await supabaseAdmin
              .from('products')
              .select('name')
              .eq('id', activity.product_id)
              .single();
            
            return { ...activity, productName: product?.name || null };
          } catch (e) {
            return activity;
          }
        }
        return activity;
      })
    );

    // Timeline data for charts
    const { data: timelineData, error: timelineError } = await supabaseAdmin
      .from('stats')
      .select('timestamp, type')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString())
      .order('timestamp', { ascending: true });

    console.log('📊 Stats Debug:', {
      range,
      from: from.toISOString(),
      to: to.toISOString(),
      totalVisits,
      totalClicks,
      uniqueVisitors,
      timelineDataCount: timelineData?.length || 0,
      timelineError,
      sampleData: timelineData?.slice(0, 3)
    });

    // Group by hour/day depending on range
    const diffDays = (to - from) / (1000 * 60 * 60 * 24);
    const groupByHour = diffDays <= 2;
    
    const timelineGroups = {};
    timelineData?.forEach(item => {
      const date = new Date(item.timestamp);
      let key;
      
      if (groupByHour) {
        key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:00`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      }
      
      if (!timelineGroups[key]) {
        timelineGroups[key] = { page_view: 0, product_click: 0 };
      }
      
      if (item.type === 'page_view') timelineGroups[key].page_view++;
      if (item.type === 'product_click') timelineGroups[key].product_click++;
    });

    const timeline = Object.entries(timelineGroups)
      .map(([time, counts]) => ({ time, ...counts }))
      .sort((a, b) => a.time.localeCompare(b.time));

    return NextResponse.json({
      totalVisits: totalVisits || 0,
      uniqueVisitors,
      totalClicks: totalClicks || 0,
      engagement,
      topProducts,
      topAgents,
      topCountries,
      topCountriesClicks,
      recentActivity: enrichedActivity,
      timeline,
      dateRange: { from: from.toISOString(), to: to.toISOString() }
    });

  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to fetch stats"
    }, { status: 500 });
  }
}
