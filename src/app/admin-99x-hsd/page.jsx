import { auth } from "@/auth";
import { redirect } from "next/navigation";
import styles from "@/styles/Admin.module.css";
import { ProductDB, supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { parseUA } from "@/utils/uaParser";

export default async function AdminDashboard() {
  const session = await auth();
  
  if (!session || session.user.email !== "kakobuybs209@gmail.com") {
    redirect("/");
  }

  let productCount = 0, totalVisits = 0, totalClicks = 0;
  let topProducts = [], topAgents = [], topBrowsers = [], recentActivity = [];

  try {
    // Get product count from Supabase
    const { count } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    productCount = count || 0;
    
    // Get total visits (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: visitsCount } = await supabaseAdmin
      .from('stats')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'page_view')
      .gte('timestamp', thirtyDaysAgo.toISOString());
    
    totalVisits = visitsCount || 0;
    
    // Get total clicks (last 30 days)
    const { count: clicksCount } = await supabaseAdmin
      .from('stats')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'product_click')
      .gte('timestamp', thirtyDaysAgo.toISOString());
    
    totalClicks = clicksCount || 0;
    
    // Get top 5 products (last 30 days)
    const { data: productClicks } = await supabaseAdmin
      .from('stats')
      .select('product_id')
      .eq('type', 'product_click')
      .not('product_id', 'is', null)
      .gte('timestamp', thirtyDaysAgo.toISOString());
    
    const productCounts = {};
    productClicks?.forEach(item => {
      productCounts[item.product_id] = (productCounts[item.product_id] || 0) + 1;
    });
    
    const topProductIds = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([productId, count]) => ({ productId, count }));
    
    // Get product details
    for (const item of topProductIds) {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('id, name, image')
        .eq('id', item.productId)
        .single();
      
      if (product) {
        topProducts.push({
          count: item.count,
          productInfo: product
        });
      }
    }
    
    // Get top agents (last 30 days)
    const { data: agentClicks } = await supabaseAdmin
      .from('stats')
      .select('agent')
      .eq('type', 'product_click')
      .not('agent', 'is', null)
      .gte('timestamp', thirtyDaysAgo.toISOString());
    
    const agentCounts = {};
    agentClicks?.forEach(item => {
      agentCounts[item.agent] = (agentCounts[item.agent] || 0) + 1;
    });
    
    topAgents = Object.entries(agentCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([agent, count]) => ({ _id: agent, count }));
    
    // Get recent activity (last 20)
    const { data: recentStats } = await supabaseAdmin
      .from('stats')
      .select('*')
      .in('type', ['page_view', 'product_click'])
      .order('timestamp', { ascending: false })
      .limit(20);
    
    recentActivity = recentStats || [];
    
  } catch (err) {
    console.error("Admin dashboard DB error:", err);
  }

  return (
    <div className={styles.adminContainer}>
      <header className={styles.adminHeader}>
        <div>
          <h1>Witaj, {session?.user?.name || 'Admin'} 👋</h1>
          <p className={styles.headerSubtitle}>Przegląd zarządzania produktami RepFinder</p>
        </div>
        <div className={styles.adminNav}>
          <Link href="/admin-99x-hsd/products" className={styles.navLink}>Zarządzaj Produktami</Link>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📦</div>
          <div className={styles.statContent}>
            <h3>Wszystkie Produkty</h3>
            <p className={styles.statValue}>{productCount || 0}</p>
            <span className={styles.statLabel}>Aktywnych w bazie</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>👁️</div>
          <div className={styles.statContent}>
            <h3>Wizyty na stronie</h3>
            <p className={styles.statValue}>{totalVisits || 0}</p>
            <span className={styles.statLabel}>Całkowita liczba wejść</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>🖱️</div>
          <div className={styles.statContent}>
            <h3>Wszystkie Kliknięcia</h3>
            <p className={styles.statValue}>{totalClicks || 0}</p>
            <span className={styles.statLabel}>Zainteresowanie produktami</span>
          </div>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        {/* Top Products */}
        <div className={styles.dashboardCard}>
          <div className={styles.cardHeader}>
            <h2>🔥 Top 5 Produktów</h2>
          </div>
          <div className={styles.cardContent}>
            {topProducts?.length > 0 ? topProducts.map((p, i) => (
              <div key={i} className={styles.listItem}>
                <div className={styles.itemInfo}>
                  {p.productInfo?.image && (
                    <img src={p.productInfo.image} alt="" className={styles.itemImage} />
                  )}
                  <span className={styles.itemName}>
                    {p.productInfo?.name || 'Nieznany produkt'}
                  </span>
                </div>
                <span className={styles.itemBadge}>{p.count} kliknięć</span>
              </div>
            )) : <p className={styles.emptyText}>Brak danych o kliknięciach.</p>}
          </div>
        </div>

        {/* Top Agents */}
        <div className={styles.dashboardCard}>
          <div className={styles.cardHeader}>
            <h2>📦 Najczęściej wybierany Agent</h2>
          </div>
          <div className={styles.cardContent}>
            {topAgents?.length > 0 ? topAgents.map((a, i) => (
              <div key={i} className={styles.listItem}>
                <span className={styles.itemName} style={{ textTransform: 'capitalize', fontWeight: 600 }}>{a._id || 'Auto'}</span>
                <span className={styles.itemBadge}>{a.count} razy</span>
              </div>
            )) : <p className={styles.emptyText}>Brak danych o agentach.</p>}
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className={styles.dashboardCard} style={{ gridColumn: 'span 2' }}>
          <div className={styles.cardHeader}>
            <h2>🕒 Ostatnia Aktywność</h2>
          </div>
          <div className={styles.cardContent}>
            {recentActivity?.length > 0 ? recentActivity.map((act, i) => (
              <div key={i} className={styles.activityRow}>
                <div>
                  <span className={styles.activityType}>
                    {act.type === 'page_view' ? '👀 Wizyta na stronie' : '🖱️ Kliknięcie produktu'}
                  </span>
                  <div className={styles.activityDetails}>
                    {act.path || '/'} • {parseUA(act.userAgent)}
                  </div>
                  {act.productId && (
                    <div className={styles.activityProduct}>
                      Produkt: {act.productId.name}
                    </div>
                  )}
                </div>
                <span className={styles.activityTime}>
                  {new Date(act.timestamp).toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            )) : <p className={styles.emptyText}>Brak ostatniej aktywności.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
