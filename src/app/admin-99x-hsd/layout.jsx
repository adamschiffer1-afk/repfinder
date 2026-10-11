import { auth } from "@/auth";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
import styles from "@/styles/Admin.module.css";

export default async function AdminLayout({ children }) {
  const session = await auth();

  if (!session || session.user.email !== "kakobuybs209@gmail.com") {
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
      <AdminSidebar />
      <main className={styles.adminMainContent}>
        {children}
      </main>
    </div>
  );
}
