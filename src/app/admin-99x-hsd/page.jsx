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
    
    // Stats tracking will be migrated later - for now just show product count
    totalVisits = 0;
    totalClicks = 0;
    topProducts = [];
    topAgents = [];
    topBrowsers = [];
    recentActivity = [];
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
