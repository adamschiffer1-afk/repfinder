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
        minHeight: '100vh',
        padding: '24px',
        background: '#09090b',
        color: '#ededef',
        textAlign: 'center',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '360px',
          padding: '32px 24px',
          background: '#111113',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px',
        }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Brak dostępu</h1>
          <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 24px' }}>
            Musisz się zalogować jako administrator.
          </p>
          <Link href="/api/auth/signin" style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '36px',
            padding: '0 16px',
            background: '#ededef',
            color: '#09090b',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            textDecoration: 'none'
          }}>
            Zaloguj się
          </Link>
        </div>
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
