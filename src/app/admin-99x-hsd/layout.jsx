import { auth } from "@/auth";
import Link from "next/link";
import styles from "@/styles/Admin.module.css";

export default async function AdminLayout({ children }) {
  console.log("AdminLayout: Checking session...");
  const session = await auth();
  console.log("AdminLayout: Session found:", !!session);

  // No more redirect - just show a message if not authorized
  if (!session || session.user.email !== "kakobuybs209@gmail.com") {
    console.log("AdminLayout: Unauthorized, showing access denied");
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        background: '#0b0b0d', 
        color: '#fff',
        gap: '20px'
      }}>
        <h1>Brak dostępu 🛑</h1>
        <p>Musisz się zalogować jako administrator.</p>
        <Link href="/api/auth/signin" style={{ 
          background: '#a78bfa', 
          color: '#000', 
          padding: '10px 20px', 
          borderRadius: '8px',
          fontWeight: '700',
          textDecoration: 'none'
        }}>
          Zaloguj się
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.adminWrapper}>
      <nav className={styles.adminSidebar}>
        <div className={styles.logo}>RepFinder Admin</div>
        <Link href="/admin-99x-hsd">🏠 Dashboard</Link>
        <Link href="/admin-99x-hsd/products">📦 Produkty</Link>
        <Link href="/admin-99x-hsd/stats">📈 Statystyki</Link>
        <form action="/api/auth/signout" method="POST" style={{ marginTop: 'auto' }}>
          <button type="submit" className={styles.logoutBtn}>Wyloguj</button>
        </form>
      </nav>
      <main className={styles.adminMainContent}>
        {children}
      </main>
    </div>
  );
}
