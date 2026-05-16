import { auth } from "@/auth";
import { redirect } from "next/navigation";
import styles from "@/styles/Admin.module.css";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Stat from "@/models/Stat";
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
    await dbConnect();
    
    [
      productCount,
      totalVisits,
      totalClicks,
      topProducts,
      topAgents,
      topBrowsers,
      recentActivity
    ] = await Promise.all([
      Product.countDocuments(),
      Stat.countDocuments({ type: 'page_view' }),
      Stat.countDocuments({ type: 'product_click' }),
      Stat.aggregate([
        { $match: { type: 'product_click', productId: { $ne: null, $ne: "" } } },
        { $group: { _id: "$productId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $addFields: {
            convertedId: {
              $cond: {
                if: { $regexMatch: { input: "$_id", regex: /^[0-9a-fA-F]{24}$/ } },
                then: { $toObjectId: "$_id" },
                else: "$_id"
              }
            }
          }
        },
        {
          $lookup: {
            from: "products",
            let: { cid: "$convertedId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$cid"] } } }
            ],
            as: "productInfo"
          }
        },
        { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } }
      ]),
      Stat.aggregate([
        { $match: { type: 'product_click', agent: { $ne: null } } },
        { $group: { _id: "$agent", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      Stat.aggregate([
        { $match: { userAgent: { $ne: null } } },
        { $group: { _id: "$userAgent", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Stat.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .lean()
    ]);

    // Manual population for recentActivity because productId is a string
    const populatedActivity = await Promise.all(recentActivity.map(async (act) => {
      if (act.productId) {
        if (mongoose.Types.ObjectId.isValid(act.productId)) {
          act.productId = await Product.findById(act.productId).select('name image').lean();
        } else {
          // Try to find in local data if it's a string ID (optional, but good for fallback)
          // For now, we'll just keep the ID string if not found
        }
      }
      return act;
    }));
    recentActivity = populatedActivity;
  } catch (err) {
    console.error("Admin dashboard DB error:", err);
  }

  return (
    <div className={styles.adminContainer}>
      <header className={styles.adminHeader}>
        <div>
          <h1>Witaj, {session?.user?.name || 'Admin'} 👋</h1>
          <p>Oto co dzieje się dzisiaj na Twojej stronie.</p>
        </div>
        <div className={styles.adminNav}>
          <Link href="/admin-99x-hsd/products" className={styles.navLink}>Zarządzaj Produktami</Link>
          <form action="/api/auth/signout" method="POST">
             <button type="submit" className={styles.logoutBtn}>Wyloguj</button>
          </form>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Wszystkie Produkty</h3>
          <p className={styles.statValue}>{productCount || 0}</p>
          <span className={styles.statLabel}>Aktywnych w bazie</span>
        </div>

        <div className={styles.statCard}>
          <h3>Wizyty na stronie</h3>
          <p className={styles.statValue}>{totalVisits || 0}</p>
          <span className={styles.statLabel}>Całkowita liczba wejść</span>
        </div>

        <div className={styles.statCard}>
          <h3>Wszystkie Kliknięcia</h3>
          <p className={styles.statValue}>{totalClicks || 0}</p>
          <span className={styles.statLabel}>Zainteresowanie produktami</span>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        {/* Top Products */}
        <div className={styles.recentActivity}>
          <h2>🔥 Top 5 Produktów</h2>
          <div className={styles.activityList}>
            {topProducts?.length > 0 ? topProducts.map((p, i) => (
              <div key={i} className={styles.activityItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {p.productInfo?.image && (
                    <img src={p.productInfo.image} alt="" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                  )}
                  <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.productInfo?.name || 'Nieznany produkt'}
                  </span>
                </div>
                <span className={styles.badge}>{p.count} kliknięć</span>
              </div>
            )) : <p className={styles.noDataText}>Brak danych o kliknięciach.</p>}
          </div>
        </div>

        {/* Top Agents */}
        <div className={styles.recentActivity}>
          <h2>📦 Najczęściej wybierany Agent</h2>
          <div className={styles.activityList}>
            {topAgents?.length > 0 ? topAgents.map((a, i) => (
              <div key={i} className={styles.activityItem}>
                <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{a._id || 'Auto'}</span>
                <span className={styles.badge}>{a.count} razy</span>
              </div>
            )) : <p className={styles.noDataText}>Brak danych o agentach.</p>}
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className={styles.recentActivity} style={{ gridColumn: 'span 2' }}>
          <h2>🕒 Ostatnia Aktywność</h2>
          <div className={styles.activityList}>
            {recentActivity?.length > 0 ? recentActivity.map((act, i) => (
              <div key={i} className={styles.activityItem}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 600, color: '#fff' }}>
                    {act.type === 'page_view' ? '👀 Wizyta na stronie' : '🖱️ Kliknięcie produktu'}
                  </span>
                  <span style={{ fontSize: '11px', opacity: 0.6 }}>
                    {act.path || '/'} • {parseUA(act.userAgent)}
                  </span>
                  {act.productId && (
                    <span style={{ fontSize: '12px', color: '#a78bfa' }}>
                      Produkt: {act.productId.name}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', opacity: 0.5 }}>
                  {new Date(act.timestamp).toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            )) : <p className={styles.noDataText}>Brak ostatniej aktywności.</p>}
          </div>
        </div>

        {/* Top Browsers */}
        <div className={styles.recentActivity} style={{ gridColumn: 'span 2' }}>
          <h2>🌐 Przeglądarki i Systemy</h2>
          <div className={styles.activityList}>
            {topBrowsers?.length > 0 ? topBrowsers.map((b, i) => (
              <div key={i} className={styles.activityItem}>
                <span style={{ fontWeight: 500 }}>
                  {parseUA(b._id)}
                </span>
                <span className={styles.badge}>{b.count} wizyt</span>
              </div>
            )) : <p className={styles.noDataText}>Brak danych o przeglądarkach.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
